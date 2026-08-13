"""User auth/profile/billing-session endpoints (T8 split — moved verbatim from main.py).

NOTE: the /users/profile handler below is intentionally named
the route handler was renamed get_user_profile_endpoint so it no longer
shadows the database.get_user_profile helper (name-shadowing fix).
it is the preserved pre-split behavior.
"""
import os

from services.environment import require

import psycopg2
import stripe
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

import db
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user_id, is_admin_role, AuthUtils
)
from database import clean_profile_text, get_user_profile, update_user_profile, get_recent_properties

router = APIRouter()

# New models for registration and plan management
class UserRegister(BaseModel):
    email: str
    password: str
    confirm_password: str
    full_name: str
    role: str
    company_name: Optional[str] = None
    company_type: Optional[str] = None
    phone: Optional[str] = None
    state: str
    agree_terms: bool
    # ── LEGAL1: `subscribe` IS NO LONGER ACCEPTED ─────────────────────
    #
    # It was captured here and written to the users table, and then
    # appeared NOWHERE ELSE in 119 endpoints: not in any response, not on
    # /users/profile, not in admin search or export. `ProfilePatch` takes
    # only default_county and onboarding_completed. There is no
    # unsubscribe endpoint and no email-preferences endpoint, while
    # /admin/emails and /admin/emails/stats both exist.
    #
    # So the consent was unreadable, unmodifiable by the person who gave
    # it, unproducible by support, and had no opt-out path. Mailing a
    # list whose consent cannot be produced and which offers no way out
    # is a CAN-SPAM problem, not a UX gap.
    #
    # OWNER-RULED: stop collecting it. Collecting consent we cannot
    # honour is worse than not collecting it — it manufactures a record
    # that looks like permission and cannot function as one.
    #
    # The COLUMN stays and existing rows are untouched: dropping a column
    # is a data operation, and those values are evidence of what was
    # collected even though they are unusable as permission.
    #
    # The lifecycle gets built when there is an actual reason to mail
    # anyone — stored, readable on the profile, patchable by the user, a
    # real unsubscribe path, and a List-Unsubscribe header on any
    # non-transactional send. All of it, or none of it.
    #
    # Pydantic's `extra = "ignore"` is NOT relied on here: the field is
    # absent from the model, so a client still sending it is ignored
    # rather than silently honoured.

class UserLogin(BaseModel):
    email: str
    password: str

class UpgradeRequest(BaseModel):
    plan: str  # 'professional', 'enterprise'

# ============================================================================
# AUTHENTICATION & REGISTRATION ENDPOINTS
# ============================================================================

@router.post("/users/register")
async def register_user(user: UserRegister = Body(...)):
    """Register a new user with comprehensive validation"""
    try:
        # Validation
        if not user.agree_terms:
            raise HTTPException(status_code=400, detail="Must agree to terms and conditions")

        if user.password != user.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")

        # Validate password strength
        is_valid, message = AuthUtils.validate_password_strength(user.password)
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)

        # Validate email format
        if not AuthUtils.validate_email(user.email):
            raise HTTPException(status_code=400, detail="Invalid email format")

        # Validate state code
        if not AuthUtils.validate_state_code(user.state):
            raise HTTPException(status_code=400, detail="Invalid state code")

        # Profile-hygiene: a name that is all whitespace is no name — the
        # value prints on deed faces and emails.
        if not clean_profile_text(user.full_name):
            raise HTTPException(status_code=400, detail="Full name is required")

        # SECURITY: registration must never grant privilege. users.role is
        # the professional role that prints on the profile (Escrow Officer,
        # Title Agent, ...) AND the value is_admin_role() reads to gate the
        # admin console — one column, two meanings. The field was accepted
        # verbatim from the request body, so registering with
        # {"role": "admin"} minted a working admin account: the login token
        # carried role=admin and /admin/* answered it, including API-key
        # minting. Privilege is granted by an operator, never claimed by a
        # registrant.
        if is_admin_role(user.role):
            raise HTTPException(
                status_code=400,
                detail="That role cannot be selected at registration.",
            )

        # Hash password
        hashed_password = get_password_hash(user.password)

        # PHASE 24-G FIX: Use resilient connection that auto-reconnects
        conn = db.get_db_connection()

        # Insert user into database
        new_user_id = None
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO users (email, password_hash, full_name, role, company_name,
                                 company_type, phone, state, plan)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                # Profile-hygiene: name/company/phone print on deed faces
                # and emails — normalize whitespace at the write, never case.
                user.email.lower(), hashed_password,
                clean_profile_text(user.full_name), user.role,
                clean_profile_text(user.company_name), user.company_type,
                clean_profile_text(user.phone), user.state.upper(),
                'free'
            ))
            result = cur.fetchone()
            if result:
                new_user_id = result[0]
            conn.commit()

        # E1: admin signup notice — this import failed silently on every
        # registration since Phase 7 (the function never existed). It exists
        # now; owner-ruled minimal content (registrant email + timestamp).
        try:
            from utils.notifications import notify_new_user_registration

            admin_email = os.getenv('ADMIN_EMAIL', 'admin@deedpro.com')

            admin_ok, admin_reason = notify_new_user_registration(
                admin_email=admin_email,
                user_email=user.email.lower(),
                user_name=user.full_name,
                user_id=new_user_id or 0
            )

            if admin_ok:
                print(f"[Phase 7] ✅ Admin notification sent for new user: {user.email}")
            else:
                print(f"[Phase 7] ⚠️ Admin notification not sent: {admin_reason}")
        except Exception as notif_error:
            # Don't fail registration if notification fails
            print(f"[Phase 7] ⚠️ Admin notification error (non-blocking): {notif_error}")

        # E1: welcome email to the registrant (lifecycle gap — there was
        # no first-touch email at all).
        try:
            from utils.notifications import send_welcome_with_reason

            welcome_ok, welcome_reason = send_welcome_with_reason(
                user.email.lower(), clean_profile_text(user.full_name) or ""
            )
            if not welcome_ok:
                print(f"[E1] ⚠️ Welcome email not sent: {welcome_reason}")
        except Exception as welcome_error:
            print(f"[E1] ⚠️ Welcome email error (non-blocking): {welcome_error}")

        # F2: mint the session at registration so signup lands in the app
        # logged in. Claims are identical to /users/login's token (sub, email,
        # role) — same storage contract on the client, no fourth pattern.
        access_token = create_access_token(
            data={
                "sub": str(new_user_id),
                "email": user.email.lower(),
                "role": user.role or "user"
            }
        )

        return {
            "message": "User registered successfully",
            "email": user.email,
            "plan": "free",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": new_user_id,
                "email": user.email.lower(),
                "full_name": user.full_name,
                "plan": "free"
            }
        }

    except psycopg2.IntegrityError as ie:
        # PHASE 24-G FIX: Safe rollback that handles closed connections
        try:
            if conn and not conn.closed:
                conn.rollback()
        except Exception as rollback_error:
            print(f"[REGISTER ROLLBACK ERROR] {rollback_error}")
        raise HTTPException(status_code=400, detail="Email already exists")
    except HTTPException:
        # Deliberate validation failures (weak password, bad email, bad
        # state, missing name, privileged role) are already the right
        # answer — the blanket handler below used to re-wrap them as
        # "Registration failed: 400: ..." with a 500 status, so every
        # validation message reached the user as a server error.
        raise
    except Exception as e:
        # PHASE 24-G FIX: Safe rollback that handles closed connections
        try:
            if conn and not conn.closed:
                conn.rollback()
        except Exception as rollback_error:
            print(f"[REGISTER ROLLBACK ERROR] {rollback_error}")
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@router.post("/users/login")
async def login_user(credentials: UserLogin = Body(...), request: Request = None):
    """Authenticate user and return an access + refresh pair.

    RED-S3 added two things this handler never had:

    LOCKOUT. There was NO throttle of any kind on password guessing —
    unlimited attempts against bcrypt at whatever rate the host would
    serve. Now: repeated failures for one email lock it briefly, and the
    lock is announced rather than disguised as a wrong password, because
    an officer who has genuinely forgotten needs to know why the right
    password stopped working.

    A REFRESH TOKEN. The 30-minute access token used to be the whole
    session, so "logged out mid-file" was the normal experience. The
    access token stays 30 minutes — short is the point — and the refresh
    token is what lets the officer come back to the deed she was
    typing.
    """
    from services.login_guard import (check_lockout, record_attempt)
    _ip = None
    try:
        _ip = request.client.host if request and request.client else None
        _fwd = request.headers.get("x-forwarded-for") if request else None
        if _fwd:
            _ip = _fwd.split(",")[0].strip()
    except Exception:
        pass
    check_lockout(credentials.email.lower())
    # Poisoned-conn hotfix: bind before try — if get_db_connection raises,
    # the except block's rollback used to hit an UnboundLocalError.
    conn = None
    try:
        # PHASE 24-G FIX: Use resilient connection that auto-reconnects
        # (and, since the 2026-08-01 outage, heals aborted transactions).
        conn = db.get_db_connection()

        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, password_hash, full_name, plan, is_active, role
                FROM users WHERE email = %s
            """, (credentials.email.lower(),))
            user = cur.fetchone()

        if not user:
            # Recorded too: otherwise the lockout counts only attempts
            # against addresses that exist, which is both weaker and a
            # user-enumeration signal in the timing.
            record_attempt(credentials.email.lower(), _ip, succeeded=False)
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # This branched on isinstance(user, dict) because the codebase
        # once had two cursor factories. It has one (db_rows.ROW_FACTORY,
        # pinned), so the tuple branch was unreachable — and unreachable
        # is the worst place for this pattern to live, because it reads
        # as proof that destructuring is a supported way to read a row.
        # It is not. Read by key, always.
        user_id = user['id']
        password_hash = user['password_hash']
        full_name = user['full_name']
        plan = user['plan']
        is_active = user['is_active']
        role = user['role']

        if not is_active:
            raise HTTPException(status_code=401, detail="Account is deactivated")

        if not verify_password(credentials.password, password_hash):
            record_attempt(credentials.email.lower(), _ip, succeeded=False)
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Update last login
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
            conn.commit()

        record_attempt(credentials.email.lower(), _ip, succeeded=True)

        # Create access token (AdminFix: include role for admin access)
        access_token = create_access_token(
            data={
                "sub": str(user_id),
                "email": credentials.email.lower(),
                "role": role or "user"  # Default to "user" if role is None
            }
        )
        from auth import create_refresh_token
        refresh_token, _, _ = create_refresh_token(user_id)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": credentials.email.lower(),
                "full_name": full_name,
                "plan": plan
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        # PHASE 24-G FIX: Safe rollback that handles closed connections
        try:
            if conn and not conn.closed:
                conn.rollback()
        except Exception as rollback_error:
            print(f"[LOGIN ROLLBACK ERROR] {rollback_error}")

        print(f"[LOGIN ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@router.get("/users/profile")
async def get_user_profile_endpoint(user_id: int = Depends(get_current_user_id)):
    """Get current user's profile information"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT id, email, full_name, role, company_name, company_type,
                       phone, state, plan, created_at, last_login
                FROM users WHERE id = %s AND is_active = TRUE
            """, (user_id,))
            user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get plan limits
        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT max_deeds_per_month, api_calls_per_month, ai_assistance,
                       integrations_enabled, priority_support
                FROM plan_limits WHERE plan_name = %s
            """, (user[8],))  # user[8] is plan
            limits = cur.fetchone()

        # F3: server-truth onboarding state — the dashboard gate reads these
        # from this response, never from localStorage alone (bug #10).
        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT default_county, onboarding_completed, business_address
                FROM user_profiles WHERE user_id = %s
            """, (user_id,))
            prof = cur.fetchone()
        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM deeds
                WHERE user_id = %s AND COALESCE(status, '') != 'deleted'
            """, (user_id,))
            total_deeds = cur.fetchone()[0]

        return {
            "default_county": prof[0] if prof else None,
            "onboarding_completed": bool(prof[1]) if prof else False,
            # SETTINGS1 — the address the Settings form always wanted and
            # never had. The column was in `user_profiles` the whole
            # time; the form was built against street/city/ZIP, which
            # exist nowhere and never did.
            "business_address": (prof[2] if prof and len(prof) > 2 else None),
            "total_deeds": total_deeds,
            "id": user[0],
            "email": user[1],
            "full_name": user[2],
            "role": user[3],
            "company_name": user[4],
            "company_type": user[5],
            "phone": user[6],
            "state": user[7],
            "plan": user[8],
            "created_at": user[9],
            "last_login": user[10],
            # ── MONEY1: A LIMIT NOTHING ENFORCES IS NOT REPORTED ──────
            #
            # This returned `max_deeds_per_month: 5` (and four more) from
            # hardcoded fallbacks whenever `plan_limits` had no row for
            # the plan — which is always, because the table is never
            # seeded. `check_plan_limits` exists in main.py with ZERO
            # call sites, so nothing has ever counted a deed against a
            # cap.
            #
            # A number in a payload reads as a rule. An officer on Free
            # would have been told she has five a month, by the API, and
            # it was not true in either direction: nothing stopped her at
            # five, and nothing had decided she should be stopped.
            #
            # Same class TRIAL1 deleted from the pricing copy, surviving
            # in a payload instead — which is the harder place to see it,
            # because copy gets read by people and payloads do not.
            #
            # OWNER-RULED: Free is uncapped for now, and this says so.
            # `null` rather than a large number or an omitted key: absent
            # would let a consumer infer its own default, and a big
            # number would be a different invented rule. If a cap is ever
            # wanted it arrives with enforcement AND copy together, never
            # as a payload number alone.
            "plan_limits": {
                "max_deeds_per_month": limits[0] if limits else None,
                "api_calls_per_month": limits[1] if limits else None,
                "ai_assistance": limits[2] if limits else True,
                "integrations_enabled": limits[3] if limits else False,
                "priority_support": limits[4] if limits else False,
                # Says WHY the numbers are absent, so a consumer does not
                # read null as "failed to load" and substitute a guess.
                "enforced": bool(limits),
                "note": ("No plan limit is enforced. These are null "
                         "because nothing counts against them, not "
                         "because they failed to load.") if not limits else None,
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        raise HTTPException(status_code=500, detail=f"Failed to get profile: {str(e)}")

class ProfilePatch(BaseModel):
    """SETTINGS1 — the fields the Settings form can actually save.

    ═══ WHY THIS GREW ═══

    Settings rendered nine fields and a Save button whose handler was:

        const handleSave = () => { toast.success("Profile saved!") }

    Three lines, no request, and a SUCCESS TOAST. Not a missing
    confirmation — a fabricated one, on the single screen where somebody
    is deliberately entrusting us with their details. That is why nine
    fields vanished on reload with nobody suspecting a bug: the product
    told her it had worked.

    Wiring the button was not enough, because there was nothing to wire
    it to: this model accepted `default_county` and
    `onboarding_completed` and nothing else. No name, no company, no
    phone.

    ═══ WHAT IS HERE AND WHAT IS NOT ═══

    Every field below has a COLUMN. Nothing is accepted that cannot be
    stored — the LEGAL1 rule one screen over: a field we take and cannot
    keep is worse than a field we do not offer.

    `full_name` stays ONE field (owner-ruled). The form showed First and
    Last; the server has only `full_name`. Splitting a name to satisfy a
    form is a data-model decision made backwards, and Recording Requested
    By prints a name AS WRITTEN, not as parsed.

    Street/city/ZIP are NOT here. There are no such columns and never
    were — the form was built against imaginary ones. What does exist is
    `user_profiles.business_address`, already in the schema and unused by
    that form, so the address is one field backed by the column that was
    there all along.
    """
    default_county: Optional[str] = None
    onboarding_completed: Optional[bool] = None
    # users
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    state: Optional[str] = None
    # user_profiles
    business_address: Optional[str] = None

@router.patch("/users/profile")
async def patch_user_profile(
    patch: ProfilePatch = Body(...),
    user_id: int = Depends(get_current_user_id)
):
    """Partial profile update (F3 — the endpoint onboarding used to PATCH
    didn't exist, bug #9). Only touches the fields provided; unlike
    POST /users/profile/enhanced it never clobbers unspecified columns."""
    given = patch.dict(exclude_unset=True)
    if not given:
        raise HTTPException(status_code=400, detail="No fields to update")
    conn = None
    try:
        conn = db.get_db_connection()
        with conn.cursor() as cur:
            # ── users: name, company, phone, state ────────────────────
            #
            # Whitespace normalised at the WRITE and case left alone —
            # these print on deed faces and in emails, and a name is
            # spelled the way its owner spells it.
            user_fields = {
                "full_name": clean_profile_text(patch.full_name),
                "company_name": clean_profile_text(patch.company_name),
                "phone": clean_profile_text(patch.phone),
                "state": (patch.state or "").upper() or None,
            }
            user_fields = {k: v for k, v in user_fields.items() if k in given}
            if user_fields:
                sets = ", ".join(f"{k} = %s" for k in user_fields)
                cur.execute(f"UPDATE users SET {sets} WHERE id = %s",
                            (*user_fields.values(), user_id))

            # ── user_profiles: county, onboarding, business address ───
            profile_fields = {"default_county", "onboarding_completed",
                              "business_address"}
            if profile_fields & set(given):
                cur.execute("""
                    INSERT INTO user_profiles (user_id, default_county,
                                               onboarding_completed, business_address)
                    VALUES (%s, %s, COALESCE(%s, FALSE), %s)
                    ON CONFLICT (user_id) DO UPDATE SET
                        default_county = COALESCE(EXCLUDED.default_county,
                                                  user_profiles.default_county),
                        onboarding_completed = COALESCE(%s,
                                                  user_profiles.onboarding_completed),
                        business_address = COALESCE(EXCLUDED.business_address,
                                                  user_profiles.business_address),
                        updated_at = CURRENT_TIMESTAMP
                """, (user_id, patch.default_county, patch.onboarding_completed,
                      patch.business_address, patch.onboarding_completed))
            conn.commit()
        # What was actually written, echoed back — so the screen renders
        # the server's answer rather than the value it hoped for.
        return {"status": "updated", **given}
    except Exception as e:
        try:
            if conn and not conn.closed:
                conn.rollback()
        except Exception as rollback_error:
            print(f"[PROFILE PATCH ROLLBACK ERROR] {rollback_error}")
        raise HTTPException(status_code=500, detail=f"Profile update failed: {str(e)}")

# TRIAL1 — the canonical trial length, and the ONE place it is written
# on the server. The marketing page states the same number and a test
# compares them, because a trial whose advertised length and actual
# length differ is discovered by the customer, on the day it ends.
TRIAL_PERIOD_DAYS = 14

# The canonical plan vocabulary. `users.plan` DEFAULT is 'free',
# registration writes 'free', and the webhook downgrades to 'free' on
# cancellation — so 'free' is what the database means by the free tier.
# A fourth key ('starter') lived only in the billing UI and matched
# nothing, which is why every free user saw a blank plan card.
FREE_PLAN = 'free'
# PRICING1: Enterprise deleted. Its differentiators were SSO/SAML and
# custom branding — zero files each, and now banned outright by the
# claims gate. `business` is priced and visible on the pricing surfaces
# and is NOT here, because it is not purchasable until the org model
# (RED-S5) exists: a plan key the checkout accepts is a plan somebody
# can buy.
PAID_PLANS = ('professional',)


@router.post("/users/upgrade")
async def upgrade_plan(req: UpgradeRequest, user_id: int = Depends(get_current_user_id)):
    """Initiate plan upgrade via Stripe Checkout"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        # Get user info
        with db.conn.cursor() as cur:
            cur.execute("SELECT stripe_customer_id, email, full_name FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # ROW CONTRACT (db_rows.py): a HybridRow is a DICT subclass with
        # integer indexing bolted on. It overrides __getitem__, NOT
        # __iter__ — so destructuring it yields COLUMN NAMES, silently.
        # `customer_id` became the string 'stripe_customer_id', which is
        # truthy, so the Stripe customer was never created and Checkout
        # was called with customer='stripe_customer_id'. Nobody could pay.
        customer_id = user['stripe_customer_id']
        email = user['email']
        full_name = user['full_name']

        # Create Stripe customer if not exists
        if not customer_id:
            customer = stripe.Customer.create(
                email=email,
                name=full_name,
                metadata={"user_id": str(user_id)}
            )
            customer_id = customer.id

            # Update database with customer ID
            with db.conn.cursor() as cur:
                cur.execute("UPDATE users SET stripe_customer_id = %s WHERE id = %s", (customer_id, user_id))
                db.conn.commit()

        # TRIAL1 — the free trial the marketing page has been promising.
        #
        # Card up front, N days free, auto-converts. Stripe runs the whole
        # thing; nothing here tracks trial state, which is the point — a
        # trial clock we kept ourselves would be a second source of truth
        # about whether somebody has paid.
        #
        # 0 disables it, which is how you turn the trial off without a
        # deploy. The value is MIRRORED on the marketing page and pinned
        # (test_trial1_paid_path.py): a "14-day trial" in the copy and a
        # 7-day trial on the session is a promise broken on day 8.
        trial_days = int(os.getenv('STRIPE_TRIAL_PERIOD_DAYS', str(TRIAL_PERIOD_DAYS)))

        # PRICING1 — NO PLACEHOLDER FALLBACK.
        #
        # This read `os.getenv('STRIPE_PROFESSIONAL_PRICE_ID',
        # 'price_professional_default')`. With the env var unset it
        # handed Stripe the literal string 'price_professional_default',
        # which is not a price ID, and Checkout failed with a Stripe
        # error the officer saw as "Upgrade failed".
        #
        # That was the SECOND independent break in the paid path — the
        # first was the row unpack (TRIAL1) — and it had the same
        # quality: a default that made an unconfigured system look
        # configured. An unconfigured service is an error, not a
        # fabricated value. Same rule the AI endpoint follows for a
        # missing OPENAI_API_KEY, and the same rule §4 states generally.
        if req.plan not in PAID_PLANS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid plan selection. Available: {list(PAID_PLANS)}")

        price_map = {'professional': os.getenv('STRIPE_PROFESSIONAL_PRICE_ID')}
        price_id = price_map.get(req.plan)
        if not price_id:
            # NAMED reason. "Upgrade failed" sent an operator looking at
            # Stripe; this sends them to the variable that is missing.
            logger_detail = (
                f"Billing is not configured for the {req.plan} plan "
                f"(STRIPE_{req.plan.upper()}_PRICE_ID is not set).")
            print(f"[billing] {logger_detail}")
            raise HTTPException(status_code=503, detail=logger_detail)

        # Create Stripe Checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            client_reference_id=str(user_id),
            metadata={'plan': req.plan, 'user_id': str(user_id)},
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1
            }],
            mode='subscription',
            # THE MONEY PATH, and the reason services/environment.py
            # exists. This read a `http://localhost:3000` fallback, so an
            # unset FRONTEND_URL charged the card and redirected the
            # customer to a page on their own machine — silently. A
            # checkout that refuses to start is strictly better: it has
            # not taken any money.
            success_url=f"{require('FRONTEND_URL')}/account-settings?success=true",
            cancel_url=f"{require('FRONTEND_URL')}/account-settings?canceled=true",
            allow_promotion_codes=True,
            **({'subscription_data': {'trial_period_days': trial_days}}
               if trial_days > 0 else {}),
        )

        return {"session_url": session.url, "session_id": session.id}

    except HTTPException:
        # PRICING1: the broad handler below was re-wrapping our OWN
        # HTTPExceptions into 500s — so the deliberate, named
        # "STRIPE_PROFESSIONAL_PRICE_ID is not set" 503 reached the
        # officer as "Upgrade failed: 503: ..." with a 500 status.
        #
        # Found by this ticket's own test, not by reading. A precise
        # error message is worthless if the layer above flattens it, and
        # doctrine §4 is about the message the human actually sees.
        raise
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upgrade failed: {str(e)}")

# ============================================================================
# STRIPE WEBHOOK & PAYMENT ENDPOINTS
# ============================================================================

# NOTE: POST /payments/webhook is handled by phase23_billing/router_webhook.py
# (registered first in include_billing_routers). The legacy inline handler that
# lived here was shadowed/dead; its users.plan sync logic has been ported there.

@router.post("/payments/create-portal-session")
async def create_portal_session(user_id: int = Depends(get_current_user_id)):
    """Create Stripe customer portal session for subscription management"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        with db.conn.cursor() as cur:
            cur.execute("SELECT stripe_customer_id FROM users WHERE id = %s", (user_id,))
            result = cur.fetchone()

        if not result or not result[0]:
            raise HTTPException(status_code=404, detail="No billing information found")

        session = stripe.billing_portal.Session.create(
            customer=result[0],
            return_url=f"{require('FRONTEND_URL')}/account-settings"
        )

        return {"url": session.url}

    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=f"Stripe error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Portal session creation failed: {str(e)}")

@router.get("/user/me")
def get_current_user(user_id: int = Depends(get_current_user_id)):
    """Get current user information from JWT token"""
    try:
        if not db.conn:
            raise HTTPException(status_code=500, detail="Database connection not available")

        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT id, email, full_name, role, company_name, phone, state, plan
                FROM users
                WHERE id = %s AND is_active = TRUE
            """, (user_id,))

            user = cur.fetchone()

            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            # Split full_name into first and last name
            full_name = user[2] or ""
            name_parts = full_name.split(" ", 1)
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            return {
                "id": user[0],
                "email": user[1],
                "first_name": first_name,
                "last_name": last_name,
                "full_name": user[2],
                "role": user[3],
                "company": user[4],
                "phone": user[5],
                "state": user[6],
                "plan": user[7]
            }

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        print(f"Error fetching current user: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {str(e)}")

# Widget Add-on Endpoints

@router.get("/check-widget-access")
async def check_widget_access(user_id: str = Depends(get_current_user_id)):
    with db.conn.cursor() as cur:
        cur.execute("SELECT widget_addon FROM users WHERE id = %s", (user_id,))
        addon = cur.fetchone()[0]
        if addon:
            return {"access": True}
        raise HTTPException(403, "No access - upgrade")

# AI-Enhanced User Profile Endpoints
@router.get("/users/profile/enhanced")
async def get_enhanced_user_profile(user_id: int = Depends(get_current_user_id)):
    """Get enhanced user profile including AI preferences and recent properties"""
    try:
        profile = get_user_profile(user_id)
        recent_properties = get_recent_properties(user_id, limit=5)

        return {
            "profile": profile,
            "recent_properties": recent_properties,
            "ai_enabled": profile.get('auto_populate_company_info', True) if profile else True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get enhanced profile: {str(e)}")

@router.post("/users/profile/enhanced")
async def update_enhanced_user_profile(
    profile_data: dict = Body(...),
    user_id: int = Depends(get_current_user_id)
):
    """Update user profile for AI-enhanced deed generation"""
    try:
        success = update_user_profile(user_id, profile_data)
        if success:
            return {"status": "updated", "message": "Profile updated successfully - AI suggestions will improve!"}
        else:
            raise HTTPException(status_code=500, detail="Failed to update profile")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Profile update failed: {str(e)}")
