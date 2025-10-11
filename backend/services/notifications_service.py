# backend/services/notifications.py
from typing import List, Optional, Dict, Any
import json
from ..database import get_db_connection

def notify_users(title: str, message: str, user_ids: List[int], severity: str = "info", payload: Optional[Dict[str, Any]] = None):
    conn = get_db_connection()
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO notifications (type, title, message, severity, payload) VALUES (%s,%s,%s,%s,%s) RETURNING id",
            ("info", title, message, severity, json.dumps(payload) if payload is not None else None),
        )
        nid = cur.fetchone()[0]
        for uid in user_ids:
            cur.execute("INSERT INTO user_notifications (notification_id, user_id) VALUES (%s,%s)", (nid, uid))
        conn.commit()
    return nid
