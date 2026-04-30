import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator
from services.auth import (
    verify_password, create_token, get_current_user,
    create_invite_token, create_reset_token,
    verify_invite_token, verify_reset_token,
    hash_password, sanitize_string, validate_email, validate_password, verify_token,
)
from services.database import get_user_by_email, update_user_last_login, set_user_password, update_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

AVATAR_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "users", "profile_picture")


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, v):
        try:
            return validate_email(v)
        except ValueError as e:
            raise ValueError(str(e))


class SetPasswordRequest(BaseModel):
    token: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password_field(cls, v):
        try:
            return validate_password(v)
        except ValueError as e:
            raise ValueError(str(e))


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email_field(cls, v):
        try:
            return validate_email(v)
        except ValueError as e:
            raise ValueError(str(e))


@router.post("/login")
def login(body: LoginRequest):
    user = get_user_by_email(body.email)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("status") == "inactive":
        raise HTTPException(status_code=403, detail="Account is deactivated")
    update_user_last_login(body.email)
    token = create_token({
        "sub": user["email"],
        "role": user["role"],
        "name": user["name"],
        "initials": user["initials"],
        "id": user["id"],
    })
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "initials": user["initials"],
            "email": user["email"],
            "role": user["role"],
        },
    }


@router.get("/me")
def get_me(user: dict = Depends(get_current_user)):
    db_user = get_user_by_email(user["sub"])
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "id": db_user["id"],
        "name": db_user["name"],
        "initials": db_user["initials"],
        "email": db_user["email"],
        "role": db_user["role"],
        "avatar": f"/api/auth/avatar/{db_user['id']}" if db_user.get("avatar") else None,
    }


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    current_password: str | None = None
    new_password: str | None = None


@router.put("/me")
def update_profile(body: UpdateProfileRequest, user: dict = Depends(get_current_user)):
    db_user = get_user_by_email(user["sub"])
    if not db_user:
        raise HTTPException(status_code=401, detail="User not found")
    updates = {}
    if body.name and body.name.strip():
        updates["name"] = sanitize_string(body.name.strip())
    if body.new_password:
        if not body.current_password:
            raise HTTPException(status_code=400, detail="Current password required")
        if not verify_password(body.current_password, db_user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        if len(body.new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        updates["password_hash"] = hash_password(body.new_password)
    if not updates:
        raise HTTPException(status_code=400, detail="No changes to apply")
    if "name" in updates:
        update_user(db_user["id"], updates)
    if "password_hash" in updates:
        set_user_password(db_user["email"], updates["password_hash"])
    return {"success": True, "name": updates.get("name", db_user["name"])}


@router.post("/set-password")
def set_password(body: SetPasswordRequest):
    email = verify_reset_token(body.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    set_user_password(email, hash_password(body.password))
    return {"success": True}


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest):
    user = get_user_by_email(body.email)
    if not user:
        return {"success": True, "message": "If an account exists, a reset link will be sent"}
    token = create_reset_token(body.email)
    return {
        "success": True,
        "message": "If an account exists, a reset link will be sent",
        "resetLink": f"/set-password?token={token}&email={body.email}",
    }


@router.post("/avatar")
async def upload_avatar(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image must be under 5MB")

    user_dir = os.path.join(AVATAR_DIR, str(user["id"]))
    os.makedirs(user_dir, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png"
    if ext not in ("png", "jpg", "jpeg", "gif", "webp"):
        ext = "png"
    file_path = os.path.join(user_dir, f"avatar.{ext}")

    # Remove old avatars
    for f in os.listdir(user_dir):
        if f.startswith("avatar."):
            os.remove(os.path.join(user_dir, f))

    with open(file_path, "wb") as f:
        f.write(content)

    update_user(user["id"], {"avatar": file_path})
    return {"success": True, "avatar": f"/api/auth/avatar/{user['id']}"}


@router.get("/avatar/{user_id}")
def get_avatar(user_id: int, token: str = ""):
    if not verify_token(token):
        raise HTTPException(status_code=401, detail="Invalid token")
    user_dir = os.path.join(AVATAR_DIR, str(user_id))
    if os.path.isdir(user_dir):
        for f in os.listdir(user_dir):
            if f.startswith("avatar."):
                file_path = os.path.join(user_dir, f)
                ext = f.rsplit(".", 1)[-1]
                media = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp"}.get(f".{ext}", "image/png")
                return FileResponse(file_path, media_type=media)
    raise HTTPException(status_code=404, detail="Avatar not found")
