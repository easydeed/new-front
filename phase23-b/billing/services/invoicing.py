from datetime import datetime
from sqlalchemy.orm import Session
from ..models import Invoice
from ..deps import get_logger
from ..storage.s3_storage import StorageClient

logger = get_logger()

def create_invoice(
    db: Session,
    user_id: int | None,
    api_key_prefix: str | None,
    invoice_number: str,
    currency: str,
    line_items: list[dict],
    billing_start: datetime,
    billing_end: datetime,
    due_date: datetime,
    notes: str | None = None,
    stripe_invoice_id: str | None = None
) -> Invoice:
    subtotal = sum(int(item.get("total_cents", 0)) for item in line_items)
    total_cents = subtotal  # tax/discount can be added
    inv = Invoice(
        user_id=user_id,
        api_key_prefix=api_key_prefix,
        invoice_number=invoice_number,
        stripe_invoice_id=stripe_invoice_id,
        subtotal_cents=subtotal,
        tax_cents=0,
        discount_cents=0,
        total_cents=total_cents,
        amount_paid_cents=0,
        amount_due_cents=total_cents,
        currency=currency,
        status="open",
        billing_period_start=billing_start,
        billing_period_end=billing_end,
        due_date=due_date,
        line_items={"items": line_items},
        notes=notes,
    )
    db.add(inv); db.commit(); db.refresh(inv)
    return inv

def render_invoice_pdf_html(inv: Invoice) -> str:
    rows = "".join([
        f"<tr><td>{item.get('description')}</td><td>{item.get('quantity',1)}</td><td>${(item.get('unit_price_cents',0)/100):.2f}</td><td>${(item.get('total_cents',0)/100):.2f}</td></tr>"
        for item in (inv.line_items.get('items') or [])
    ])
    html = f"""
    <html><head><meta charset="utf-8"><style>
    body {{ font-family: Arial, sans-serif; }}
    table {{ width:100%; border-collapse: collapse; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; font-size: 12px; }}
    th {{ background: #f5f5f5; text-align:left; }}
    </style></head>
    <body>
      <h2>Invoice {inv.invoice_number}</h2>
      <p>Status: {inv.status} — Total: ${(inv.total_cents/100):.2f} {inv.currency}</p>
      <p>Period: {inv.billing_period_start.date()} → {inv.billing_period_end.date()}</p>
      <table>
        <thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </body></html>
    """
    return html

def maybe_generate_pdf_and_store(inv: Invoice) -> str | None:
    try:
        from weasyprint import HTML
    except Exception:
        logger.warning("WeasyPrint not installed; skipping invoice PDF generation")
        return None
    html = render_invoice_pdf_html(inv)
    pdf_bytes = HTML(string=html).write_pdf()
    storage = StorageClient()
    url, _ = storage.save_pdf(pdf_bytes, f"invoice_{inv.invoice_number}.pdf")
    return url
