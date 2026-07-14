import json
import hashlib
from datetime import date, datetime, time, timedelta
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.models import HCP, Interaction, Product, Competitor, Material, FollowUp, AuditLog
from app.schemas import AIAgentOutputSchema
from app.ai.llm import get_llm

# ==========================================
# PYDANTIC SCHEMAS FOR STRUCTURED EXTRACTION
# ==========================================
class EditInteractionInstructions(BaseModel):
    sentiment: Optional[str] = Field(None, description="New sentiment: Positive, Neutral, Negative.")
    interaction_type: Optional[str] = Field(None, description="New interaction type: In-Person, Video, Email, Phone.")
    notes_append: Optional[str] = Field(None, description="Text to append to notes.")
    materials_to_remove: List[str] = Field([], description="Materials to remove, e.g. ['Product Brochure'].")
    materials_to_add: List[str] = Field([], description="Materials to add.")
    products_to_remove: List[str] = Field([], description="Products to remove.")
    products_to_add: List[str] = Field([], description="Products to add.")
    follow_up_date: Optional[str] = Field(None, description="New follow-up date in YYYY-MM-DD format.")
    follow_up_reason: Optional[str] = Field(None, description="New follow-up reason.")

class LogInteractionExtraction(BaseModel):
    doctor_name: Optional[str] = Field(None, description="Name of the doctor/HCP (e.g. 'Dr Shah').")
    hospital_name: Optional[str] = Field(None, description="Name of the hospital (e.g. 'Aparant Hospital').")
    department: Optional[str] = Field(None, description="Department name (e.g. 'Cardiology').")
    interaction_type: Optional[str] = Field("Meeting", description="Interaction type, e.g. Meeting, In-Person, Video, Phone, Email.")
    topics: List[str] = Field([], description="Topics or products discussed, e.g. ['Product X efficacy', 'Cardivas-10'].")
    materials: List[str] = Field([], description="Materials shared, e.g. ['Brochure'].")
    competitors: List[str] = Field([], description="Competitor products or pharma companies mentioned (e.g. ['Competitor Y', 'Novartis']).")
    samples: Optional[int] = Field(0, description="Number of samples distributed (e.g. 3).")
    sentiment: Optional[str] = Field("Neutral", description="Detailing sentiment: Positive, Neutral, Negative.")
    follow_up: Optional[str] = Field(None, description="Follow-up action or deadline, e.g. '2 weeks' or 'next Tuesday'.")
    summary: Optional[str] = Field(None, description="Brief visit summary.")
    enhanced_notes: str = Field(..., description="A detailed, professional, expanded detailing log note based on the user prompt, written in a medical representative detailing style.")

class DoctorResolverSchema(BaseModel):
    doctor_name: str = Field(..., description="Doctor's full name, e.g. 'Dr. Shah'.")
    hospital_name: Optional[str] = Field(None, description="Hospital name, e.g. 'Aparant Hospital'.")
    department: Optional[str] = Field(None, description="Department, e.g. 'Cardiology' or 'Oncology'.")
    email: Optional[str] = Field(None, description="Email address.")
    phone: Optional[str] = Field(None, description="Phone number.")

# =========================================================================
# TOOL 1: Doctor Resolver Tool
# =========================================================================
def doctor_resolver_tool(
    db: Session, 
    doctor_name: str, 
    hospital_name: Optional[str] = None, 
    department: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None
) -> Dict[str, Any]:
    """
    Search doctor by name. Create doctor automatically if missing (Ask NO popup).
    """
    clean_name = doctor_name.strip()
    hcp = db.query(HCP).filter(HCP.name.ilike(f"%{clean_name}%")).first()
    
    created = False
    if not hcp:
        hcp = HCP(
            name=doctor_name,
            specialty=department or "General Medicine",
            hospital=hospital_name or "Community General Hospital",
            email=email or f"{clean_name.lower().replace(' ', '.').replace('dr.', '')}@hospital.com",
            phone=phone or "555-0199",
            department=department or "General Medicine",
            relationship_score=50,
            interest_score=50,
            prescription_likelihood="Medium"
        )
        db.add(hcp)
        db.commit()
        db.refresh(hcp)
        created = True
        
    return {
        "id": str(hcp.id),
        "name": hcp.name,
        "created": created
    }

# =========================================================================
# TOOL 2: Hospital Resolver Tool
# =========================================================================
def hospital_resolver_tool(db: Session, hospital_name: str) -> Dict[str, Any]:
    """
    Search hospital. Create if missing.
    """
    clean_hosp = hospital_name.strip()
    hcp = db.query(HCP).filter(HCP.hospital.ilike(f"%{clean_hosp}%")).first()
    
    created = False
    if not hcp:
        created = True
        
    # Generate stable pseudo-ID from hash
    hosp_id = int(hashlib.md5(clean_hosp.encode()).hexdigest(), 16) % 1000
    
    return {
        "id": str(hosp_id),
        "name": hospital_name,
        "created": created
    }

# =========================================================================
# TOOL 3: Log Interaction Tool
# =========================================================================
def log_interaction_tool(
    db: Session, 
    user_id: str, 
    text: str, 
    hcp_id: Optional[str] = None,
    form_data: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Extract detailing fields, summary, and log into database.
    """
    followup_obj = None
    
    # Case A: Direct form submission
    if form_data:
        interaction_id = form_data.get("id")
        interaction = None
        if interaction_id:
            interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
            
        target_hcp_id = form_data.get("hcp_id")
        target_hcp = db.query(HCP).filter(HCP.id == target_hcp_id).first()
        if not target_hcp:
            return {"error": f"HCP with ID {target_hcp_id} not found"}
            
        meeting_date = form_data.get("meeting_date")
        if isinstance(meeting_date, str):
            meeting_date = datetime.strptime(meeting_date, "%Y-%m-%d").date()
            
        meeting_time = form_data.get("meeting_time")
        if isinstance(meeting_time, str):
            meeting_time = datetime.strptime(meeting_time[:5], "%H:%M").time()
            
        db_products = db.query(Product).filter(Product.id.in_(form_data.get("product_ids") or [])).all()
        db_competitors = db.query(Competitor).filter(Competitor.id.in_(form_data.get("competitor_ids") or [])).all()
        db_materials = db.query(Material).filter(Material.id.in_(form_data.get("material_ids") or [])).all()
        
        if not interaction:
            interaction = Interaction(
                user_id=user_id,
                hcp_id=target_hcp.id,
                interaction_type=form_data.get("interaction_type") or "In-Person",
                meeting_date=meeting_date,
                meeting_time=meeting_time,
                attendees=form_data.get("attendees"),
                topics_discussed=form_data.get("topics_discussed"),
                notes=form_data.get("notes"),
                sentiment=form_data.get("sentiment") or "Neutral",
                summary=form_data.get("summary"),
                samples=str(form_data.get("samples") or "")
            )
            db.add(interaction)
        else:
            interaction.hcp_id = target_hcp.id
            interaction.interaction_type = form_data.get("interaction_type") or "In-Person"
            interaction.meeting_date = meeting_date
            interaction.meeting_time = meeting_time
            interaction.attendees = form_data.get("attendees")
            interaction.topics_discussed = form_data.get("topics_discussed")
            interaction.notes = form_data.get("notes")
            interaction.sentiment = form_data.get("sentiment") or "Neutral"
            interaction.summary = form_data.get("summary")
            interaction.samples = str(form_data.get("samples") or "")
            
        interaction.products = db_products
        interaction.competitors = db_competitors
        interaction.materials = db_materials
        
        db.commit()
        db.refresh(interaction)
        
        follow_up_date = form_data.get("follow_up_date")
        if follow_up_date:
            if isinstance(follow_up_date, str):
                follow_up_date = datetime.strptime(follow_up_date, "%Y-%m-%d").date()
                
            followup_obj = db.query(FollowUp).filter(FollowUp.interaction_id == interaction.id).first()
            if not followup_obj:
                followup_obj = FollowUp(
                    interaction_id=interaction.id,
                    hcp_id=target_hcp.id,
                    title=form_data.get("follow_up_reason") or f"Follow-up with {target_hcp.name}",
                    priority=form_data.get("follow_up_priority") or "Medium",
                    follow_up_date=follow_up_date,
                    reason=form_data.get("follow_up_reason"),
                    status="Pending"
                )
                db.add(followup_obj)
            else:
                followup_obj.follow_up_date = follow_up_date
                followup_obj.priority = form_data.get("follow_up_priority") or "Medium"
                followup_obj.reason = form_data.get("follow_up_reason")
                followup_obj.title = form_data.get("follow_up_reason") or f"Follow-up with {target_hcp.name}"
                
            db.commit()
            db.refresh(followup_obj)
            
        db.add(AuditLog(
            user_id=user_id,
            action_type="UPDATE_INTERACTION" if interaction_id else "CREATE_INTERACTION",
            description=f"Saved interaction for {target_hcp.name}. Sentiment: {interaction.sentiment}."
        ))
        db.commit()
        
        hosp_id = int(hashlib.md5(target_hcp.hospital.encode()).hexdigest(), 16) % 1000
        return {
            "doctor": {
                "id": str(target_hcp.id),
                "name": target_hcp.name,
                "created": False
            },
            "hospital": {
                "id": str(hosp_id),
                "name": target_hcp.hospital,
                "created": False
            },
            "interaction": {
                "interaction_type": interaction.interaction_type,
                "topics": [p.name for p in db_products],
                "materials": [m.name for m in db_materials],
                "competitors": [c.name for c in db_competitors],
                "samples": int(interaction.samples) if (interaction.samples and interaction.samples.isdigit()) else 0,
                "sentiment": interaction.sentiment,
                "follow_up": followup_obj.follow_up_date.isoformat() if followup_obj else None,
                "summary": interaction.summary,
                "notes": interaction.notes
            }
        }

    # Case B: Natural language visit logging
    llm = get_llm()
    structured_llm = llm.with_structured_output(LogInteractionExtraction)
    extracted: LogInteractionExtraction = structured_llm.invoke(text)

    # Use resolved HCP ID or try matching doctor name
    target_hcp = None
    if hcp_id:
        target_hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    
    if not target_hcp and extracted.doctor_name:
        clean_name = extracted.doctor_name.strip()
        target_hcp = db.query(HCP).filter(HCP.name.ilike(f"%{clean_name}%")).first()
        
    if not target_hcp:
        # Auto-create if somehow skipped in resolver node
        target_hcp = HCP(
            name=extracted.doctor_name or "Dr. Shah",
            specialty=extracted.department or "Cardiology",
            hospital=extracted.hospital_name or "Metro Health Center",
            email=f"doctor.{clean_name.lower().replace(' ', '')}@hospital.com" if extracted.doctor_name else "dr.shah@metrohealth.com",
            department=extracted.department or "Cardiology"
        )
        db.add(target_hcp)
        db.commit()
        db.refresh(target_hcp)

    # Resolve Products & Materials
    db_products = []
    for prod_name in extracted.topics:
        prod = db.query(Product).filter(Product.name.ilike(f"%{prod_name.strip()}%")).first()
        if not prod:
            prod = Product(name=prod_name.strip(), therapeutic_area="General", description="AI Discovered")
            db.add(prod)
            db.commit()
            db.refresh(prod)
        db_products.append(prod)

    db_materials = []
    for mat_name in extracted.materials:
        mat = db.query(Material).filter(Material.name.ilike(f"%{mat_name.strip()}%")).first()
        if not mat:
            mat = Material(name=mat_name.strip(), type="Brochure", url="#")
            db.add(mat)
            db.commit()
            db.refresh(mat)
        db_materials.append(mat)

    db_competitors = []
    for comp_name in extracted.competitors:
        comp = db.query(Competitor).filter(Competitor.name.ilike(f"%{comp_name.strip()}%")).first()
        if not comp:
            comp = Competitor(name=comp_name.strip(), market_product="Competitor Drug", details="AI Mentions")
            db.add(comp)
            db.commit()
            db.refresh(comp)
        db_competitors.append(comp)

    # Create new detailing interaction using enhanced notes
    interaction = Interaction(
        user_id=user_id,
        hcp_id=target_hcp.id,
        interaction_type=extracted.interaction_type or "Meeting",
        meeting_date=date.today(),
        meeting_time=datetime.now().time(),
        attendees=target_hcp.name,
        topics_discussed=", ".join(extracted.topics) if extracted.topics else "General detailing",
        notes=extracted.enhanced_notes,
        sentiment=extracted.sentiment or "Neutral",
        summary=extracted.summary or f"Detailing call with {target_hcp.name}",
        samples=str(extracted.samples) if extracted.samples is not None else "0"
    )
    interaction.products = db_products
    interaction.materials = db_materials
    interaction.competitors = db_competitors
    db.add(interaction)
    db.commit()
    db.refresh(interaction)

    # Resolve follow-up dates (e.g. '2 weeks')
    f_date = date.today() + timedelta(days=7)
    if extracted.follow_up:
        lower_fu = extracted.follow_up.lower()
        if "week" in lower_fu:
            if "two" in lower_fu or "2" in lower_fu:
                f_date = date.today() + timedelta(days=14)
            else:
                f_date = date.today() + timedelta(days=7)
        elif "tomorrow" in lower_fu:
            f_date = date.today() + timedelta(days=1)
        elif "day" in lower_fu:
            f_date = date.today() + timedelta(days=7)

        followup_obj = FollowUp(
            interaction_id=interaction.id,
            hcp_id=target_hcp.id,
            title=f"Follow-up: {extracted.follow_up}",
            priority="Medium",
            follow_up_date=f_date,
            reason=extracted.follow_up,
            status="Pending"
        )
        db.add(followup_obj)
        db.commit()
        db.refresh(followup_obj)

    db.add(AuditLog(
        user_id=user_id,
        action_type="CREATE_INTERACTION",
        description=f"AI logged detailing call with {target_hcp.name}."
    ))
    db.commit()

    hosp_id = int(hashlib.md5(target_hcp.hospital.encode()).hexdigest(), 16) % 1000
    return {
        "doctor": {
            "id": str(target_hcp.id),
            "name": target_hcp.name,
            "created": False
        },
        "hospital": {
            "id": str(hosp_id),
            "name": target_hcp.hospital,
            "created": False
        },
        "interaction": {
            "interaction_type": interaction.interaction_type,
            "topics": extracted.topics,
            "materials": extracted.materials,
            "competitors": extracted.competitors,
            "samples": extracted.samples or 0,
            "sentiment": interaction.sentiment,
            "follow_up": extracted.follow_up,
            "summary": interaction.summary,
            "notes": interaction.notes
        }
    }

# =========================================================================
# TOOL 4: Edit Interaction Tool
# =========================================================================
def edit_interaction_tool(db: Session, user_id: str, interaction_id: str, instructions: str) -> Dict[str, Any]:
    """
    Modify existing interaction details.
    """
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        return {"error": "Interaction not found"}

    target_hcp = interaction.hcp

    try:
        llm = get_llm()
        structured_llm = llm.with_structured_output(EditInteractionInstructions)
        
        prompt = f"Analyze the editing instructions for CRM interaction notes:\nInstructions: \"{instructions}\"\nCurrent Notes: \"{interaction.notes}\""
        edits = structured_llm.invoke(prompt)
        
        updates = {}
        if edits.sentiment:
            interaction.sentiment = edits.sentiment
            updates["sentiment"] = edits.sentiment
            
        if edits.interaction_type:
            interaction.interaction_type = edits.interaction_type
            updates["interaction_type"] = edits.interaction_type
            
        if edits.notes_append:
            interaction.notes = f"{interaction.notes}\n[Edit: {edits.notes_append}]"
            updates["notes"] = interaction.notes
            
        if edits.materials_to_remove:
            interaction.materials = [m for m in interaction.materials if m.name not in edits.materials_to_remove]
            updates["materials_removed"] = edits.materials_to_remove
            
        if edits.materials_to_add:
            for mat_name in edits.materials_to_add:
                mat = db.query(Material).filter(Material.name.ilike(f"%{mat_name.strip()}%")).first()
                if mat and mat not in interaction.materials:
                    interaction.materials.append(mat)
            updates["materials_added"] = edits.materials_to_add
            
        if edits.products_to_remove:
            interaction.products = [p for p in interaction.products if p.name not in edits.products_to_remove]
            updates["products_removed"] = edits.products_to_remove
            
        if edits.products_to_add:
            for prod_name in edits.products_to_add:
                prod = db.query(Product).filter(Product.name.ilike(f"%{prod_name.strip()}%")).first()
                if prod and prod not in interaction.products:
                    interaction.products.append(prod)
            updates["products_added"] = edits.products_to_add
            
        if edits.follow_up_date:
            followup = db.query(FollowUp).filter(FollowUp.interaction_id == interaction.id).first()
            f_date = datetime.strptime(edits.follow_up_date, "%Y-%m-%d").date()
            if not followup:
                followup = FollowUp(
                    interaction_id=interaction.id,
                    hcp_id=interaction.hcp_id,
                    title=edits.follow_up_reason or "Follow-up",
                    priority="Medium",
                    follow_up_date=f_date,
                    reason=edits.follow_up_reason or "Update requested",
                    status="Pending"
                )
                db.add(followup)
            else:
                followup.follow_up_date = f_date
                if edits.follow_up_reason:
                    followup.reason = edits.follow_up_reason
            updates["follow_up"] = f"Date set to {edits.follow_up_date}"
            
        db.commit()
        db.refresh(interaction)
        
        # Log action
        db.add(AuditLog(
            user_id=user_id,
            action_type="EDIT_INTERACTION",
            description=f"Edited interaction {interaction.id} via AI. Changes: {updates}"
        ))
        db.commit()
        
    except Exception as e:
        print(f"Error in LLM edit tool: {e}")
        # Rules fallback:
        instructions_lower = instructions.lower()
        updates = {}
        if "sentiment" in instructions_lower:
            if "positive" in instructions_lower:
                interaction.sentiment = "Positive"
                updates["sentiment"] = "Positive"
            elif "negative" in instructions_lower:
                interaction.sentiment = "Negative"
                updates["sentiment"] = "Negative"
            elif "neutral" in instructions_lower:
                interaction.sentiment = "Neutral"
                updates["sentiment"] = "Neutral"

        if "remove brochure" in instructions_lower or "remove materials" in instructions_lower:
            interaction.materials = []
            updates["materials_removed"] = "Removed brochures"
            
        db.commit()
        db.refresh(interaction)

    hosp_id = int(hashlib.md5(target_hcp.hospital.encode()).hexdigest(), 16) % 1000
    followup_obj = db.query(FollowUp).filter(FollowUp.interaction_id == interaction.id).first()

    return {
        "doctor": {
            "id": str(target_hcp.id),
            "name": target_hcp.name,
            "created": False
        },
        "hospital": {
            "id": str(hosp_id),
            "name": target_hcp.hospital,
            "created": False
        },
        "interaction": {
            "interaction_type": interaction.interaction_type,
            "topics": [p.name for p in interaction.products],
            "materials": [m.name for m in interaction.materials],
            "competitors": [c.name for c in interaction.competitors],
            "samples": int(interaction.samples) if (interaction.samples and interaction.samples.isdigit()) else 0,
            "sentiment": interaction.sentiment,
            "follow_up": followup_obj.follow_up_date.isoformat() if followup_obj else None,
            "summary": interaction.summary,
            "notes": interaction.notes
        }
    }

# =========================================================================
# TOOL 5: Meeting Preparation Tool
# =========================================================================
def meeting_preparation_tool(db: Session, hcp_id: str) -> Dict[str, Any]:
    """
    Generate previous visit summary briefing details prior to visiting a doctor.
    """
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp:
        return {"error": "HCP not found"}

    past_interactions = db.query(Interaction).filter(Interaction.hcp_id == hcp_id)\
        .order_by(Interaction.meeting_date.desc(), Interaction.meeting_time.desc()).limit(3).all()

    products_discussed = set()
    materials_shared = set()
    sentiment_history = []

    for intr in past_interactions:
        sentiment_history.append(f"{intr.meeting_date}: {intr.sentiment}")
        for prod in intr.products:
            products_discussed.add(prod.name)
        for mat in intr.materials:
            materials_shared.add(mat.name)

    pending_followups = db.query(FollowUp).filter(FollowUp.hcp_id == hcp_id, FollowUp.status == "Pending").all()
    communication_pref = "Prefers face-to-face in-hospital meetings around 10:00 AM."

    briefing = f"""
### MEETING BRIEFING FOR {hcp.name.upper()}
**Specialty:** {hcp.specialty} | **Hospital:** {hcp.hospital}

#### 1. Last Interactions Summary
{chr(10).join(['- ' + s for s in sentiment_history]) if sentiment_history else 'No past interactions recorded.'}

#### 2. Products Focus
- **Our Products Discussed:** {', '.join(products_discussed) if products_discussed else 'None logged yet'}

#### 3. Communication Preference
- **Preferences:** {communication_pref}

#### 4. Pending Follow-Ups
{chr(10).join([f"- {f.title} due on {f.follow_up_date} (Priority: {f.priority})" for f in pending_followups]) if pending_followups else 'No pending follow-ups.'}
"""

    last_interaction_text = "No past interactions recorded."
    if past_interactions:
        last_interaction_text = f"Date: {past_interactions[0].meeting_date} | Sentiment: {past_interactions[0].sentiment} | Summary: {past_interactions[0].summary}"

    pending_followup_text = "No pending follow-ups."
    if pending_followups:
        pending_followup_text = "; ".join([f"{f.title} due on {f.follow_up_date} ({f.priority})" for f in pending_followups])

    return {
        "hcp_id": hcp_id,
        "briefing_markdown": briefing,
        "details": {
            "doctor_name": hcp.name,
            "last_interaction": last_interaction_text,
            "pending_follow_up": pending_followup_text,
            "products_discussed": list(products_discussed),
            "materials_shared": list(materials_shared),
            "doctor_preferences": communication_pref
        }
    }

# =========================================================================
# TOOL 6: Follow-up Recommendation Tool
# =========================================================================
def suggest_followup_tool(db: Session, hcp_id: str, notes: str) -> Dict[str, Any]:
    """
    Generate recommended follow-up (Reason, Priority, Suggested date).
    """
    notes_lower = notes.lower()
    priority = "Medium"
    if any(w in notes_lower for w in ["urgent", "asap", "immediately", "critical"]):
        priority = "High"

    days_to_add = 7
    if "tomorrow" in notes_lower:
        days_to_add = 1
    elif "2 weeks" in notes_lower or "two weeks" in notes_lower:
        days_to_add = 14

    follow_up_date = date.today() + timedelta(days=days_to_add)
    
    reason = "Schedule next detailing call and deliver clinical reports."
    if "trial" in notes_lower or "evidence" in notes_lower:
        reason = "Share clinical trial survival studies paper."

    return {
        "hcp_id": hcp_id,
        "follow_up_date": follow_up_date.isoformat(),
        "priority": priority,
        "reason": reason
    }

# =========================================================================
# TOOL 7: Compliance Checker Tool
# =========================================================================
def compliance_checker_tool(text: str) -> Dict[str, Any]:
    """
    Analyze interaction logs to detect compliance risks, off-label promotion, and gifts.
    """
    text_lower = text.lower()
    violations = []
    risk_level = "Low"

    gift_words = ["gift", "present", "ticket", "hotel", "money", "cash", "dinner voucher"]
    found_gifts = [w for w in gift_words if w in text_lower]
    if found_gifts:
        violations.append(f"Improper Gift claim: Mentions of material benefits: {', '.join(found_gifts)}.")
        risk_level = "High"

    off_label_words = ["off-label", "unapproved", "alternative indication"]
    found_off_label = [w for w in off_label_words if w in text_lower]
    if found_off_label:
        violations.append(f"Off-label warning: Discussion of unapproved usages: {', '.join(found_off_label)}.")
        risk_level = "Medium"

    warning_msg = None
    if violations:
        warning_msg = f"[COMPLIANCE RISK {risk_level.upper()}] " + " ".join(violations)

    return {
        "compliance_risk_detected": len(violations) > 0,
        "risk_level": risk_level,
        "violations": violations,
        "warning_message": warning_msg
    }

# =========================================================================
# TOOL 8: Interaction Summary Tool
# =========================================================================
def generate_summary_tool(db: Session, doctor_name: Optional[str] = None, hcp_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Generate CRM summary of interactions.
    """
    target_hcp = None
    if hcp_id:
        target_hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    elif doctor_name:
        target_hcp = db.query(HCP).filter(HCP.name.ilike(f"%{doctor_name.strip()}%")).first()
        
    if not target_hcp:
        return {"error": "HCP not found"}
        
    interactions = db.query(Interaction).filter(Interaction.hcp_id == target_hcp.id).order_by(Interaction.meeting_date.desc()).all()
    if not interactions:
        return {
            "hcp_id": str(target_hcp.id),
            "doctor_name": target_hcp.name,
            "summary": f"No visits recorded with {target_hcp.name}."
        }
        
    history = [f"Visit on {i.meeting_date}: {i.summary}" for i in interactions[:3]]
    summary_text = f"Summary of detailing calls: " + " | ".join(history)
    
    return {
        "hcp_id": str(target_hcp.id),
        "doctor_name": target_hcp.name,
        "summary": summary_text
    }

# =========================================================================
# HELPER: HCP Insight Generator (Unexposed / Legacy Endpoint support)
# =========================================================================
def hcp_insight_generator(db: Session, hcp_id: str) -> Dict[str, Any]:
    """
    Generate scores and predictions about an HCP for REST endpoint compatibility.
    """
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp:
        return {"error": "HCP not found"}

    interactions = db.query(Interaction).filter(Interaction.hcp_id == hcp_id).all()
    total_visits = len(interactions)
    relationship_score = hcp.relationship_score
    interest_score = hcp.interest_score

    likelihood = "Medium"
    if relationship_score > 75 and interest_score > 70:
        likelihood = "High"
    elif relationship_score < 45 or interest_score < 40:
        likelihood = "Low"

    return {
        "hcp_id": hcp_id,
        "doctor_name": hcp.name,
        "relationship_score": relationship_score,
        "interest_score": interest_score,
        "prescription_likelihood": likelihood,
        "favorite_products": ["Product X"],
        "common_objections": "Pricing objections",
        "likelihood_to_prescribe": likelihood,
        "frequently_discussed_topics": ["Efficacy"]
    }
