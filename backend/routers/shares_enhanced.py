# backend/routers/shares_enhanced.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import os, json
from auth import get_current_user_id  # Phase 7.5: Absolute import for Render compatibility
from database import get_db_connection  # Phase 7.5: Absolute import for Render compatibility
from services.email_service import send_email  # Phase 7.5: Absolute import for Render compatibility

router = APIRouter()

def feature_enabled() -> bool:
    return os.getenv("SHARING_ENABLED", "false").lower() == "true"

class ShareIn(BaseModel):
    recipient_email: EmailStr
    message: Optional[str] = None
    expires_days: Optional[int] = 14

@router.get("/available")
def list_available_deeds(user_id: int = Depends(get_current_user_id)):
    if not feature_enabled():
        return {"deeds": []}
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, deed_type, property_address, status, created_at
              FROM deeds
             WHERE user_id = %s
             ORDER BY created_at DESC
             LIMIT 200
            """,
            (user_id,),
        )
        rows = cur.fetchall()
    deeds = []
    for r in rows:
        deeds.append(
            {
                "id": r[0],
                "deed_type": r[1],
                "property_address": r[2],
                "status": r[3],
                "created_at": r[4].isoformat() if r[4] else None,
            }
        )
    return {"deeds": deeds}

@router.post("/{deed_id}/share")
def share_deed(deed_id: int, body: ShareIn, user_id: int = Depends(get_current_user_id)):
    if not feature_enabled():
        raise HTTPException(status_code=403, detail="Sharing disabled")
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("SELECT id FROM deeds WHERE id = %s AND user_id = %s", (deed_id, user_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Deed not found")
        cur.execute(
            """
            INSERT INTO deed_shares (deed_id, owner_user_id, recipient_email, expires_at)
            VALUES (%s, %s, %s, NOW() + (%s || ' days')::interval)
            RETURNING id, token
            """,
            (deed_id, user_id, body.recipient_email, body.expires_days or 14),
        )
        res = cur.fetchone()
        sid, token = res[0], res[1]
        conn.commit()
    share_url = f"{os.getenv('FRONTEND_URL', 'https://app.example.com')}/shared/{sid}?token={token}"
    html = "<p>You have been granted access to view a deed.</p><p><a href=\"%s\">Open the deed</a></p>" % share_url
    send_email(to=body.recipient_email, subject="A deed has been shared with you", html=html)
    return {"id": sid, "share_url": share_url}

class ResendIn(BaseModel):
    id: int

@router.post("/shares/resend")
def resend_share(body: ResendIn, user_id: int = Depends(get_current_user_id)):
    if not feature_enabled():
        raise HTTPException(status_code=403, detail="Sharing disabled")
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, recipient_email, token FROM deed_shares WHERE id = %s AND owner_user_id = %s",
            (body.id, user_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Share not found")
        sid, email, token = row[0], row[1], row[2]
    share_url = f"{os.getenv('FRONTEND_URL', 'https://app.example.com')}/shared/{sid}?token={token}"
    html = "<p>Reminder: access your deed here: <a href=\"%s\">%s</a></p>" % (share_url, share_url)
    send_email(to=email, subject="Reminder: deed shared with you", html=html)
    return {"success": True}
