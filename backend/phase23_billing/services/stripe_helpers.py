import stripe
from ..deps import get_settings

def init_stripe():
    s = get_settings()
    if not s.STRIPE_SECRET_KEY:
        raise RuntimeError("STRIPE_SECRET_KEY not set")
    stripe.api_key = s.STRIPE_SECRET_KEY
    return stripe

def calc_stripe_fee(amount_cents: int) -> int:
    # Approximate standard fee (2.9% + $0.30)
    return int(round(amount_cents * 0.029 + 30))
