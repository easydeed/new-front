# backend/routers/notifications.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os, json
from auth import get_current_user_id  # Phase 7.5: Absolute import for Render compatibility
from database import get_db_connection  # Phase 7.5: Absolute import for Render compatibility

router = APIRouter()

class NotificationOut(BaseModel):
    id: int
    type: str
    title: str
    message: str
    severity: str
    payload: Optional[Dict[str, Any]] = None
    created_at: str
    read: bool = False

def feature_enabled() -> bool:
    return os.getenv("NOTIFICATIONS_ENABLED", "false").lower() == "true"

@router.get("/", response_model=List[NotificationOut])
def list_notifications(user_id: int = Depends(get_current_user_id)):
    if not feature_enabled():
        return []
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT n.id, n.type, n.title, n.message, n.severity, n.payload, n.created_at,
                   COALESCE(un.read, false) as read
            FROM user_notifications un
            JOIN notifications n ON n.id = un.notification_id
            WHERE un.user_id = %s
            ORDER BY n.created_at DESC
            LIMIT 100
            """,
            (user_id,),
        )
        rows = cur.fetchall()
    result = []
    for r in rows:
        result.append(
            {
                "id": r[0],
                "type": r[1],
                "title": r[2],
                "message": r[3],
                "severity": r[4],
                "payload": r[5],
                "created_at": r[6].isoformat() if r[6] else None,
                "read": bool(r[7]),
            }
        )
    return result

class MarkReadIn(BaseModel):
    ids: List[int]

@router.post("/mark-read")
def mark_read(body: MarkReadIn, user_id: int = Depends(get_current_user_id)):
    if not feature_enabled():
        return {"success": False, "message": "Notifications disabled"}
    if not body.ids:
        return {"success": True}
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE user_notifications
               SET read = TRUE, read_at = NOW()
             WHERE user_id = %s
               AND notification_id = ANY(%s)
            """,
            (user_id, body.ids),
        )
        conn.commit()
    return {"success": True}

@router.get("/unread-count")
def unread_count(user_id: int = Depends(get_current_user_id)):
    if not feature_enabled():
        return {"count": 0}
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT COUNT(*)
              FROM user_notifications
             WHERE user_id = %s AND read = FALSE
            """,
            (user_id,),
        )
        c = cur.fetchone()[0]
    return {"count": int(c)}

def create_notification(conn, title: str, message: str, severity: str, user_ids: List[int], ntype: str = "info", payload: Optional[Dict[str, Any]] = None, created_by: Optional[int] = None):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO notifications (type, title, message, severity, payload, created_by_user_id)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (ntype, title, message, severity, json.dumps(payload) if payload is not None else None, created_by),
        )
        nid = cur.fetchone()[0]
        for uid in user_ids:
            cur.execute(
                "INSERT INTO user_notifications (notification_id, user_id) VALUES (%s, %s)",
                (nid, uid),
            )
    conn.commit()
    return nid
