from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models import ChatHistory, User, HCP, Interaction
from app.schemas import ChatInput, ChatResponse, AIAgentOutputSchema
from app.auth import get_current_user
from app.ai.agent import agent_graph
from app.ai.tools import (
    log_interaction_tool,
    edit_interaction_tool,
    meeting_preparation_tool,
    suggest_followup_tool,
    generate_summary_tool,
    compliance_checker_tool
)

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/chat", response_model=ChatResponse)
def run_chat_assistant(
    chat_input: ChatInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch recent chat history
    db_history = db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id)\
                   .order_by(ChatHistory.created_at.desc()).limit(15).all()
    
    messages = []
    for h in reversed(db_history):
        messages.append({"role": h.role, "content": h.content})

    # 2. Invoke LangGraph
    initial_state = {
        "messages": messages,
        "current_input": chat_input.message,
        "hcp_id": chat_input.hcp_id,
        "user_id": current_user.id,
        "context_form_data": chat_input.context_form_data,
        "selected_tool": None,
        "tool_args": None,
        "tool_output": None,
        "extracted_data": None,
        "compliance_warning": None,
        "response": "",
        "memory_context": None
    }

    config = {"configurable": {"db": db}}
    final_state = agent_graph.invoke(initial_state, config=config)

    # 3. Save chat logs
    user_chat = ChatHistory(user_id=current_user.id, role="user", content=chat_input.message)
    assistant_chat = ChatHistory(user_id=current_user.id, role="assistant", content=final_state.get("response", ""))
    
    db.add(user_chat)
    db.add(assistant_chat)
    db.commit()

    return ChatResponse(
        message=final_state.get("response", "Could not understand prompt."),
        extracted_data=final_state.get("extracted_data"),
        tool_triggered=final_state.get("selected_tool"),
        tool_output=final_state.get("tool_output"),
        compliance_warning=final_state.get("compliance_warning")
    )

@router.post("/log")
def log_interaction_endpoint(
    text: str = Query(..., description="Interaction text notes"),
    hcp_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return log_interaction_tool(db, current_user.id, text, hcp_id)

@router.post("/edit")
def edit_interaction_endpoint(
    interaction_id: str = Query(...),
    instructions: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return edit_interaction_tool(db, current_user.id, interaction_id, instructions)

@router.get("/meeting-prep")
def meeting_prep_endpoint(
    hcp_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return meeting_preparation_tool(db, hcp_id)

@router.get("/suggest-followup")
def suggest_followup_endpoint(
    hcp_id: str = Query(...),
    notes: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return suggest_followup_tool(db, hcp_id, notes)

@router.get("/summary")
def summary_endpoint(
    doctor_name: Optional[str] = Query(None),
    hcp_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return generate_summary_tool(db, doctor_name=doctor_name, hcp_id=hcp_id)

@router.get("/next-action")
def next_action_endpoint(
    hcp_id: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch the latest interaction notes for the hcp_id if any, to guide the suggestion
    latest_interaction = db.query(Interaction).filter(Interaction.hcp_id == hcp_id)\
                           .order_by(Interaction.meeting_date.desc(), Interaction.meeting_time.desc()).first()
    
    notes = latest_interaction.notes if latest_interaction else ""
    
    # Generate follow-up suggestions
    followup = suggest_followup_tool(db, hcp_id, notes)
    
    # Map to frontend expected schema keys: 'recommendation' and 'reason'
    rec_text = f"Follow-up scheduled on {followup.get('follow_up_date')} (Priority: {followup.get('priority')})"
    
    return {
        "recommendation": rec_text,
        "reason": followup.get("reason")
    }

