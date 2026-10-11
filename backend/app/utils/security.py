from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
import bleach
import re
from ..config import settings


# --- Password ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


# --- JWT Token ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str):
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


# --- Input Validation ---
def sanitize_string(text: str, max_length: int = 255) -> str:
    """XSS himoya (SQL injection SQLAlchemy parametrlangan so'rovlar bilan oldini oladi)"""
    if not text:
        return ""
    # HTML taglarini tozalash
    cleaned = bleach.clean(text, tags=[], strip=True)
    # Uzunlikni cheklash
    return cleaned[:max_length].strip()


def validate_password_strength(password: str) -> tuple[bool, str]:
    """Parol kuchliligi tekshirish"""
    if len(password) < 8:
        return False, "Parol kamida 8 ta belgi bo'lishi kerak!"
    if not re.search(r"[A-Z]", password):
        return False, "Parolda kamida 1 ta katta harf bo'lishi kerak!"
    if not re.search(r"[a-z]", password):
        return False, "Parolda kamida 1 ta kichik harf bo'lishi kerak!"
    if not re.search(r"\d", password):
        return False, "Parolda kamida 1 ta raqam bo'lishi kerak!"
    return True, "OK"


def validate_email_format(email: str) -> bool:
    """Email format tekshirish"""
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return bool(re.match(pattern, email))


def validate_username(username: str) -> tuple[bool, str]:
    """Username tekshirish"""
    if len(username) < 3:
        return False, "Username kamida 3 ta belgi!"
    if len(username) > 30:
        return False, "Username ko'pi bilan 30 ta belgi!"
    if not re.match(r"^[a-zA-Z0-9_]+$", username):
        return False, "Username faqat harf, raqam va _ bo'lishi mumkin!"
    return True, "OK"
