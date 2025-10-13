from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from backend.auth import get_current_user_id
from backend.database import get_db_connection

router = APIRouter()

@router.get("/{share_id}/feedback")
def get_feedback(share_id: int, user_id: int = Depends(get_current_user_id)):
    """Return feedback text for a given share id, only to deed owner or the recipient."""
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT ds.feedback, ds.feedback_at, ds.feedback_by, d.user_id AS owner_user_id, ds.shared_with_email
              FROM deed_shares ds
              JOIN deeds d ON d.id = ds.deed_id
             WHERE ds.id = %s
        """, (share_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Share not found")
        feedback, feedback_at, feedback_by, owner_user_id, recipient_email = row
        # Only owner (user_id) can read; recipients should view via token page
        if user_id != owner_user_id:
            raise HTTPException(status_code=403, detail="Forbidden")
        return {
            "feedback": feedback,
            "feedback_at": feedback_at.isoformat() if feedback_at else None,
            "feedback_by": feedback_by
        }
