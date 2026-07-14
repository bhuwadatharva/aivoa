import json
from typing import TypedDict, List, Dict, Any, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph, START, END

from app.schemas import AIAgentOutputSchema
from app.ai.llm import get_llm
from app.ai.tools import (
    doctor_resolver_tool,
    hospital_resolver_tool,
    log_interaction_tool,
    edit_interaction_tool,
    meeting_preparation_tool,
    suggest_followup_tool,
    generate_summary_tool,
    compliance_checker_tool,
    DoctorResolverSchema
)

# ==========================================
# INTENT DETECTION SCHEMA
# ==========================================
class IntentDetectionSchema(BaseModel):
    intent: str = Field(description="The detected user intent/tool to execute. Must be one of: 'log_interaction', 'edit_interaction', 'meeting_prep', 'suggest_followup', 'generate_summary', or 'conversational'.")
    doctor_name: Optional[str] = Field(None, description="The name of the doctor/HCP mentioned in the text (e.g. 'Dr. Shah', 'Harrison').")
    instructions: Optional[str] = Field(None, description="Conversational instructions for editing an interaction (e.g. 'Change sentiment to Positive').")
    reasoning: str = Field(description="Brief explanation of why this intent was selected.")

# ==========================================
# AGENT STATE DEFINITION
# ==========================================
class AgentState(TypedDict):
    messages: List[Dict[str, Any]]         # Chat history
    current_input: str                     # New user message
    hcp_id: Optional[str]                  # Context HCP ID if present
    user_id: str                           # User logging the action
    context_form_data: Optional[Dict[str, Any]] # Form data from frontend
    selected_tool: Optional[str]           # Resolved intent
    tool_args: Optional[Dict[str, Any]]    # Extracted arguments
    tool_output: Optional[Dict[str, Any]]  # Execution output
    extracted_data: Optional[Dict[str, Any]] # Form population state (AIAgentOutputSchema format)
    compliance_warning: Optional[str]      # Risk warning message
    response: str                          # Conversational reply
    memory_context: Optional[Dict[str, Any]] # Conversation memory/HCP profile
    doctor: Optional[Dict[str, Any]]       # Resolved doctor info
    hospital: Optional[Dict[str, Any]]     # Resolved hospital info

# ==========================================
# NODE 1: Conversation Memory Node
# ==========================================
def memory_node(state: AgentState, db: Session) -> Dict[str, Any]:
    """
    START ➔ Conversation Memory: Load previous states
    """
    hcp_id = state.get("hcp_id")
    form_data = state.get("context_form_data")
    if form_data and form_data.get("hcp_id") and not hcp_id:
        hcp_id = form_data["hcp_id"]

    memory_context = {}
    if hcp_id:
        from app.models import HCP
        hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
        if hcp:
            memory_context["hcp_name"] = hcp.name
            memory_context["hcp_hospital"] = hcp.hospital

    return {
        "hcp_id": hcp_id,
        "memory_context": memory_context
    }

# ==========================================
# NODE 2: Intent Detection Node
# ==========================================
def detect_intent_node(state: AgentState) -> Dict[str, Any]:
    """
    Memory ➔ Intent Detection: Classifies intent and pre-extracts resolver parameters
    """
    text = state["current_input"]
    hcp_id = state.get("hcp_id")
    selected_tool = state.get("selected_tool")
    tool_args = state.get("tool_args") or {}

    # Case A: Pre-selected tool (e.g. direct form submit)
    if selected_tool == "log_interaction" and "form_data" in tool_args:
        return {
            "selected_tool": "log_interaction",
            "tool_args": tool_args
        }

    text_lower = text.lower()
    
    # Intercept 'save' commands to write the draft form data directly
    if any(w in text_lower for w in ["save it", "save this", "commit", "save visit"]):
        return {
            "selected_tool": "log_interaction",
            "tool_args": {
                "form_data": state.get("context_form_data"),
                "text": text
            }
        }
        
    selected_tool = "conversational"

    # LLM-based intent detection
    try:
        llm = get_llm()
        structured_llm = llm.with_structured_output(IntentDetectionSchema)
        prompt = f"Analyze the following user input in a CRM context and classify the intent:\nInput: \"{text}\"\nActive HCP Context ID: {hcp_id}"
        classification = structured_llm.invoke(prompt)
        selected_tool = classification.intent
        
        tool_args = {
            "doctor_name": classification.doctor_name,
            "instructions": classification.instructions
        }
    except Exception as e:
        print(f"Error in LLM intent detection: {e}")
        # Rule-based fallback
        if any(w in text_lower for w in ["prepare", "prep", "briefing"]):
            selected_tool = "meeting_prep"
        elif any(w in text_lower for w in ["summary", "summarize"]):
            selected_tool = "generate_summary"
        elif any(w in text_lower for w in ["follow", "suggest follow"]):
            selected_tool = "suggest_followup"
        elif any(w in text_lower for w in ["edit", "change sentiment", "remove", "update"]):
            selected_tool = "edit_interaction"
        elif any(w in text_lower for w in ["met", "visited", "discussed", "had a meeting", "spoke"]):
            selected_tool = "log_interaction"

    # Pre-extract doctor lookup details if intent involves doctor visits
    if selected_tool in ["log_interaction", "meeting_prep", "generate_summary", "suggest_followup"]:
        try:
            llm = get_llm()
            structured_resolver = llm.with_structured_output(DoctorResolverSchema)
            prompt = f"Extract the doctor and hospital details from this visit notes text:\nText: \"{text}\""
            resolver_data = structured_resolver.invoke(prompt)
            if resolver_data:
                tool_args["doctor_name"] = resolver_data.doctor_name
                tool_args["hospital_name"] = resolver_data.hospital_name
                tool_args["department"] = resolver_data.department
                tool_args["email"] = resolver_data.email
                tool_args["phone"] = resolver_data.phone
        except Exception as e:
            print(f"Error in resolver data extraction: {e}")

    return {
        "selected_tool": selected_tool,
        "tool_args": tool_args
    }

# ==========================================
# NODE 3: Doctor Resolver Node
# ==========================================
def doctor_resolver_node(state: AgentState, db: Session) -> Dict[str, Any]:
    """
    Intent Detection ➔ Doctor Resolver: Search or auto-create doctor
    """
    tool_args = state.get("tool_args") or {}
    hcp_id = state.get("hcp_id")
    doctor_name = tool_args.get("doctor_name")
    
    doctor_info = None

    if hcp_id:
        from app.models import HCP
        hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
        if hcp:
            doctor_info = {
                "id": str(hcp.id),
                "name": hcp.name,
                "created": False
            }

    # If hcp_id is missing, look up or create automatically by name
    if not doctor_info and doctor_name:
        res = doctor_resolver_tool(
            db=db,
            doctor_name=doctor_name,
            hospital_name=tool_args.get("hospital_name"),
            department=tool_args.get("department"),
            email=tool_args.get("email"),
            phone=tool_args.get("phone")
        )
        hcp_id = res["id"]
        doctor_info = res

    # absolute fallback
    if not doctor_info:
        from app.models import HCP
        hcp = db.query(HCP).first()
        if hcp:
            hcp_id = str(hcp.id)
            doctor_info = {
                "id": str(hcp.id),
                "name": hcp.name,
                "created": False
            }

    return {
        "hcp_id": hcp_id,
        "doctor": doctor_info
    }

# ==========================================
# NODE 4: Hospital Resolver Node
# ==========================================
def hospital_resolver_node(state: AgentState, db: Session) -> Dict[str, Any]:
    """
    Doctor Resolver ➔ Hospital Resolver: Search or auto-create hospital
    """
    tool_args = state.get("tool_args") or {}
    hospital_name = tool_args.get("hospital_name")
    hcp_id = state.get("hcp_id")
    
    hospital_info = None

    if hospital_name:
        hospital_info = hospital_resolver_tool(db, hospital_name=hospital_name)
    elif hcp_id:
        from app.models import HCP
        hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
        if hcp and hcp.hospital:
            hospital_info = hospital_resolver_tool(db, hospital_name=hcp.hospital)

    # fallback
    if not hospital_info:
        hospital_info = {
            "id": "1",
            "name": "Community General Hospital",
            "created": False
        }

    return {
        "hospital": hospital_info
    }

# ==========================================
# NODE 5: Tool Selection Node
# ==========================================
def tool_selection_node(state: AgentState) -> Dict[str, Any]:
    """
    Hospital Resolver ➔ Tool Selection
    """
    return {}

# ==========================================
# NODE 6: Database (Tool Execution) Node
# ==========================================
def execute_tool_node(state: AgentState, db: Session) -> Dict[str, Any]:
    """
    Tool Selection ➔ Database: Execute DB updates & detailing operations
    """
    tool_name = state.get("selected_tool")
    args = state.get("tool_args") or {}
    user_id = state.get("user_id")
    hcp_id = state.get("hcp_id")
    
    tool_output = None
    extracted_data = None

    if tool_name == "log_interaction":
        tool_output = log_interaction_tool(
            db=db,
            user_id=user_id,
            text=args.get("text", state["current_input"]),
            hcp_id=hcp_id,
            form_data=args.get("form_data")
        )
        # Update doctor/hospital created flag in final JSON from state
        if tool_output and not isinstance(tool_output, str) and "error" not in tool_output:
            if state.get("doctor"):
                tool_output["doctor"]["created"] = state["doctor"]["created"]
            if state.get("hospital"):
                tool_output["hospital"]["created"] = state["hospital"]["created"]
            extracted_data = tool_output

    elif tool_name == "edit_interaction":
        intr_id = args.get("interaction_id")
        if not intr_id and state.get("context_form_data"):
            intr_id = state["context_form_data"].get("id")
            
        if not intr_id:
            from app.models import Interaction
            latest = db.query(Interaction).filter(Interaction.user_id == user_id).order_by(Interaction.created_at.desc()).first()
            intr_id = str(latest.id) if latest else None
            
        if intr_id:
            tool_output = edit_interaction_tool(
                db=db,
                user_id=user_id,
                interaction_id=intr_id,
                instructions=args.get("instructions", state["current_input"])
            )
            if tool_output and "error" not in tool_output:
                extracted_data = tool_output
        else:
            tool_output = {"error": "No recent interaction found to edit."}

    elif tool_name == "meeting_prep":
        if hcp_id:
            tool_output = meeting_preparation_tool(db=db, hcp_id=hcp_id)
        else:
            tool_output = {"error": "HCP context missing."}

    elif tool_name == "suggest_followup":
        if hcp_id:
            tool_output = suggest_followup_tool(
                db=db,
                hcp_id=hcp_id,
                notes=args.get("notes", state["current_input"])
            )
        else:
            tool_output = {"error": "HCP context missing."}

    elif tool_name == "generate_summary":
        doctor_name = args.get("doctor_name")
        tool_output = generate_summary_tool(
            db=db,
            doctor_name=doctor_name,
            hcp_id=hcp_id
        )

    return {
        "tool_output": tool_output,
        "extracted_data": extracted_data
    }

# ==========================================
# NODE 7: Structured Output Node (Validation & Response)
# ==========================================
def respond_node(state: AgentState) -> Dict[str, Any]:
    """
    Database ➔ Structured Output: Formats output payload as JSON + description
    """
    tool_name = state.get("selected_tool")
    tool_out = state.get("tool_output") or {}
    extracted_data = state.get("extracted_data")
    mem_ctx = state.get("memory_context") or {}
    hcp_name = mem_ctx.get("hcp_name", "the doctor")

    # Generate description reply
    conversational_text = ""
    if tool_name == "log_interaction":
        if "error" in tool_out:
            conversational_text = f"Visit logging failed: {tool_out['error']}"
        else:
            conversational_text = f"Successfully logged detailing visit with {hcp_name}! The interaction form fields are populated automatically."
    elif tool_name == "edit_interaction":
        if "error" in tool_out:
            conversational_text = f"Edit failed: {tool_out['error']}"
        else:
            conversational_text = f"Successfully updated detailing log details for {hcp_name} in database. Form sync complete."
    elif tool_name == "meeting_prep":
        conversational_text = tool_out.get("briefing_markdown", "No briefing details found.")
    elif tool_name == "suggest_followup":
        f_date = tool_out.get("follow_up_date", "")
        priority = tool_out.get("priority", "Medium")
        reason = tool_out.get("reason", "")
        conversational_text = f"📅 **Follow-up Recommendation:**\n- **Date:** {f_date}\n- **Priority:** {priority}\n- **Reason:** {reason}"
    elif tool_name == "generate_summary":
        conversational_text = tool_out.get("summary", "No interactions logged.")
    else:
        conversational_text = "I am the Aivoa AI CRM Graph. I run detailing and intent tracking on medical interactions."

    # Build the final response object. Every response must first produce structured JSON
    final_json = {}
    if extracted_data:
        final_json = extracted_data
    else:
        # Construct output JSON for other intents
        final_json = {
            "doctor": state.get("doctor") or {
                "id": state.get("hcp_id"),
                "name": hcp_name,
                "created": False
            },
            "hospital": state.get("hospital") or {
                "id": "1",
                "name": mem_ctx.get("hcp_hospital") or "Community General Hospital",
                "created": False
            },
            "interaction": {
                "interaction_type": "Meeting",
                "topics": [],
                "materials": [],
                "samples": 0,
                "sentiment": "Neutral",
                "follow_up": None,
                "summary": conversational_text
            }
        }

    structured_json_block = f"```json\n{json.dumps(final_json, indent=4)}\n```"
    final_response = f"{structured_json_block}\n\n{conversational_text}"

    # Verify compliance
    text = state["current_input"]
    compliance_res = compliance_checker_tool(text)
    if compliance_res.get("compliance_risk_detected"):
        final_response = f"⚠️ **[COMPLIANCE WARNING]** {compliance_res.get('warning_message')}\n\n" + final_response

    return {
        "response": final_response,
        "extracted_data": final_json
    }

# ==========================================
# GRAPH ASSEMBLY
# ==========================================
def build_agent_graph() -> StateGraph:
    workflow = StateGraph(AgentState)
    
    # 1. Add nodes
    def memory_wrapper(state: AgentState, config: Dict[str, Any]) -> Dict[str, Any]:
        db = config.get("configurable", {}).get("db")
        return memory_node(state, db)
    workflow.add_node("memory", memory_wrapper)
    
    workflow.add_node("detect_intent", detect_intent_node)
    
    def doctor_resolver_wrapper(state: AgentState, config: Dict[str, Any]) -> Dict[str, Any]:
        db = config.get("configurable", {}).get("db")
        return doctor_resolver_node(state, db)
    workflow.add_node("doctor_resolver", doctor_resolver_wrapper)
    
    def hospital_resolver_wrapper(state: AgentState, config: Dict[str, Any]) -> Dict[str, Any]:
        db = config.get("configurable", {}).get("db")
        return hospital_resolver_node(state, db)
    workflow.add_node("hospital_resolver", hospital_resolver_wrapper)
    
    workflow.add_node("tool_selection", tool_selection_node)
    
    def execute_tool_wrapper(state: AgentState, config: Dict[str, Any]) -> Dict[str, Any]:
        db = config.get("configurable", {}).get("db")
        return execute_tool_node(state, db)
    workflow.add_node("execute_tool", execute_tool_wrapper)
    
    workflow.add_node("respond", respond_node)
    
    # 2. Edges
    workflow.add_edge(START, "memory")
    workflow.add_edge("memory", "detect_intent")
    workflow.add_edge("detect_intent", "doctor_resolver")
    workflow.add_edge("doctor_resolver", "hospital_resolver")
    workflow.add_edge("hospital_resolver", "tool_selection")
    
    # Router
    def router(state: AgentState) -> str:
        if state.get("selected_tool") and state["selected_tool"] != "conversational":
            return "execute_tool"
        return "respond"
        
    workflow.add_conditional_edges(
        "tool_selection",
        router,
        {
            "execute_tool": "execute_tool",
            "respond": "respond"
        }
    )
    
    workflow.add_edge("execute_tool", "respond")
    workflow.add_edge("respond", END)
    
    return workflow.compile()

agent_graph = build_agent_graph()
