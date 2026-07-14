import os
import urllib.parse
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load env variables from the parent directory of config.py, i.e. /backend
load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

class Settings(BaseSettings):
    # Database Settings
    SUPABASE_URL: str = ""
    SUPABASE_DB_USER: str = "postgres"
    SUPABASE_DB_PASSWORD: str = ""
    SUPABASE_DB_HOST: str = ""
    SUPABASE_DB_PORT: str = "5432"
    SUPABASE_DB_NAME: str = "postgres"
    
    # SQLite fallback file
    SQLITE_DB_FILE: str = "aivoa.db"

    # API Keys
    GROQ_API_KEY: str = ""

    # JWT Configs
    JWT_SECRET: str = "aivoa-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    @property
    def DATABASE_URL(self) -> str:
        # Check if we have PostgreSQL parameters
        has_pg = all([
            self.SUPABASE_DB_HOST,
            self.SUPABASE_DB_PASSWORD,
            self.SUPABASE_DB_USER,
            self.SUPABASE_DB_NAME
        ])
        if has_pg:
            # URL-encode the password to escape special characters like '@'
            safe_password = urllib.parse.quote_plus(self.SUPABASE_DB_PASSWORD)
            # Format: postgresql://user:pass@host:port/dbname
            return f"postgresql://{self.SUPABASE_DB_USER}:{safe_password}@{self.SUPABASE_DB_HOST}:{self.SUPABASE_DB_PORT}/{self.SUPABASE_DB_NAME}"
        else:
            # Fallback to local SQLite DB
            return f"sqlite:///./{self.SQLITE_DB_FILE}"

settings = Settings()

