from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import random
import threading
from ..database import get_db
from ..models.otp import OTPCode
from ..models.user import User
from ..utils.security import get_password_hash, validate_password_strength
from ..services.email_service import send_email

router = APIRouter()

# --- Schemalar ---
class SendOTPRequest(BaseModel):
    email: str

class VerifyOTPRequest(BaseModel):
    email: str
    code: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str
    confirm_password: str

# --- OTP yuborish ---
@router.post("/send-otp")
def send_otp(data: SendOTPRequest, db: Session = Depends(get_db)):
    # User borligini tekshirish
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Bu email bilan foydalanuvchi topilmadi!")

    # Eski OTPlarni o'chirish
    db.query(OTPCode).filter(
        OTPCode.phone_or_email == data.email,
        OTPCode.is_used == False
    ).delete()
    db.commit()

    # 6 xonali kod yaratish
    code = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    otp = OTPCode(
        phone_or_email=data.email,
        code=code,
        expires_at=expires_at
    )
    db.add(otp)
    db.commit()

    # Email yuborish
    subject = "🔐 Parol tiklash kodi — Finance App"
    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #14213D; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: #1a2a4a; border-radius: 16px; padding: 40px; border: 2px solid #FCA311;">
            <h1 style="color: #FCA311; text-align: center;">💰 Finance App</h1>
            <h2 style="color: #E5E5E5; text-align: center;">Parol tiklash</h2>
            <p style="color: #E5E5E5;">Salom <b>{user.full_name}</b>!</p>
            <p style="color: #E5E5E5;">Parolni tiklash uchun quyidagi kodni kiriting:</p>

            <div style="background: #14213D; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; border: 2px solid #FCA311;">
                <p style="color: #FCA311; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0;">
                    {code}
                </p>
            </div>

            <p style="color: #E5E5E5; opacity: 0.7;">⏰ Bu kod <b>5 daqiqa</b> ichida amal qiladi.</p>
            <p style="color: #E5E5E5; opacity: 0.7;">Agar siz so'rov yubormagan bo'lsangiz, bu emailni e'tiborsiz qoldiring.</p>

            <p style="color: #E5E5E5; opacity: 0.5; text-align: center; font-size: 12px; margin-top: 20px;">
                © 2026 Finance App
            </p>
        </div>
    </body>
    </html>
    """

    threading.Thread(
        target=send_email,
        args=(data.email, subject, html)
    ).start()

    return {"message": f"Kod {data.email} ga yuborildi!", "expires_in": "5 daqiqa"}


# --- OTP tekshirish ---
@router.post("/verify-otp")
def verify_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    otp = db.query(OTPCode).filter(
        OTPCode.phone_or_email == data.email,
        OTPCode.code == data.code,
        OTPCode.is_used == False
    ).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Kod noto'g'ri!")

    if datetime.utcnow() > otp.expires_at:
        raise HTTPException(status_code=400, detail="Kod muddati o'tgan! Qayta yuboring.")

    return {"message": "Kod to'g'ri!", "verified": True}


# --- Parolni tiklash ---
@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    # OTP tekshirish
    otp = db.query(OTPCode).filter(
        OTPCode.phone_or_email == data.email,
        OTPCode.code == data.code,
        OTPCode.is_used == False
    ).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Kod noto'g'ri!")

    if datetime.utcnow() > otp.expires_at:
        raise HTTPException(status_code=400, detail="Kod muddati o'tgan!")

    # Parollar mos kelishini tekshirish
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Parollar mos kelmadi!")

    # Parol kuchliligi
    is_strong, msg = validate_password_strength(data.new_password)
    if not is_strong:
        raise HTTPException(status_code=400, detail=msg)

    # Userni topish
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi!")

    # Parolni yangilash
    user.hashed_password = get_password_hash(data.new_password)

    # OTPni ishlatilgan deb belgilash
    otp.is_used = True
    db.commit()

    return {"message": "Parol muvaffaqiyatli yangilandi! Endi kiring."}