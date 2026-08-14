from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY environment variable must be set!")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# RED-S3. The 30-minute access token stays SHORT on purpose — a leaked
# one should stop working quickly. What was missing is everything around
# it:
#
#   - no refresh, so 30 minutes meant "logged out mid-file", which is how
#     an escrow officer loses a deed at 4:40 on a Thursday;
#   - no `jti`, so no token could ever be identified;
#   - and therefore NO REVOCATION. A leaked token was valid for up to 30
#     minutes and there was no mechanism on earth to kill it. "Logout"
#     was a localStorage delete — the token itself kept working.
#
# A refresh token lets the short access token stay short. Rotation on
# every use means a stolen refresh token is usable at most once, and the
# theft is DETECTABLE: when the legitimate holder presents the token that
# was already rotated, that is a replay, and the whole family dies.
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "14"))

TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token.

    RED-S3: every token now carries a `jti`. Without one there is no name
    to revoke, which is why "logout" used to be a localStorage delete
    while the token itself kept working until it expired.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({
        "exp": expire,
        "jti": to_encode.get("jti") or uuid.uuid4().hex,
        "typ": TOKEN_TYPE_ACCESS,
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id, family: Optional[str] = None) -> tuple:
    """Issue a refresh token and record it. Returns (token, jti, family).

    `family` ties every rotation of one login together. Rotation issues a
    new token and retires the old one; if a RETIRED token is ever
    presented again, that is a replay — the legitimate holder and a thief
    both have it — and the correct response is to kill the whole family
    rather than guess which one is which.
    """
    jti = uuid.uuid4().hex
    family = family or uuid.uuid4().hex
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    token = jwt.encode(
        {"sub": str(user_id), "jti": jti, "fam": family,
         "typ": TOKEN_TYPE_REFRESH, "exp": expire},
        SECRET_KEY, algorithm=ALGORITHM)
    _record_refresh(jti, int(user_id), family, expire)
    return token, jti, family


def _record_refresh(jti, user_id, family, expires_at):
    import db
    try:
        with db.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO refresh_tokens (jti, user_id, family, expires_at)
                VALUES (%s, %s, %s, %s) ON CONFLICT (jti) DO NOTHING
            """, (jti, user_id, family, expires_at))
            db.conn.commit()
    except Exception as e:
        try:
            db.conn.rollback()
        except Exception:
            pass
        # A refresh token we cannot record is one we cannot revoke, which
        # is the whole point of the ticket. Refuse rather than hand out a
        # credential outside the system that governs it.
        raise HTTPException(status_code=500,
                            detail="Could not establish the session") from e


def revoke_jti(jti: str, user_id: Optional[int] = None, reason: str = "logout"):
    """Kill one token by name."""
    import db
    with db.conn.cursor() as cur:
        cur.execute("""
            INSERT INTO revoked_tokens (jti, user_id, reason)
            VALUES (%s, %s, %s) ON CONFLICT (jti) DO NOTHING
        """, (jti, user_id, reason))
        db.conn.commit()


def revoke_refresh_family(family: str, reason: str = "replay"):
    """Kill every refresh token descended from one login.

    Used when a retired token is replayed. Both the officer and whoever
    took the token lose the session — which is right: we cannot tell them
    apart, and the safe assumption when a credential is being used twice
    is that one of the two is not the officer.
    """
    import db
    with db.conn.cursor() as cur:
        cur.execute("""
            UPDATE refresh_tokens SET revoked_at = NOW(), revoke_reason = %s
            WHERE family = %s AND revoked_at IS NULL
        """, (reason, family))
        cur.execute("""
            INSERT INTO revoked_tokens (jti, user_id, reason)
            SELECT jti, user_id, %s FROM refresh_tokens WHERE family = %s
            ON CONFLICT (jti) DO NOTHING
        """, (reason, family))
        db.conn.commit()


def is_revoked(jti: str) -> bool:
    if not jti:
        # A token with no jti predates RED-S3. It cannot be revoked and
        # therefore cannot be trusted; treated as revoked so the old
        # unrevocable tokens drain out rather than living their full 30
        # minutes past a deploy.
        return True
    import db
    with db.conn.cursor() as cur:
        cur.execute("SELECT 1 FROM revoked_tokens WHERE jti = %s", (jti,))
        return cur.fetchone() is not None

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            print("⚠️ [AUTH] Token payload missing 'sub' field")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # RED-S3: a REFRESH token is not a credential for the API. It
        # buys a new access token and nothing else — otherwise the
        # 14-day token silently becomes a 14-day API key.
        if payload.get("typ") == TOKEN_TYPE_REFRESH:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh tokens cannot be used to call the API",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if is_revoked(payload.get("jti")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This session has ended. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except JWTError as e:
        # Only log non-expiration errors (expiration is expected and normal)
        if "expired" not in str(e).lower():
            print(f"⚠️ [AUTH] JWT decode error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user_id(token_data: dict = Depends(verify_token)) -> int:
    """Extract user ID from token"""
    return int(token_data.get("sub"))

def get_current_user_email(token_data: dict = Depends(verify_token)) -> str:
    """Extract user email from token"""
    return token_data.get("email")

class AuthUtils:
    """Utility class for authentication operations"""
    
    @staticmethod
    def validate_password_strength(password: str) -> tuple[bool, str]:
        """Validate password strength requirements"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        
        if not any(c.isupper() for c in password):
            return False, "Password must contain at least one uppercase letter"
        
        if not any(c.islower() for c in password):
            return False, "Password must contain at least one lowercase letter"
        
        if not any(c.isdigit() for c in password):
            return False, "Password must contain at least one number"
        
        return True, "Password is valid"
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Basic email validation"""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_state_code(state: str) -> bool:
        """Validate US state code"""
        valid_states = {
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 
            'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 
            'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
        }
        return state.upper() in valid_states

#: Every spelling of "this person is an administrator". ONE tuple, and
#: everything that asks the question reads it — including the SQL, which
#: takes it as a bound parameter rather than repeating the literals.
#:
#: ROLE1 found three definitions of admin across three files:
#: `is_admin_role` took these four case-insensitively, while
#: `admin_partners.py` and the owner-or-admin deed fetch each took
#: exactly 'admin'. Six of eight values diverged.
#:
#: The divergence was RESTRICTIVE, so it was never an escalation. What it
#: produced was a PARTIAL ADMIN: somebody with role `Administrator`
#: entered the console and was then refused by two gates inside it, which
#: they would experience as the console being broken. Nothing recorded
#: which of the three was authoritative.
#: NARROWED 2026-08-13, after the ROLE1 migration ran and was verified.
#: Final state: ('admin', None, 1), ('user', 'Escrow Officer', 1),
#: ('user', 'Title Agent', 1), ('user', None, 1) — four rows, one admin,
#: canonically spelled, and no other spelling anywhere in the column.
#:
#: The four spellings were RECOGNIZED because history had written four.
#: History no longer has: narrowing before the migration would have
#: silently removed access from an unmigrated row, and narrowing after it
#: removes nothing, because there is nothing left to remove. That
#: ordering was the whole reason this stayed wide through step 3.
#:
#: Recognized and assignable are now the same set, which is the point:
#: the interim shape had an expiry and this is it.
ADMIN_ROLES = ('admin',)


def is_admin_role(role: str) -> bool:
    """Check if role string indicates admin access (case-insensitive).

    THE single definition. A second answer to "is this person an admin"
    is a second answer to a security question, and the one that gets
    missed is the one nobody knew existed.
    """
    if not role:
        return False
    return role.strip().lower() in ADMIN_ROLES


# ── RECOGNIZED vs ASSIGNABLE ─────────────────────────────────────────
#
# ROLE1 step 3 separates the two meanings `users.role` carried: the job
# title moved to `users.job_title`, and this column is authorization
# only. Two sets, and the difference between them is the whole point.
#
# ADMIN_ROLES above is what the product RECOGNIZES — four spellings,
# because history wrote four spellings and refusing to recognize one
# would silently remove somebody's access.
#
# ASSIGNABLE_ROLES is what the product will WRITE. Two values, because
# four ways to spell one thing is the defect ROLE1 opened with, one
# floor up: a vocabulary that admits synonyms grows a second answer.
#
# Recognized ⊇ assignable, deliberately and in that direction. The
# reverse — assigning a spelling the gates do not recognize — is how a
# console mints an account that cannot use it.
ASSIGNABLE_ROLES = frozenset({'user', 'admin'})

#: What `users.role` holds when nobody has decided anything about it.
DEFAULT_ROLE = 'user'

#: The canonical spelling, for anything that WRITES admin access.
ADMIN_ROLE = 'admin'


def authorization_role(role) -> str:
    """The authorization answer for a stored role value: 'admin' or 'user'.

    ONE PLACE TURNS THE COLUMN INTO THE CLAIM. The token used to carry
    `users.role` verbatim, so a token could say `role: "Escrow Officer"`
    — a job title travelling in an authorization claim, which every
    reader then had to know was not an authorization answer.

    It reads through `is_admin_role`, so it is the same answer the gates
    give, and it is correct both before and after the migration: an
    unmigrated `Administrator` row still resolves to admin.
    """
    return ADMIN_ROLE if is_admin_role(role) else DEFAULT_ROLE


async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Verify admin access from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_email: str = payload.get("email")
        user_role: str = payload.get("role")
        
        if user_email is None or not is_admin_role(user_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        return user_email
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        ) 