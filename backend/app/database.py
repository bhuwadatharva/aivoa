from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

database_url = settings.DATABASE_URL
is_sqlite = database_url.startswith("sqlite")

# SQLite needs check_same_thread=False
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    database_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
