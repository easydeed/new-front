"""Deed sharing + public approval endpoints (T8 split — moved verbatim from main.py)."""
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

import db
from auth import get_current_user_id

router = APIRouter()

class ShareDeedCreate(BaseModel):
    deed_id: int
    # X2.4: email is the recipient's identity; the name is a courtesy for
    # the email greeting only. Blank falls back to the address itself.
    recipient_name: Optional[str] = None
    recipient_email: str
    recipient_role: str
    message: Optional[str] = None
    expires_in_hours: Optional[int] = 168  # Default 7 days (168 hours)

    @field_validator('expires_in_hours')
    @classmethod
    def validate_expiry(cls, v):
        if v is not None and (v < 1 or v > 720):  # 1 hour to 30 days
            raise ValueError('Expiration must be between 1 and 720 hours')
        return v

class ApprovalResponse(BaseModel):
    approved: bool
    comments: Optional[str] = None


def _valid_token_or_404(approval_token: str) -> str:
    """`deed_shares.token` is a UUID column, so a malformed token is not
    a miss — it is a TYPE ERROR from Postgres.

    Found while pinning the pdf_data defect: every one of the three
    public /approve/{token} endpoints passed the raw path segment
    straight into `WHERE ds.token = %s`, and anything that is not a UUID
    raised InvalidTextRepresentation. On the SHARED connection, that
    aborts the transaction and Postgres then refuses every later query on
    it — the same one-request poisoning the missing column caused, from
    the same public URLs, reachable by typing nonsense after /approve/.

    A malformed token cannot match any share, so 404 is both the correct
    answer and the one that never touches the database.
    """
    import uuid
    try:
        uuid.UUID(approval_token)
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=404, detail="Share not found")
    return approval_token

# Shared Deeds endpoints
@router.post("/shared-deeds")
def share_deed_for_approval(share_data: ShareDeedCreate, user_id: int = Depends(get_current_user_id)):
    """Share a deed with someone for approval - Enhanced with configurable expiration"""
    import uuid
    from datetime import timezone
    # Use configurable expiration (default 7 days = 168 hours)
    expires_in = share_data.expires_in_hours or 168
    # X2.4: optional name — greet by email address when blank.
    if not (share_data.recipient_name or "").strip():
        share_data.recipient_name = share_data.recipient_email
    expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in)
    approval_token = str(uuid.uuid4())

    # Get the owner's name and deed details from database
    owner_name = "DeedPro User"  # Default
    deed_type = "deed"  # Default

    try:
        with db.conn.cursor() as cur:
            # Get owner's name
            cur.execute("SELECT full_name FROM users WHERE id = %s", (user_id,))
            owner_row = cur.fetchone()
            if owner_row:
                owner_name = owner_row[0] or owner_name

            # Get deed type
            cur.execute("SELECT deed_type FROM deeds WHERE id = %s", (share_data.deed_id,))
            deed_row = cur.fetchone()
            if deed_row:
                deed_type = deed_row[0] or deed_type
    except Exception as db_error:
        # RED-H1.2b: rollback FIRST. Without it a failed statement leaves
        # the shared transaction aborted and Postgres refuses every later
        # query on that connection — one bad request breaks the next
        # user's. Eight handlers in this file already did this; seven did
        # not, and the half-applied pattern is what made it invisible.
        try:
            db.conn.rollback()
        except Exception:
            pass
        print(f"[Phase 7] Warning: Could not fetch owner/deed details: {db_error}")

    # Generate approval URL
    app_url = os.getenv('FRONTEND_URL', 'https://deedpro-frontend-new.vercel.app')
    approval_url = f"{app_url}/approve/{approval_token}"

    # Phase 7.5: Save to deed_shares table (gap-plan fix)
    shared_deed_id = None
    property_address = "Unknown"
    apn = "Unknown"

    try:
        with db.conn.cursor() as cur:
            # Get deed details
            cur.execute("""
                SELECT property_address, apn
                FROM deeds
                WHERE id = %s
            """, (share_data.deed_id,))
            deed_info = cur.fetchone()
            if deed_info:
                property_address = deed_info[0] or property_address
                apn = deed_info[1] or apn

            # Insert into deed_shares table
            cur.execute("""
                INSERT INTO deed_shares (
                    deed_id, owner_user_id, recipient_email, token,
                    status, expires_at, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING id
            """, (
                share_data.deed_id,
                user_id,
                share_data.recipient_email,
                approval_token,
                'sent',
                expires_at
            ))
            result = cur.fetchone()
            if result:
                shared_deed_id = result.get('id') if isinstance(result, dict) else result[0]
            db.conn.commit()
            print(f"[Phase 7.5] ✅ Share saved to database: ID {shared_deed_id}")
    except Exception as db_error:
        db.conn.rollback()  # Phase 7.5 FIX: Rollback transaction on error
        print(f"[Phase 7.5] ⚠️ Failed to save share to database: {db_error}")
        # Continue anyway - at least send the email

    shared_deed = {
        "id": shared_deed_id or 101,  # Use real ID from database
        "deed_id": share_data.deed_id,
        "shared_by_user_id": user_id,
        "recipient_name": share_data.recipient_name,
        "recipient_email": share_data.recipient_email,
        "recipient_role": share_data.recipient_role,
        "message": share_data.message,
        "status": "sent",
        "approval_token": approval_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now().isoformat(),
        "approval_url": approval_url,
        "property_address": property_address,
        "apn": apn
    }

    # Phase 7: Send sharing notification email. S1 follow-up: the failure
    # REASON travels — logged with a [SHARE-EMAIL] prefix and carried in
    # the response so the modal's amber panel can say why ("from address
    # not verified" is actionable; "email not configured" was wrong).
    email_sent = False
    email_error = None
    try:
        from utils.notifications import send_share_notification_with_reason

        email_sent, email_error = send_share_notification_with_reason(
            recipient_email=share_data.recipient_email,
            recipient_name=share_data.recipient_name,
            owner_name=owner_name,
            deed_type=deed_type,
            share_link=approval_url,
            # E1: the invite now says what/where/until-when, not a bare link.
            property_address=property_address,
            expires_at=expires_at.strftime('%B %d, %Y'),
        )

        if email_sent:
            print(f"[SHARE-EMAIL] ✅ Sent to {share_data.recipient_email}")
        else:
            print(f"[SHARE-EMAIL] ❌ Not sent: {email_error}")
    except Exception as notif_error:
        # Don't fail the request if notification fails — but never lose why.
        email_error = f"{type(notif_error).__name__}: {str(notif_error)[:200]}"
        print(f"[SHARE-EMAIL] ❌ Exception (non-blocking): {email_error}")

    return {
        "success": True,
        "message": "Deed shared successfully! Approval email sent." if email_sent else "Deed shared, but the notification email was not sent.",
        "shared_deed": shared_deed,
        "email_sent": email_sent,
        "email_error": email_error
    }

@router.get("/shared-deeds")
def list_shared_deeds(user_id: int = Depends(get_current_user_id)):
    """List all shared deeds for current user - Phase 7.5: Read from deed_shares table"""
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection not available")

    try:
        with db.conn.cursor() as cur:
            # Phase 7.5: Query from deed_shares table (gap-plan schema)
            # Show deeds shared BY this user (as owner)
            cur.execute("""
                SELECT
                    ds.id,
                    ds.deed_id,
                    ds.owner_user_id,
                    ds.recipient_email,
                    ds.status,
                    ds.token,
                    ds.expires_at,
                    ds.created_at,
                    ds.updated_at,
                    d.property_address,
                    d.deed_type,
                    u.full_name as owner_name
                FROM deed_shares ds
                JOIN deeds d ON ds.deed_id = d.id
                JOIN users u ON ds.owner_user_id = u.id
                WHERE ds.owner_user_id = %s
                ORDER BY ds.created_at DESC
            """, (user_id,))

            rows = cur.fetchall()

            # Phase 7.5 FIX: Map deed_shares columns (RealDictCursor returns dicts)
            shared_deeds = []
            for row in rows:
                # RealDictCursor returns dictionaries, not tuples
                expires_at = row.get('expires_at') if isinstance(row, dict) else row[6]
                created_at = row.get('created_at') if isinstance(row, dict) else row[7]
                updated_at = row.get('updated_at') if isinstance(row, dict) else row[8]

                shared_deeds.append({
                    "id": row.get('id') if isinstance(row, dict) else row[0],
                    "deed_id": row.get('deed_id') if isinstance(row, dict) else row[1],
                    "shared_by_id": row.get('owner_user_id') if isinstance(row, dict) else row[2],
                    "shared_with_email": row.get('recipient_email') if isinstance(row, dict) else row[3],
                    "status": row.get('status') if isinstance(row, dict) else row[4],
                    "message": f"Shared via link - expires {expires_at.strftime('%Y-%m-%d') if expires_at else 'never'}",
                    "share_type": "review",
                    "date": created_at.isoformat() if created_at else "",
                    "updated_at": updated_at.isoformat() if updated_at else "",
                    "property": (row.get('property_address') if isinstance(row, dict) else row[9]) or "",
                    "type": (row.get('deed_type') if isinstance(row, dict) else row[10]) or "",
                    "shared_by": (row.get('owner_name') if isinstance(row, dict) else row[11]) or "Unknown User",
                    "approval_token": row.get('token') if isinstance(row, dict) else row[5]
                })

            print(f"[Phase 7.5] ✅ Fetched {len(shared_deeds)} shared deeds for user {user_id}")
            return shared_deeds

    except Exception as e:
        db.conn.rollback()  # Phase 14-B: Prevent transaction cascade failures
        print(f"Error fetching shared deeds: {e}")
        # Graceful degradation: return empty array if table doesn't exist yet
        if "does not exist" in str(e):
            return []
        raise HTTPException(status_code=500, detail=f"Failed to fetch shared deeds: {str(e)}")

@router.post("/shared-deeds/{shared_deed_id}/resend")
def resend_approval_email(shared_deed_id: int, user_id: int = Depends(get_current_user_id)):
    """Resend the approval reminder email with expiration extension"""
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection not available")

    try:
        from datetime import timezone
        from utils.notifications import send_share_reminder_with_reason

        with db.conn.cursor() as cur:
            # Get the share details
            cur.execute("""
                SELECT ds.id, ds.token, ds.recipient_email, ds.status, ds.expires_at,
                       d.deed_type, d.property_address, d.apn,
                       u.email as owner_email, u.full_name as owner_name
                FROM deed_shares ds
                JOIN deeds d ON ds.deed_id = d.id
                JOIN users u ON ds.owner_user_id = u.id
                WHERE ds.id = %s AND ds.owner_user_id = %s
            """, (shared_deed_id, user_id))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Share not found")

            # Extract data
            if isinstance(row, dict):
                share_id = row.get('id')
                token = row.get('token')
                recipient_email = row.get('recipient_email')
                status = row.get('status')
                expires_at = row.get('expires_at')
                deed_type = row.get('deed_type')
                property_address = row.get('property_address')
                owner_name = row.get('owner_name') or 'DeedPro User'
            else:
                share_id, token, recipient_email, status, expires_at = row[0], row[1], row[2], row[3], row[4]
                deed_type, property_address = row[5], row[6]
                owner_name = row[9] or 'DeedPro User'

            # Check if can be resent
            if status in ('approved', 'rejected', 'revoked'):
                raise HTTPException(status_code=400, detail=f"Cannot resend - share is {status}")

            # Check if expired and extend expiration by 24 hours
            now = datetime.now(timezone.utc)
            if expires_at < now:
                new_expiry = now + timedelta(hours=24)
                cur.execute("""
                    UPDATE deed_shares
                    SET expires_at = %s, updated_at = NOW()
                    WHERE id = %s
                """, (new_expiry, share_id))
                expires_at = new_expiry

            # Build approval URL
            app_url = os.getenv('FRONTEND_URL', 'https://deedpro-frontend-new.vercel.app')
            approval_url = f"{app_url}/approve/{token}"

            # Calculate hours remaining
            hours_remaining = max(0, int((expires_at - now).total_seconds() / 3600))

            # Send reminder email (E1: branded template via the one transport)
            email_sent, email_error = send_share_reminder_with_reason(
                recipient_email=recipient_email,
                # deed_shares stores no recipient name; template greets generically.
                recipient_name="",
                owner_name=owner_name,
                deed_type=deed_type,
                property_address=property_address,
                share_link=approval_url,
                hours_remaining=hours_remaining
            )

            db.conn.commit()

            if email_sent:
                print(f"[Sharing] ✅ Reminder sent for share {share_id}")
            else:
                print(f"[Sharing] ⚠️ Reminder email failed for share {share_id}: {email_error}")

            return {
                "success": True,
                "message": "Reminder sent" if email_sent else "Reminder recorded but email failed",
                "email_sent": email_sent,
                "email_error": email_error,
                "expires_at": expires_at.isoformat()
            }

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()
        print(f"[Sharing] ❌ Resend error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _revoke_deed_share(shared_deed_id: int, user_id: int):
    """Revoke a share in deed_shares (the live sharing table) with owner check.

    T3 fix: the previous implementation targeted the legacy shared_deeds
    table, which the live sharing stack never writes — revoke silently
    no-op'd. Every other sharing endpoint uses deed_shares.
    """
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection not available")
    try:
        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT owner_user_id FROM deed_shares
                WHERE id = %s
            """, (shared_deed_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Shared deed not found")
            if row[0] != user_id:
                raise HTTPException(status_code=403, detail="You don't have permission to revoke this share")

            cur.execute("""
                UPDATE deed_shares
                SET status = 'revoked', updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (shared_deed_id,))
            db.conn.commit()

        return {
            "success": True,
            "message": f"Access to shared deed {shared_deed_id} has been revoked"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()
        print(f"Error revoking shared deed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to revoke shared deed: {str(e)}")

@router.delete("/shared-deeds/{shared_deed_id}")
def revoke_shared_deed(shared_deed_id: int, user_id: int = Depends(get_current_user_id)):
    """Revoke access to a shared deed."""
    return _revoke_deed_share(shared_deed_id, user_id)

@router.post("/shared-deeds/{shared_deed_id}/revoke")
def revoke_shared_deed_post(shared_deed_id: int, user_id: int = Depends(get_current_user_id)):
    """Revoke access to a shared deed (the route the Shared Deeds UI calls)."""
    return _revoke_deed_share(shared_deed_id, user_id)

@router.get("/shared-deeds/{shared_deed_id}/feedback")
def get_shared_deed_feedback(shared_deed_id: int, user_id: int = Depends(get_current_user_id)):
    """Return recipient feedback for a share (owner-only). Called by the
    Shared Deeds UI; feedback is written by the public rejection flow."""
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection not available")
    try:
        with db.conn.cursor() as cur:
            cur.execute("""
                SELECT feedback, feedback_at, feedback_by, owner_user_id
                FROM deed_shares
                WHERE id = %s
            """, (shared_deed_id,))
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Shared deed not found")
        # `owner_user_id` destructured to the string 'owner_user_id', so
        # `owner_user_id != user_id` was ALWAYS true: the deed's own owner
        # got a permanent 403 reading feedback on her own shared deed.
        feedback = row['feedback']
        feedback_at = row['feedback_at']
        feedback_by = row['feedback_by']
        owner_user_id = row['owner_user_id']
        if owner_user_id != user_id:
            raise HTTPException(status_code=403, detail="You don't have permission to view this feedback")
        return {
            "feedback": feedback or "",
            "feedback_at": feedback_at.isoformat() if feedback_at else None,
            "feedback_by": feedback_by,
        }
    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()
        print(f"Error fetching share feedback: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch feedback")

# Public approval endpoint (for recipients)
@router.get("/approve/{approval_token}")
def view_shared_deed(approval_token: str):
    """Public endpoint for recipients to view shared deed - Enhanced with view tracking"""
    approval_token = _valid_token_or_404(approval_token)
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        from datetime import datetime, timezone

        with db.conn.cursor() as cur:
            # Get share details with deed info (including county)
            cur.execute("""
                SELECT
                    ds.id, ds.deed_id, ds.owner_user_id, ds.recipient_email,
                    ds.status, ds.expires_at, ds.created_at, ds.viewed_at,
                    d.deed_type, d.property_address, d.apn, d.grantor_name, d.grantee_name,
                    d.county, d.pdf_url,
                    u.full_name as owner_name, u.email as owner_email
                FROM deed_shares ds
                JOIN deeds d ON d.id = ds.deed_id
                LEFT JOIN users u ON u.id = ds.owner_user_id
                WHERE ds.token = %s
            """, (approval_token,))

            share = cur.fetchone()

            if not share:
                raise HTTPException(status_code=404, detail="This approval link is invalid or does not exist")

            # Extract data (handle both dict and tuple)
            if isinstance(share, dict):
                share_id = share.get('id')
                deed_id = share.get('deed_id')
                owner_id = share.get('owner_user_id')
                recipient_email = share.get('recipient_email')
                status = share.get('status')
                expires_at = share.get('expires_at')
                viewed_at = share.get('viewed_at')
                deed_type = share.get('deed_type')
                property_address = share.get('property_address')
                apn = share.get('apn')
                grantor_name = share.get('grantor_name')
                grantee_name = share.get('grantee_name')
                county = share.get('county')
                pdf_url = share.get('pdf_url')
                owner_name = share.get('owner_name') or "DeedPro User"
            else:
                share_id = share[0]
                deed_id = share[1]
                owner_id = share[2]
                recipient_email = share[3]
                status = share[4]
                expires_at = share[5]
                viewed_at = share[7] if len(share) > 7 else None
                deed_type = share[8] if len(share) > 8 else None
                property_address = share[9] if len(share) > 9 else None
                apn = share[10] if len(share) > 10 else None
                grantor_name = share[11] if len(share) > 11 else None
                grantee_name = share[12] if len(share) > 12 else None
                county = share[13] if len(share) > 13 else None
                pdf_url = share[14] if len(share) > 14 else None
                owner_name = share[15] if len(share) > 15 else "DeedPro User"

            # Check if expired
            now = datetime.now(timezone.utc)
            is_expired = expires_at < now if expires_at else False

            # Update status to expired if needed
            if is_expired and status == 'sent':
                cur.execute("UPDATE deed_shares SET status = 'expired', updated_at = NOW() WHERE id = %s", (share_id,))
                db.conn.commit()
                raise HTTPException(status_code=410, detail="This approval link has expired")

            # Track first view (only if status is still 'sent')
            if status == 'sent' and not viewed_at:
                try:
                    cur.execute("""
                        UPDATE deed_shares
                        SET status = 'viewed', viewed_at = NOW(), updated_at = NOW()
                        WHERE id = %s AND status = 'sent'
                    """, (share_id,))
                    db.conn.commit()
                    status = 'viewed'
                    print(f"[Sharing] ✅ First view tracked for share {share_id}")
                except Exception as view_err:
                    # RED-H1.2b: rollback FIRST. Without it a failed statement leaves
                    # the shared transaction aborted and Postgres refuses every later
                    # query on that connection — one bad request breaks the next
                    # user's. Eight handlers in this file already did this; seven did
                    # not, and the half-applied pattern is what made it invisible.
                    try:
                        db.conn.rollback()
                    except Exception:
                        pass
                    # Non-blocking - viewed_at column may not exist
                    print(f"[Sharing] ⚠️ Could not track view: {view_err}")

            can_approve = not is_expired and status in ('sent', 'viewed')

            deed_data = {
                "deed_id": deed_id,
                "deed_type": deed_type,
                "property_address": property_address,
                "apn": apn,
                "county": county,
                "grantors": grantor_name,
                "grantees": grantee_name,
                "owner_name": owner_name,
                "message": f"Please review this {deed_type}",
                "expires_at": expires_at.isoformat() if expires_at else None,
                "can_approve": can_approve,
                "status": status,
                "pdf_url": pdf_url,
            }

            print(f"[Sharing] ✅ Approval link accessed: share_id={share_id}, status={status}, can_approve={can_approve}")

            return deed_data

    except HTTPException:
        raise
    except Exception as e:
        db.conn.rollback()
        print(f"[Sharing] ❌ Error loading shared deed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load shared deed: {str(e)}")

@router.post("/approve/{approval_token}")
def submit_approval_response(approval_token: str, response: ApprovalResponse):
    """Submit approval or rejection response - REJECTION BUNDLE: Enhanced with feedback, email, and notifications"""
    approval_token = _valid_token_or_404(approval_token)
    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        from datetime import datetime, timezone

        with db.conn.cursor() as cur:
            # Get share details WITH property address and owner info
            cur.execute("""
                SELECT ds.id, ds.status, ds.expires_at, ds.owner_user_id, ds.deed_id,
                       ds.recipient_email, d.property_address, u.email as owner_email,
                       u.full_name as owner_name
                FROM deed_shares ds
                JOIN deeds d ON d.id = ds.deed_id
                LEFT JOIN users u ON u.id = ds.owner_user_id
                WHERE ds.token = %s
            """, (approval_token,))

            share = cur.fetchone()

            if not share:
                raise HTTPException(status_code=404, detail="Invalid approval link")

            # Extract data (handle both dict and tuple)
            if isinstance(share, dict):
                share_id = share.get('id')
                current_status = share.get('status')
                expires_at = share.get('expires_at')
                owner_id = share.get('owner_user_id')
                deed_id = share.get('deed_id')
                recipient_email = share.get('recipient_email')
                property_address = share.get('property_address')
                owner_email = share.get('owner_email')
                owner_name = share.get('owner_name')
            else:
                share_id = share[0]
                current_status = share[1]
                expires_at = share[2]
                owner_id = share[3]
                deed_id = share[4]
                recipient_email = share[5]
                property_address = share[6]
                owner_email = share[7]
                owner_name = share[8]
            owner_name = owner_name or "there"

            # Check if expired
            now = datetime.now(timezone.utc)
            is_expired = expires_at < now if expires_at else False

            if is_expired:
                raise HTTPException(status_code=410, detail="This approval link has expired")

            # Allow approval from 'sent' or 'viewed' status
            if current_status not in ('sent', 'viewed'):
                raise HTTPException(status_code=409, detail=f"This deed has already been {current_status}")

            # Get additional details for email (deed_type)
            cur.execute("SELECT deed_type FROM deeds WHERE id = %s", (deed_id,))
            deed_row = cur.fetchone()
            deed_type = deed_row[0] if deed_row else "deed"

            # APPROVAL PATH - Enhanced with email notification
            if response.approved:
                cur.execute("""
                    UPDATE deed_shares
                    SET status = 'approved', updated_at = NOW()
                    WHERE id = %s
                """, (share_id,))
                db.conn.commit()

                print(f"[Sharing] ✅ Deed approved: share_id={share_id}")

                # E1: the in-app record comes FIRST — an approval must be
                # unlosable regardless of email transport. Before this, the
                # approval existed only as an email; a transport failure
                # erased the event from the owner's world entirely.
                try:
                    from utils.notifications import create_notification

                    notification_id = create_notification(
                        db.conn,
                        user_id=owner_id,
                        ntype="share_approved",
                        title="Deed approved",
                        message=f"{recipient_email or 'A reviewer'} approved {property_address or 'your deed'}",
                        link=f"/shared-deeds?focus={share_id}"
                    )
                    print(f"[Sharing] ✅ Approval notification created: ID {notification_id}")
                except Exception as notif_error:
                    db.conn.rollback()
                    print(f"[Sharing] ⚠️ Approval notification error (non-blocking): {notif_error}")

                # Then the email (E1: branded template, reason surfaced)
                try:
                    from utils.notifications import send_share_approved_with_reason

                    if owner_email:
                        app_url = os.getenv('FRONTEND_URL', 'https://deedpro-frontend-new.vercel.app')
                        email_sent, email_error = send_share_approved_with_reason(
                            owner_email=owner_email,
                            owner_name=owner_name,
                            deed_type=deed_type,
                            property_address=property_address,
                            reviewer_email=recipient_email,
                            comments=(response.comments or "").strip() or None,
                            view_link=f"{app_url}/shared-deeds?focus={share_id}"
                        )
                        if email_sent:
                            print(f"[Sharing] ✅ Approval email sent to {owner_email}")
                        else:
                            print(f"[Sharing] ⚠️ Approval email not sent: {email_error}")
                except Exception as email_err:
                    print(f"[Sharing] ⚠️ Approval email error (non-blocking): {email_err}")

                return {
                    "success": True,
                    "message": "Thank you! Your approval has been recorded. The owner has been notified.",
                    "status": "approved"
                }

            # REJECTION PATH (NEW: save feedback, email owner, create notification)
            comments = (response.comments or "").strip()

            # 1. Save feedback to database
            cur.execute("""
                UPDATE deed_shares
                SET status = 'rejected',
                    feedback = %s,
                    feedback_at = NOW(),
                    feedback_by = %s,
                    updated_at = NOW()
                WHERE id = %s
            """, (comments, recipient_email, share_id))
            db.conn.commit()

            print(f"[REJECTION BUNDLE] ✅ Feedback saved: share_id={share_id}, length={len(comments)}")

            # 2. Send email notification to owner (E1: branded template,
            # reason surfaced instead of a swallowed boolean)
            try:
                from utils.notifications import send_share_rejected_with_reason

                if owner_email:
                    link = f"{os.getenv('FRONTEND_URL', 'https://deedpro-frontend-new.vercel.app')}/shared-deeds?focus={share_id}"
                    email_sent, email_error = send_share_rejected_with_reason(
                        owner_email=owner_email,
                        owner_name=owner_name,
                        deed_type=deed_type,
                        property_address=property_address,
                        reviewer_email=recipient_email or "Reviewer",
                        comments=comments,
                        view_link=link
                    )

                    if email_sent:
                        print(f"[REJECTION BUNDLE] ✅ Email sent to owner: {owner_email}")
                    else:
                        print(f"[REJECTION BUNDLE] ⚠️ Email not sent: {email_error}")
            except Exception as email_error:
                # Don't fail the request if email fails
                print(f"[REJECTION BUNDLE] ⚠️ Email error (non-blocking): {email_error}")

            # 3. Create in-app notification (best-effort)
            try:
                from utils.notifications import create_notification

                notification_id = create_notification(
                    db.conn,
                    user_id=owner_id,
                    ntype="share_rejected",
                    title="📝 Changes Requested",
                    message=f"{recipient_email or 'A reviewer'} requested changes for {property_address or 'your deed'}",
                    link=f"/shared-deeds?focus={share_id}"
                )
                print(f"[REJECTION BUNDLE] ✅ Notification created: ID {notification_id}")
            except Exception as notif_error:
                # Rollback to prevent transaction cascade failure
                db.conn.rollback()
                # Notifications table may not exist or be incompatible
                print(f"[REJECTION BUNDLE] ⚠️ Notification error (non-blocking): {notif_error}")

            return {
                "success": True,
                "message": "Thank you! Your feedback has been submitted. The owner has been notified.",
                "status": "rejected",
                "comments": comments
            }

    except HTTPException:
        raise
    except Exception as e:
        # RED-H1.2b: rollback FIRST. Without it a failed statement leaves
        # the shared transaction aborted and Postgres refuses every later
        # query on that connection — one bad request breaks the next
        # user's. Eight handlers in this file already did this; seven did
        # not, and the half-applied pattern is what made it invisible.
        try:
            db.conn.rollback()
        except Exception:
            pass
        print(f"[REJECTION BUNDLE] ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to submit approval: {str(e)}")

# PDF access for shared deed recipients
@router.get("/approve/{approval_token}/pdf")
def get_shared_deed_pdf(approval_token: str):
    """
    Get the PDF for a shared deed.
    Requires valid, non-expired token.
    """
    approval_token = _valid_token_or_404(approval_token)
    from fastapi.responses import Response
    from datetime import timezone

    if not db.conn:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        with db.conn.cursor() as cur:
            # THE FIX. This read `d.pdf_data` — a column that does not
            # exist on `deeds`.
            #
            # T2 moved the stored instrument to its own table. `deeds`
            # kept `pdf_url` and never had `pdf_data`; the only other
            # `pdf_data` in the schema belongs to `api_deeds`, a
            # different table for the partner API. So this query did not
            # return NULL — it raised UndefinedColumn, every single time,
            # and EVERY review share has been serving a 500 since T2.
            #
            # Worse than the broken feature: it runs on the SHARED
            # connection, and the handler below had no rollback. A failed
            # statement leaves the transaction aborted, and Postgres then
            # refuses every later query on that connection —
            # "current transaction is aborted". That is precisely the
            # 2026-08-01 outage, except reachable on demand by anyone
            # holding a share link. Reproduced before fixing.
            #
            # LEFT JOIN, not JOIN: a deed with no stored PDF must still
            # return its row so the pdf_url fallback and the honest 404
            # below can run. An inner join would report "Share not found"
            # for a share that plainly exists.
            cur.execute("""
                SELECT ds.status, ds.expires_at,
                       p.pdf_data, d.pdf_url, d.deed_type, d.property_address
                FROM deed_shares ds
                JOIN deeds d ON ds.deed_id = d.id
                LEFT JOIN deed_pdfs p ON p.deed_id = d.id
                WHERE ds.token = %s
            """, (approval_token,))

            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Share not found")

            # Extract data
            if isinstance(row, dict):
                status = row.get('status')
                expires_at = row.get('expires_at')
                pdf_data = row.get('pdf_data')
                pdf_url = row.get('pdf_url')
                deed_type = row.get('deed_type', 'deed')
                property_address = row.get('property_address', 'property')
            else:
                status, expires_at, pdf_data, pdf_url, deed_type, property_address = row[0], row[1], row[2], row[3], row[4] or 'deed', row[5] or 'property'

            # Check expiration
            now = datetime.now(timezone.utc)
            if expires_at and expires_at < now:
                raise HTTPException(status_code=410, detail="This link has expired")

            # Check status (allow viewing even if rejected, but not if revoked)
            if status == 'revoked':
                raise HTTPException(status_code=403, detail="Access has been revoked")

            # Return PDF
            if pdf_data:
                # Clean filename
                safe_filename = f"{deed_type}_{property_address}".replace(' ', '_').replace('/', '-')[:50]
                return Response(
                    content=pdf_data,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f'inline; filename="{safe_filename}.pdf"'
                    }
                )
            elif pdf_url:
                # Redirect to PDF URL if no embedded data
                from fastapi.responses import RedirectResponse
                return RedirectResponse(url=pdf_url)
            else:
                raise HTTPException(status_code=404, detail="PDF not available for this deed")

    except HTTPException:
        raise
    except Exception as e:
        # RED-H1.2b: rollback FIRST. Without it a failed statement leaves
        # the shared transaction aborted and Postgres refuses every later
        # query on that connection — one bad request breaks the next
        # user's. Eight handlers in this file already did this; seven did
        # not, and the half-applied pattern is what made it invisible.
        try:
            db.conn.rollback()
        except Exception:
            pass
        print(f"[Sharing] ❌ PDF access error: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve PDF")
