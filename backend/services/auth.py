import os
import re
import html
from datetime import datetime, timedelta, timezone
import bcrypt as _bcrypt
from jose import JWTError, jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = os.getenv("JWT_SECRET", "portline-demo-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
INVITE_TOKEN_EXPIRE_HOURS = 48

security = HTTPBearer()


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_invite_token(email: str) -> str:
    return create_token({"sub": email, "type": "invite"})


def create_reset_token(email: str) -> str:
    return create_token({"sub": email, "type": "reset"})


def verify_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def verify_invite_token(token: str) -> str | None:
    payload = verify_token(token)
    if payload and payload.get("type") == "invite":
        return payload.get("sub")
    return None


def verify_reset_token(token: str) -> str | None:
    payload = verify_token(token)
    if payload and payload.get("type") in ("invite", "reset"):
        return payload.get("sub")
    return None


def sanitize_string(value: str, max_length: int = 200) -> str:
    cleaned = html.escape(value.strip(), quote=True)
    return cleaned[:max_length]


def validate_email(email: str) -> str:
    email = email.strip().lower()
    if len(email) > 254:
        raise ValueError("Email too long")
    if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
        raise ValueError("Invalid email format")
    return email


def validate_password(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(password) > 128:
        raise ValueError("Password too long")
    return password


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = verify_token(credentials.credentials)
    if not payload or payload.get("type") in ("invite", "reset"):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload


def require_role(role: str):
    async def _check(user: dict = Depends(get_current_user)):
        user_role = user.get("role")
        if user_role == "admin":
            return user
        if user_role != role:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _check
