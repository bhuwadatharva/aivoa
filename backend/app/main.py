import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.routers import auth, hcp, interaction, ai, dashboard
from app.seed import seed_database
import uvicorn

# Initialize FastAPI App
app = FastAPI(
    title="Aivoa CRM API",
    description="AI-First Life Sciences CRM Backend powered by LangGraph & Groq",
    version="1.0.0"
)

# CORS Configuration
# Vite React app runs on port 5173 by default
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "https://aivoa-1-thvw.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database Initializer and Seeding
@app.on_event("startup")
def on_startup():
    print("Database check & table initialization starting...")
    Base.metadata.create_all(bind=engine)
    
    # Run DB Seeder
    db = SessionLocal()
    try:
        seed_database(db)
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

# Include API Routers
app.include_router(auth.router)
app.include_router(hcp.router)
app.include_router(interaction.router)
app.include_router(ai.router)
app.include_router(dashboard.router)

# Base health route
@app.get("/")
def read_root():
    return {
        "status": "online",
        "app_name": "Aivoa AI CRM",
        "database_url_configured": not engine.url.database == "./aivoa.db"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
