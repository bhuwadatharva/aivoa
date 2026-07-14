import sys
import os

# Append current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.seed import seed_database
from app.models import User, HCP, Interaction
from app.ai.agent import agent_graph

def run_test():
    print("=== STARTING BACKEND INTEGRATION TEST ===")
    
    # 1. Initialize SQLite Database for test
    print("1. Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed database
    print("2. Seeding test records...")
    db = SessionLocal()
    try:
        seed_database(db)
    except Exception as e:
        print(f"Database might already be seeded: {e}")
    
    # 3. Retrieve default user
    rep_user = db.query(User).filter(User.email == "rep@aivoa.com").first()
    if not rep_user:
        print("FAIL: Default user rep@aivoa.com not found!")
        db.close()
        return
    print(f"SUCCESS: Found representative user {rep_user.full_name}")

    # 4. Retrieve Dr. Shah
    hcp_shah = db.query(HCP).filter(HCP.name == "Dr. Shah").first()
    if not hcp_shah:
        print("FAIL: Dr. Shah not seeded!")
        db.close()
        return
    print(f"SUCCESS: Found HCP {hcp_shah.name} (specialty: {hcp_shah.specialty})")

    # 5. Run conversational AI agent test
    print("3. Testing LangGraph Agent with Natural Language Log Input...")
    
    # Example input
    test_note = "Met Dr. Shah today. Discussed Cardivas-10, he was very interested and positive. Shared the clinical paper. Call him back in 2 weeks."
    
    initial_state = {
        "messages": [],
        "current_input": test_note,
        "hcp_id": hcp_shah.id,
        "user_id": rep_user.id,
        "selected_tool": None,
        "tool_args": None,
        "tool_output": None,
        "extracted_data": None,
        "compliance_warning": None,
        "response": ""
    }
    
    config = {"configurable": {"db": db}}
    
    print(f"Input Text: '{test_note}'")
    print("Invoking LangGraph agent workflow...")
    
    final_state = agent_graph.invoke(initial_state, config=config)
    
    print("\n=== AGENT RESPONSE SUMMARY ===")
    print(f"Selected Tool: {final_state.get('selected_tool')}")
    print(f"Response Message: {final_state.get('response')}")
    print(f"Extracted Form Data:")
    extracted = final_state.get("extracted_data")
    if extracted:
        for k, v in extracted.items():
            print(f"  - {k}: {v}")
    else:
        print("  - None (Mock or Extraction Failed)")
        
    print(f"Compliance Warning: {final_state.get('compliance_warning')}")
    print("================================")
    
    # Verify that interaction was added
    new_intrs = db.query(Interaction).filter(Interaction.notes.contains("Met Dr. Shah")).all()
    print(f"Number of 'Met Dr. Shah' interactions logged in DB: {len(new_intrs)}")
    if len(new_intrs) > 0:
        print("SUCCESS: Log Interaction Tool successfully wrote to Database!")
    else:
        print("FAIL: Interaction was not committed to DB.")
        
    db.close()
    print("=== BACKEND INTEGRATION TEST COMPLETE ===")

if __name__ == "__main__":
    run_test()
