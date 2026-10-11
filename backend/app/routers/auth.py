import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
import httpx
import os
from ..database import get_db
from ..models.user import User
from ..utils.security import verify_password, get_password_hash, create_access_token
from ..config import settings
from ..services.email_service import send_welcome_email
from ..middleware.rate_limit import limiter
import threading
from ..utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    sanitize_string,
    validate_password_strength,
    validate_email_format,
    validate_username,
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Upload papka yaratish
UPLOAD_DIR = "uploads/avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_AVATAR_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}
MAX_AVATAR_SIZE = 5 * 1024 * 1024  # 5 MB


# --- Schemalar ---
class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: str = ""


class UserResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: str
    is_admin: bool
    avatar: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class GoogleToken(BaseModel):
    token: str


class UpdateEmail(BaseModel):
    new_email: EmailStr


class UpdatePassword(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str


class UpdateProfile(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None


# --- Current user ---
def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    from ..utils.security import verify_token

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token yaroqsiz")
    user = db.query(User).filter(User.email == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="Foydalanuvchi topilmadi")
    return user


# --- Register ---
@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")
def register(request: Request, data: UserRegister, db: Session = Depends(get_db)):
    # Email format tekshirish
    if not validate_email_format(data.email):
        raise HTTPException(status_code=400, detail="Email formati noto'g'ri!")

    # Username tekshirish
    is_valid, msg = validate_username(data.username)
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    # Parol kuchliligi
    is_strong, msg = validate_password_strength(data.password)
    if not is_strong:
        raise HTTPException(status_code=400, detail=msg)

    # Input tozalash
    full_name = sanitize_string(data.full_name, 100)
    username = sanitize_string(data.username, 30)

    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Bu email band!")
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Bu username band!")

    user = User(
        email=data.email,
        username=username,
        hashed_password=get_password_hash(data.password),
        full_name=full_name,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# --- Login ---
@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Email yoki parol xato!")
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}


# --- Google OAuth ---
@router.post("/google", response_model=Token)
async def google_login(data: GoogleToken, db: Session = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {data.token}"},
        )
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Google token yaroqsiz!")
    google_user = response.json()
    email = google_user.get("email")
    name = google_user.get("name", "")
    google_id = google_user.get("sub")
    if not email:
        raise HTTPException(status_code=400, detail="Email topilmadi!")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        username = email.split("@")[0]
        base_username = username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
        user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(google_id),
            full_name=name,
            is_verified=True,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}


# --- Me ---
@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# --- Email yangilash ---
@router.put("/update-email")
def update_email(
    data: UpdateEmail,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if db.query(User).filter(User.email == data.new_email).first():
        raise HTTPException(status_code=400, detail="Bu email band!")
    current_user.email = data.new_email
    db.commit()
    token = create_access_token({"sub": current_user.email})
    return {"message": "Email yangilandi!", "access_token": token, "user": current_user}


# --- Parol yangilash ---
@router.put("/update-password")
@limiter.limit("5/minute")
def update_password(
    request: Request,
    data: UpdatePassword,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Eski parol xato!")
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Parollar mos kelmadi!")
    is_strong, msg = validate_password_strength(data.new_password)
    if not is_strong:
        raise HTTPException(status_code=400, detail=msg)
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Parol yangilandi!"}


# --- Profil yangilash ---
@router.put("/update-profile")
def update_profile(
    data: UpdateProfile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.full_name:
        current_user.full_name = data.full_name
    if data.username:
        existing = db.query(User).filter(User.username == data.username).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="Bu username band!")
        current_user.username = data.username
    db.commit()
    db.refresh(current_user)
    return {"message": "Profil yangilandi!", "user": current_user}


# --- Avatar yuklash ---
@router.post("/upload-avatar")
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = ALLOWED_AVATAR_TYPES.get(file.content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="Faqat JPG, PNG, WEBP yoki GIF rasm yuklash mumkin!")

    contents = file.file.read()
    if len(contents) > MAX_AVATAR_SIZE:
        raise HTTPException(status_code=400, detail="Rasm hajmi 5MB dan oshmasligi kerak!")

    # Eski avatarni o'chirish
    if current_user.avatar:
        old_path = current_user.avatar.lstrip("/")
        if os.path.isfile(old_path):
            os.remove(old_path)

    filename = f"user_{current_user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = f"{UPLOAD_DIR}/{filename}"
    with open(filepath, "wb") as f:
        f.write(contents)
    current_user.avatar = f"/uploads/avatars/{filename}"
    db.commit()
    return {"message": "Rasm yuklandi!", "avatar": current_user.avatar}
