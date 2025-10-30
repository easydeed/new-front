import logging
from functools import lru_cache
from pydantic_settings import BaseSettings
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

class Settings(BaseSettings):
    EXTERNAL_API_HOST: str = "0.0.0.0"
    EXTERNAL_API_PORT: int = 8001
    EXTERNAL_API_DEBUG: bool = True

    API_KEY_MIN_PREFIX: str = "dp_pk_"
    ADMIN_SETUP_SECRET: str = "change-me-admin-bootstrap-secret"

    SOFTPRO_WEBHOOK_SECRET: str = "change-me-softpro"
    QUALIA_WEBHOOK_SECRET: str = "change-me-qualia"

    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 120
    RATE_LIMIT_REDIS_URL: str | None = None

    DATABASE_URL: str = "postgresql+psycopg://user:pass@localhost:5432/deedpro"

    MAIN_API_BASE_URL: str = "http://localhost:8000"
    MAIN_API_INTERNAL_TOKEN: str = "change-me-internal-service-token"
    EXTERNAL_API_USE_IMPORTS: bool = False

    STORAGE_DRIVER: str = "s3"  # s3 | local
    S3_BUCKET: str = ""
    S3_REGION: str = "us-west-1"
    AWS_ACCESS_KEY_ID: str | None = None
    AWS_SECRET_ACCESS_KEY: str | None = None
    LOCAL_STORAGE_DIR: str = "./external_api/storage/files"

    SENTRY_DSN: str | None = None
    ENABLE_REQUEST_LOGS: bool = True

@lru_cache
def get_settings() -> Settings:
    return Settings()

def get_logger():
    logger = logging.getLogger("external_api")
    if not logger.handlers:
        level = logging.DEBUG if get_settings().EXTERNAL_API_DEBUG else logging.INFO
        logger.setLevel(level)
        ch = logging.StreamHandler()
        ch.setLevel(level)
        fmt = logging.Formatter('%(asctime)s %(levelname)s %(name)s %(message)s')
        ch.setFormatter(fmt)
        logger.addHandler(ch)
    return logger

engine = create_engine(get_settings().DATABASE_URL, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
