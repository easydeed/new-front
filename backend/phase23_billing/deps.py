import logging
import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

class Settings(BaseSettings):
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_OVERAGE_PRICE_CENTS: int = 500  # default $5
    STORAGE_DRIVER: str = "local"  # local | s3
    S3_BUCKET: str = ""
    S3_REGION: str = "us-west-1"
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    LOCAL_STORAGE_DIR: str = "./billing_storage/files"
    DEBUG: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache
def get_settings() -> Settings:
    return Settings()

def get_logger():
    logger = logging.getLogger("billing")
    if not logger.handlers:
        level = logging.DEBUG if get_settings().DEBUG else logging.INFO
        logger.setLevel(level)
        ch = logging.StreamHandler()
        ch.setLevel(level)
        fmt = logging.Formatter('%(asctime)s %(levelname)s %(name)s %(message)s')
        ch.setFormatter(fmt)
        logger.addHandler(ch)
    return logger

# CRITICAL FIX: Use same DATABASE_URL as main app
# Main app uses psycopg2 format (postgresql://), not psycopg3 (postgresql+psycopg://)
# Get from environment directly, don't override
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/deedpro")

# Convert psycopg2 URL to SQLAlchemy format if needed
# psycopg2 uses: postgresql://
# SQLAlchemy with psycopg (v3) needs: postgresql+psycopg://
# But we'll use psycopg2-binary which main app uses
if DATABASE_URL.startswith("postgresql://") and "+psycopg" not in DATABASE_URL:
    # Use psycopg2 driver (already installed)
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")

engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
