from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, Boolean, Text, TIMESTAMP
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
import uuid

class Base(DeclarativeBase):
    pass

class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None]
    api_key_prefix: Mapped[str | None]
    invoice_number: Mapped[str]
    stripe_invoice_id: Mapped[str | None]
    subtotal_cents: Mapped[int]
    tax_cents: Mapped[int]
    discount_cents: Mapped[int]
    total_cents: Mapped[int]
    amount_paid_cents: Mapped[int]
    amount_due_cents: Mapped[int]
    currency: Mapped[str]
    status: Mapped[str]
    billing_period_start: Mapped[datetime]
    billing_period_end: Mapped[datetime]
    due_date: Mapped[datetime]
    paid_at: Mapped[datetime | None]
    voided_at: Mapped[datetime | None]
    line_items: Mapped[dict]  # JSONB
    notes: Mapped[str | None]
    invoice_pdf_url: Mapped[str | None]
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

class PaymentHistory(Base):
    __tablename__ = "payment_history"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    invoice_id: Mapped[int | None]
    user_id: Mapped[int | None]
    stripe_payment_intent_id: Mapped[str | None]
    stripe_charge_id: Mapped[str | None]
    amount_cents: Mapped[int]
    currency: Mapped[str]
    status: Mapped[str]
    payment_method: Mapped[str | None]
    stripe_fee_cents: Mapped[int]
    net_amount_cents: Mapped[int]
    failure_code: Mapped[str | None]
    failure_message: Mapped[str | None]
    refunded_at: Mapped[datetime | None]
    refund_reason: Mapped[str | None]
    refund_amount_cents: Mapped[int | None]
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

class UsageEvent(Base):
    __tablename__ = "usage_events"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None]
    api_key_prefix: Mapped[str | None]
    event_type: Mapped[str]
    resource_id: Mapped[int | None]
    billable: Mapped[bool]
    cost_units: Mapped[int]
    unit_price_cents: Mapped[int | None]
    metadata: Mapped[dict | None]
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)

class Credit(Base):
    __tablename__ = "credits"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int | None]
    invoice_id: Mapped[int | None]
    amount_cents: Mapped[int]
    currency: Mapped[str]
    reason: Mapped[str]
    description: Mapped[str | None]
    applied_to_invoice_id: Mapped[int | None]
    expires_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), default=datetime.utcnow)
