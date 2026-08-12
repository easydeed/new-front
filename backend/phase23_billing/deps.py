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
# ── The URL is resolved ON FIRST USE, not at import ────────────────
#
# It used to default to `postgresql://user:pass@localhost:5432/deedpro`
# — a fictional URL that produces a connection error naming a database
# nobody has, sending the reader hunting for a host instead of a missing
# variable.
#
# Replacing the default with a refusal is right; doing it AT IMPORT was
# not, and the no-database test suite caught it in one run: importing
# this module to read a route table is not the same as using the
# database, and a refusal at import makes the two indistinguishable.
#
# So the engine is built lazily. The refusal still fires — at the moment
# somebody actually asks for a session, which is the moment the variable
# is actually needed.
_ENGINE = None
_SESSION_FACTORY = None


def _database_url() -> str:
    from services.environment import require

    url = require("DATABASE_URL")
    # SQLAlchemy needs the driver named; psycopg2-binary is what the main
    # app installs.
    if url.startswith("postgresql://") and "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg2://")
    return url


def _session_factory():
    global _ENGINE, _SESSION_FACTORY
    if _SESSION_FACTORY is None:
        _ENGINE = create_engine(_database_url(), future=True, pool_pre_ping=True)
        _SESSION_FACTORY = sessionmaker(bind=_ENGINE, autoflush=False,
                                        autocommit=False, future=True)
    return _SESSION_FACTORY


def SessionLocal():
    """Kept callable under its old name — every caller says
    `SessionLocal()`, and renaming it would be churn for no property."""
    return _session_factory()()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
