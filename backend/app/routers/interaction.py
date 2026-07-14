import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Interaction, HCP, Product, Competitor, Material, AuditLog, User
from app.schemas import InteractionCreate, InteractionResponse
from app.auth import get_current_user
from app.ai.agent import agent_graph

router = APIRouter(prefix="/api/interactions", tags=["interactions"])

@router.get("", response_model=List[InteractionResponse])
def get_interactions(
    hcp_id: Optional[str] = Query(None, description="Filter by HCP ID"),
    sentiment: Optional[str] = Query(None, description="Filter by sentiment"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Interaction)
    
    if hcp_id:
        query = query.filter(Interaction.hcp_id == hcp_id)
    if sentiment:
        query = query.filter(Interaction.sentiment == sentiment)
        
    return query.order_by(Interaction.meeting_date.desc(), Interaction.meeting_time.desc())\
                .offset(skip).limit(limit).all()

@router.get("/export")
def export_interactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interactions = db.query(Interaction).order_by(Interaction.meeting_date.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Interaction ID", "HCP Name", "Hospital", "Specialty", 
        "Meeting Date", "Meeting Time", "Type", "Attendees", 
        "Products Discussed", "Competitors Mentioned", "Materials Shared",
        "Sentiment", "Summary", "Notes"
    ])
    
    for intr in interactions:
        hcp_name = intr.hcp.name if intr.hcp else "N/A"
        hcp_hosp = intr.hcp.hospital if intr.hcp else "N/A"
        hcp_spec = intr.hcp.specialty if intr.hcp else "N/A"
        
        products = ", ".join([p.name for p in intr.products])
        competitors = ", ".join([c.name for c in intr.competitors])
        materials = ", ".join([m.name for m in intr.materials])
        
        writer.writerow([
            intr.id, hcp_name, hcp_hosp, hcp_spec,
            intr.meeting_date.isoformat() if intr.meeting_date else "",
            intr.meeting_time.isoformat() if intr.meeting_time else "",
            intr.interaction_type, intr.attendees or "",
            products, competitors, materials,
            intr.sentiment, intr.summary or "", intr.notes or ""
        ])
        
    output.seek(0)
    response = StreamingResponse(iter([output.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=aivoa_interactions_export.csv"
    return response

@router.get("/metadata")
def get_metadata(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    products = db.query(Product).order_by(Product.name.asc()).all()
    competitors = db.query(Competitor).order_by(Competitor.name.asc()).all()
    materials = db.query(Material).order_by(Material.name.asc()).all()
    return {
        "products": [{"id": p.id, "name": p.name} for p in products],
        "competitors": [{"id": c.id, "name": c.name} for c in competitors],
        "materials": [{"id": m.id, "name": m.name} for m in materials]
    }

@router.post("", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
def create_interaction(
    intr_in: InteractionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Route through the LangGraph Agent for unified creation and validation
    initial_state = {
        "messages": [],
        "current_input": "Save form interaction",
        "hcp_id": str(intr_in.hcp_id) if intr_in.hcp_id else None,
        "user_id": str(current_user.id),
        "selected_tool": "log_interaction",
        "tool_args": {
            "form_data": intr_in.model_dump()
        },
        "tool_output": None,
        "extracted_data": None,
        "compliance_warning": None,
        "response": ""
    }
    
    config = {"configurable": {"db": db}}
    final_state = agent_graph.invoke(initial_state, config=config)
    
    # Extract the logged interaction
    tool_out = final_state.get("tool_output") or {}
    interaction_id = tool_out.get("interaction_id")
    if not interaction_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=final_state.get("response") or "Failed to log interaction through LangGraph agent."
        )
        
    interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
    if not interaction:
        raise HTTPException(status_code=404, detail="Logged interaction could not be found.")
        
    return interaction

@router.get("/{intr_id}", response_model=InteractionResponse)
def get_interaction(
    intr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    intr = db.query(Interaction).filter(Interaction.id == intr_id).first()
    if not intr:
        raise HTTPException(status_code=404, detail="Interaction not found")
    return intr

@router.delete("/{intr_id}")
def delete_interaction(
    intr_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    intr = db.query(Interaction).filter(Interaction.id == intr_id).first()
    if not intr:
        raise HTTPException(status_code=404, detail="Interaction not found")
        
    db.delete(intr)
    db.commit()
    
    # Audit log
    db.add(AuditLog(
        user_id=current_user.id,
        action_type="DELETE_INTERACTION",
        description=f"Deleted interaction {intr_id}."
    ))
    db.commit()
    
    return {"message": "Interaction successfully deleted"}
