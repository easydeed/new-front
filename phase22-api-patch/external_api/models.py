from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Boolean, Integer, ARRAY, TIMESTAMP, Text
import uuid
from datetime import datetime

class Base(DeclarativeBase):
    pass

class ApiKey(Base):
    __tablename__ = "api_keys"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    key_prefix: Mapped[str] = mapped_column(String, index=True)
    key_hash: Mapped[str] = mapped_column(String)
    company: Mapped[str] = mapped_column(String)
    user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    scopes: Mapped[list[str]] = mapped_column(ARRAY(String), default=[])
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    rate_limit_per_minute: Mapped[int] = mapped_column(Integer, default=120)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    revoked_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

class ApiUsage(Base):
    __tablename__ = "api_usage"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    api_key_prefix: Mapped[str] = mapped_column(String, index=True)
    endpoint: Mapped[str] = mapped_column(String)
    status_code: Mapped[int] = mapped_column(Integer)
    request_id: Mapped[str] = mapped_column(String)
    latency_ms: Mapped[int] = mapped_column(Integer)
    cost_units: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow, index=True)

class ExternalDeed(Base):
    __tablename__ = "external_deeds"
    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    partner: Mapped[str] = mapped_column(String, index=True)
    order_id: Mapped[str] = mapped_column(String, index=True)
    deed_type: Mapped[str] = mapped_column(String)
    property_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    main_deed_id: Mapped[str | None] = mapped_column(String, nullable=True)
    pdf_url: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String, default="completed")
