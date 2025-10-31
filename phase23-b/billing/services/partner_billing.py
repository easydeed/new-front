from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session
from ..deps import get_logger
from .invoicing import create_invoice, maybe_generate_pdf_and_store

logger = get_logger()

def _prev_month_range(today: datetime) -> tuple[datetime, datetime]:
    first_this = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_end = first_this
    last_month_start = (first_this - timedelta(days=1)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return last_month_start, last_month_end

def generate_partner_invoices(db: Session, today: datetime | None = None):
    today = today or datetime.utcnow()
    start, end = _prev_month_range(today)

    partners = db.execute(text("""
        SELECT api_key_prefix, company, pricing_model, monthly_flat_fee_cents, per_deed_price_cents, per_1000_requests_cents
        FROM api_partner_contracts
        WHERE status='active'
    """)).fetchall()

    out = []
    for p in partners:
        prefix, company, model, flat_fee, per_deed, per_1000 = p

        usage = db.execute(text("""
            SELECT COUNT(*)::int AS req_count, COALESCE(SUM(cost_units),0)::int AS units
            FROM api_usage
            WHERE api_key_prefix = :prefix AND created_at >= :start AND created_at < :end
        """), {"prefix": prefix, "start": start, "end": end}).fetchone()
        req_count = usage.req_count or 0
        units = usage.units or 0

        line_items = []
        total_cents = 0

        if model == "flat":
            total_cents += flat_fee or 0
            line_items.append({"description": "Monthly API Access", "quantity":1, "unit_price_cents": flat_fee or 0, "total_cents": flat_fee or 0})
        elif model == "per_deed":
            price = per_deed or 0
            total = price * units
            total_cents += total
            line_items.append({"description": f"Deeds ({units})", "quantity": units, "unit_price_cents": price, "total_cents": total})
        elif model == "hybrid":
            price = per_deed or 0
            total = (flat_fee or 0) + price * units
            total_cents += total
            line_items.append({"description": "Monthly Base Fee", "quantity": 1, "unit_price_cents": flat_fee or 0, "total_cents": flat_fee or 0})
            line_items.append({"description": f"Deeds ({units})", "quantity": units, "unit_price_cents": price, "total_cents": price*units})
        else:  # per_request (per 1000)
            per_thousand = per_1000 or 0
            blocks = (req_count + 999)//1000
            total = blocks * per_thousand
            total_cents += total
            line_items.append({"description": f"API Requests ({req_count})", "quantity": blocks, "unit_price_cents": per_thousand, "total_cents": total})

        inv_num = f"API-{start.strftime('%Y%m')}-{prefix[:8]}"
        inv = create_invoice(
            db=db,
            user_id=None,
            api_key_prefix=prefix,
            invoice_number=inv_num,
            currency="USD",
            line_items=line_items,
            billing_start=start,
            billing_end=end,
            due_date=end + timedelta(days=30),
            notes=f"Partner: {company}; Model: {model}"
        )
        pdf_url = maybe_generate_pdf_and_store(inv)
        if pdf_url:
            db.execute(text("UPDATE invoices SET invoice_pdf_url=:u WHERE id=:id"), {"u": pdf_url, "id": inv.id})
            db.commit()
        logger.info(f"[PartnerBilling] Created invoice {inv_num} for {company} total={(total_cents or 0)/100:.2f}")
        out.append(inv)
    return out
