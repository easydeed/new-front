"""Pricing + admin pricing/addon endpoints (T8 split — moved verbatim from main.py)."""
from typing import List

import stripe
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel

import db
from auth import get_current_admin

router = APIRouter()

class PriceUpdate(BaseModel):
    plan_name: str
    price: float
    features: List[str]

class NewPlan(BaseModel):
    plan_name: str
    price: float
    features: List[str]

# Pricing Endpoints
@router.get("/pricing")
async def get_pricing():
    """Get all pricing plans for the landing page"""
    try:
        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT plan_name, price, features, is_active
                FROM pricing
                WHERE is_active = TRUE
                ORDER BY price ASC
            """)
            rows = cur.fetchall()

            # Phase 7.5 FIX: Handle both RealDictCursor (dict) and regular cursor (tuple)
            result = []
            for row in rows:
                if isinstance(row, dict):
                    # RealDictCursor
                    result.append({
                        "name": row.get('plan_name'),
                        "price": float(row.get('price', 0)),
                        "features": row.get('features') if row.get('features') else [],
                        "popular": row.get('plan_name') == "professional"
                    })
                else:
                    # Regular cursor (tuple)
                    result.append({
                        "name": row[0],
                        "price": float(row[1]),
                        "features": row[2] if row[2] else [],
                        "popular": row[0] == "professional"
                    })

            return result
    except Exception as e:
        db.conn.rollback()  # CRITICAL: Rollback to prevent transaction cascade failures
        print(f"[PRICING ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch pricing: {str(e)}")

@router.get("/pricing/plans")
async def get_pricing_plans():
    """Get all pricing plans - alternative endpoint for consistency"""
    return await get_pricing()

@router.post("/admin/create-plan")
async def create_plan(plan: NewPlan, admin: str = Depends(get_current_admin)):
    """Create new Stripe product/price and save to database"""
    try:
        # Create Stripe product
        product = stripe.Product.create(
            name=plan.plan_name.capitalize(),
            type="service",
            description=f"{plan.plan_name.capitalize()} plan with {len(plan.features)} features"
        )

        # Create Stripe price
        price = stripe.Price.create(
            product=product.id,
            unit_amount=int(plan.price * 100),  # Convert to cents
            currency="usd",
            recurring={"interval": "month"},
            nickname=plan.plan_name
        )

        # Save to database
        with db.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO pricing (plan_name, price, stripe_product_id, stripe_price_id, features, last_synced)
                VALUES (%s, %s, %s, %s, %s::jsonb, CURRENT_TIMESTAMP)
                ON CONFLICT (plan_name) DO UPDATE SET
                    price = EXCLUDED.price,
                    stripe_price_id = EXCLUDED.stripe_price_id,
                    stripe_product_id = EXCLUDED.stripe_product_id,
                    features = EXCLUDED.features,
                    last_synced = CURRENT_TIMESTAMP
            """, (plan.plan_name, plan.price, product.id, price.id, plan.features))
            db.conn.commit()

        return {
            "status": "created",
            "plan_name": plan.plan_name,
            "stripe_price_id": price.id,
            "stripe_product_id": product.id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create plan: {str(e)}")

@router.post("/admin/sync-pricing")
async def sync_pricing(admin: str = Depends(get_current_admin)):
    """Sync pricing from Stripe to database"""
    try:
        # Get all active prices from Stripe
        prices = stripe.Price.list(active=True, limit=100).data

        synced_count = 0
        with db.conn.cursor() as cur:
            for price in prices:
                if price.nickname:  # Only sync prices with nicknames (our plans)
                    # Get product details
                    product = stripe.Product.retrieve(price.product)

                    # Update database
                    cur.execute("""
                        UPDATE pricing
                        SET price = %s,
                            stripe_price_id = %s,
                            stripe_product_id = %s,
                            last_synced = CURRENT_TIMESTAMP
                        WHERE plan_name = %s
                    """, (
                        price.unit_amount / 100,  # Convert from cents
                        price.id,
                        product.id,
                        price.nickname.lower()
                    ))

                    if cur.rowcount > 0:
                        synced_count += 1

            db.conn.commit()

        return {
            "status": "synced",
            "synced_count": synced_count,
            "message": f"Successfully synced {synced_count} plans from Stripe"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync pricing: {str(e)}")

@router.post("/admin/update-price")
async def update_price(update: PriceUpdate, admin: str = Depends(get_current_admin)):
    """Update price in both Stripe and database"""
    try:
        # Get current Stripe price ID from database
        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT stripe_price_id, stripe_product_id
                FROM pricing
                WHERE plan_name = %s
            """, (update.plan_name,))

            result = cur.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail="Plan not found")

            old_price_id, product_id = result

        # Create new price in Stripe (prices are immutable)
        new_price = stripe.Price.create(
            product=product_id,
            unit_amount=int(update.price * 100),  # Convert to cents
            currency="usd",
            recurring={"interval": "month"},
            nickname=update.plan_name
        )

        # Deactivate old price
        if old_price_id:
            stripe.Price.modify(old_price_id, active=False)

        # Update database
        with db.conn.cursor() as cur:
            cur.execute("""
                UPDATE pricing
                SET price = %s,
                    features = %s::jsonb,
                    stripe_price_id = %s,
                    last_synced = CURRENT_TIMESTAMP
                WHERE plan_name = %s
            """, (update.price, update.features, new_price.id, update.plan_name))
            db.conn.commit()

        return {
            "status": "updated",
            "plan_name": update.plan_name,
            "new_price": update.price,
            "new_stripe_price_id": new_price.id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update price: {str(e)}")

@router.post("/admin/toggle-addon")
async def toggle_addon(data: dict = Body(...), admin: str = Depends(get_current_admin)):
    with db.conn.cursor() as cur:
        cur.execute("UPDATE users SET widget_addon = %s WHERE id = %s", (data['enabled'], data['user_id']))
        db.conn.commit()
    return {"status": "updated"}
