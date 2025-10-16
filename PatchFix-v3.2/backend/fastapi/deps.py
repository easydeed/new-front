
from typing import Optional
from fastapi import Depends, HTTPException, status
from pydantic import BaseModel

# Replace this with your real auth dependency.
class CurrentUser(BaseModel):
    id: str
    organization_id: Optional[str] = None
    email: Optional[str] = None

def get_current_user() -> CurrentUser:
    # TODO: wire to your JWT/session
    # For now, return a dummy user to keep local dev working.
    return CurrentUser(id="dev-user", organization_id="org-dev", email="dev@example.com")
