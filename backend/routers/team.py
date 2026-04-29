import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from services.auth import (
    require_role, hash_password, create_invite_token,
    sanitize_string, validate_email,
)
from services.database import get_all_users, get_user_by_email, create_user, update_user

router = APIRouter(prefix="/api/team", tags=["team"])


class CreateAnalystRequest(BaseModel):
    name: str
    email: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        v = sanitize_string(v.strip())
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, v):
        try:
            return validate_email(v)
        except ValueError as e:
            raise ValueError(str(e))


@router.get("")
def list_team(user: dict = Depends(require_role("manager"))):
    users = get_all_users()
    result = []
    for u in users:
        last_login = u.get("last_login")
        if last_login:
            try:
                dt = datetime.strptime(last_login, "%Y-%m-%d %H:%M:%S")
                last_login = dt.strftime("%b %d, %Y")
            except ValueError:
                pass
        result.append({
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "role": u["role"],
            "initials": u.get("initials", ""),
            "status": u.get("status", "active"),
            "lastLogin": last_login,
        })
    return result


@router.post("")
def create_team_member(body: CreateAnalystRequest, user: dict = Depends(require_role("manager"))):
    existing = get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already exists")
    initials = "".join(w[0].upper() for w in body.name.split()[:2])
    temp_password = secrets.token_urlsafe(16)
    user_id = create_user({
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(temp_password),
        "role": "analyst",
        "initials": initials,
    })
    invite_token = create_invite_token(body.email)
    return {
        "id": user_id,
        "name": body.name,
        "email": body.email,
        "role": "analyst",
        "initials": initials,
        "status": "active",
        "inviteLink": f"/set-password?token={invite_token}&email={body.email}",
    }


class UpdateMemberRequest(BaseModel):
    name: str | None = None
    status: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v and v not in ("active", "inactive"):
            raise ValueError("Status must be 'active' or 'inactive'")
        return v


@router.patch("/{user_id}")
def update_team_member(user_id: int, body: UpdateMemberRequest, user: dict = Depends(require_role("manager"))):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_user(user_id, updates)
    return {"success": True}
