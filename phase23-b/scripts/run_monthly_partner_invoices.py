#!/usr/bin/env python3
from datetime import datetime
from phase23.billing.deps import SessionLocal
from phase23.billing.services.partner_billing import generate_partner_invoices

if __name__ == "__main__":
    db = SessionLocal()
    try:
        invs = generate_partner_invoices(db, today=datetime.utcnow())
        print(f"Generated {len(invs)} partner invoices")
    finally:
        db.close()
