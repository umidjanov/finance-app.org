"""
SMS Webhook Router
==================
Bank SMS larini qabul qiladi, parse qiladi va avtomatik transaction yaratadi.

Qo'llab-quvvatlanadigan banklar:
- Uzcard
- HUMO
- Kapitalbank
- Payme / Click (o'tkazma)
- Xalqbank
- Ipoteka Bank
- Agrobank
"""

import re
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from ..database import get_db
from ..models.sms_log import SmsLog
from ..models.transaction import Transaction, TransactionType
from ..models.user import User
from ..config import settings
from .auth import get_current_user

router = APIRouter()


# ─────────────────────────────────────────
#  SMS PARSER
# ─────────────────────────────────────────

def clean_amount(raw: str) -> Optional[float]:
    """'150 000', '150,000.50', '150000' → 150000.0"""
    if not raw:
        return None
    cleaned = re.sub(r"[^\d.,]", "", raw).replace(",", "").replace(" ", "")
    # Agar oxirida nuqta bo'lsa (150000.)
    cleaned = cleaned.rstrip(".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_sms(text: str) -> dict:
    """
    Bank SMS matnini parse qilib, strukturalangan ma'lumot qaytaradi.
    """
    text_lower = text.lower()
    result = {
        "bank_name": None,
        "card_last4": None,
        "amount": None,
        "amount_float": None,
        "currency": "UZS",
        "transaction_type": "expense",
        "merchant": None,
        "balance_after": None,
        "is_parsed": False,
    }

    # ── UZCARD ──────────────────────────────────
    if "uzcard" in text_lower or "8600" in text:
        result["bank_name"] = "Uzcard"
        # Karta raqami
        m = re.search(r"8600\*{4}(\d{4})", text)
        if m:
            result["card_last4"] = m.group(1)
        # Summa — "150 000 so'm" yoki "150000 UZS" yoki "150,000.00 UZS"
        m = re.search(
            r"([\d\s,\.]+)\s*(so['']?m|uzs|sum)",
            text_lower
        )
        if m:
            result["amount"] = m.group(1).strip()
            result["amount_float"] = clean_amount(m.group(1))
        # Qoldiq
        m = re.search(
            r"(?:qoldiq|balansi?|balance)[:\s]*([\d\s,\.]+)\s*(so['']?m|uzs|sum)?",
            text_lower
        )
        if m:
            result["balance_after"] = m.group(1).strip()
        # Savdo nuqtasi
        m = re.search(
            r"(?:savdo[\s:]+|merchant[\s:]+|do['']?kon[\s:]+)([A-Za-z0-9 \-_&.]+)",
            text_lower
        )
        if m:
            result["merchant"] = m.group(1).strip().title()
        # Income/expense
        if any(w in text_lower for w in ["kirim", "zararlanma", "o'tkazildi sizga", "qabul qilindi"]):
            result["transaction_type"] = "income"
        result["is_parsed"] = result["amount_float"] is not None

    # ── HUMO ────────────────────────────────────
    elif "humo" in text_lower or "9860" in text:
        result["bank_name"] = "HUMO"
        m = re.search(r"9860\*{4}(\d{4})", text)
        if m:
            result["card_last4"] = m.group(1)
        m = re.search(r"([\d\s,\.]+)\s*(uzs|so['']?m|sum)", text_lower)
        if m:
            result["amount"] = m.group(1).strip()
            result["amount_float"] = clean_amount(m.group(1))
        m = re.search(
            r"(?:merchant|savdo)[:\s]+([A-Za-z0-9 \-_&.]+)",
            text_lower
        )
        if m:
            result["merchant"] = m.group(1).strip().title()
        m = re.search(
            r"(?:balance|balans|qoldiq)[:\s]*([\d\s,\.]+)",
            text_lower
        )
        if m:
            result["balance_after"] = m.group(1).strip()
        if any(w in text_lower for w in ["kirim", "o'tkazma qabul", "kredit"]):
            result["transaction_type"] = "income"
        result["is_parsed"] = result["amount_float"] is not None

    # ── KAPITALBANK ──────────────────────────────
    elif "kapital" in text_lower or "kdb" in text_lower:
        result["bank_name"] = "Kapitalbank"
        m = re.search(r"\d{4}\*{4}(\d{4})", text)
        if m:
            result["card_last4"] = m.group(1)
        m = re.search(r"([\d\s,\.]+)\s*(uzs|so['']?m|sum)", text_lower)
        if m:
            result["amount"] = m.group(1).strip()
            result["amount_float"] = clean_amount(m.group(1))
        m = re.search(
            r"(?:qoldiq|balance|balans)[:\s]*([\d\s,\.]+)",
            text_lower
        )
        if m:
            result["balance_after"] = m.group(1).strip()
        if "kredit" in text_lower or "kirim" in text_lower:
            result["transaction_type"] = "income"
        result["is_parsed"] = result["amount_float"] is not None

    # ── PAYME / CLICK ────────────────────────────
    elif "payme" in text_lower or "click" in text_lower:
        result["bank_name"] = "Payme/Click"
        m = re.search(r"([\d\s,\.]+)\s*(so['']?m|uzs|sum)", text_lower)
        if m:
            result["amount"] = m.group(1).strip()
            result["amount_float"] = clean_amount(m.group(1))
        # O'tkazma qabul qildim — income
        if any(w in text_lower for w in ["qabul", "keldi", "o'tkazildi sizga"]):
            result["transaction_type"] = "income"
        result["is_parsed"] = result["amount_float"] is not None

    # ── XALQBANK ─────────────────────────────────
    elif "xalq" in text_lower or "xalqbank" in text_lower:
        result["bank_name"] = "Xalqbank"
        m = re.search(r"\d{4}\*{4}(\d{4})", text)
        if m:
            result["card_last4"] = m.group(1)
        m = re.search(r"([\d\s,\.]+)\s*(uzs|so['']?m|sum)", text_lower)
        if m:
            result["amount"] = m.group(1).strip()
            result["amount_float"] = clean_amount(m.group(1))
        m = re.search(r"(?:balans|qoldiq)[:\s]*([\d\s,\.]+)", text_lower)
        if m:
            result["balance_after"] = m.group(1).strip()
        if "kirim" in text_lower or "kredit" in text_lower:
            result["transaction_type"] = "income"
        result["is_parsed"] = result["amount_float"] is not None

    # ── AGROBANK ──────────────────────────────────
    elif "agro" in text_lower or "agrobank" in text_lower:
        result["bank_name"] = "Agrobank"
        m = re.search(r"([\d\s,\.]+)\s*(uzs|so['']?m|sum)", text_lower)
        if m:
            result["amount"] = m.group(1).strip()
            result["amount_float"] = clean_amount(m.group(1))
        if "kirim" in text_lower:
            result["transaction_type"] = "income"
        result["is_parsed"] = result["amount_float"] is not None

    return result


# ─────────────────────────────────────────
#  SCHEMALAR
# ─────────────────────────────────────────

class SmsWebhookPayload(BaseModel):
    """Android SMS Forwarder ilovasi yuboradigan payload"""
    sms_body: str              # SMS matni (majburiy)
    phone_from: Optional[str] = None   # SMS yuboruvchi raqam
    user_token: str            # Foydalanuvchini identifikatsiya qiluvchi token


class SmsLogResponse(BaseModel):
    id: int
    raw_sms: str
    bank_name: Optional[str]
    card_last4: Optional[str]
    amount: Optional[str]
    currency: str
    transaction_type: Optional[str]
    merchant: Optional[str]
    balance_after: Optional[str]
    is_parsed: bool
    transaction_id: Optional[int]
    phone_number: Optional[str]
    source: str
    received_at: datetime

    class Config:
        from_attributes = True


class ManualSmsRequest(BaseModel):
    """Foydalanuvchi qo'lda SMS matnini kiritish uchun"""
    sms_text: str


class WebhookTokenResponse(BaseModel):
    webhook_url: str
    user_token: str
    webhook_token: str
    instructions: dict


# ─────────────────────────────────────────
#  ENDPOINTLAR
# ─────────────────────────────────────────

@router.post("/webhook", summary="📲 SMS Webhook (Android forwarder uchun)")
def sms_webhook(
    payload: SmsWebhookPayload,
    x_webhook_token: Optional[str] = Header(None, alias="X-Webhook-Token"),
    db: Session = Depends(get_db),
):
    """
    Android SMS Forwarder ilovasi SMS larni shu endpoint ga yuboradi.
    Header: X-Webhook-Token: <SMS_WEBHOOK_TOKEN>
    """
    # 1. Global token tekshirish
    if x_webhook_token != settings.SMS_WEBHOOK_TOKEN:
        raise HTTPException(status_code=401, detail="Webhook token noto'g'ri!")

    # 2. Foydalanuvchini topish (user_token = user.id yoki maxsus token)
    user = db.query(User).filter(User.id == payload.user_token).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi!")

    # 3. SMS parse qilish
    parsed = parse_sms(payload.sms_body)

    # 4. SMS log saqlash
    sms_log = SmsLog(
        user_id=user.id,
        raw_sms=payload.sms_body,
        bank_name=parsed["bank_name"],
        card_last4=parsed["card_last4"],
        amount=parsed["amount"],
        currency=parsed["currency"],
        transaction_type=parsed["transaction_type"],
        merchant=parsed["merchant"],
        balance_after=parsed["balance_after"],
        is_parsed=parsed["is_parsed"],
        phone_number=payload.phone_from,
        source="sms_forwarder",
    )
    db.add(sms_log)
    db.flush()  # ID olish uchun

    # 5. Transaction avtomatik yaratish (parse muvaffaqiyatli bo'lsa)
    transaction_id = None
    if parsed["is_parsed"] and parsed["amount_float"] and parsed["amount_float"] > 0:
        now = datetime.utcnow()
        t_type = TransactionType.INCOME if parsed["transaction_type"] == "income" else TransactionType.EXPENSE

        # Kategoriya aniqlash
        merchant = parsed.get("merchant") or ""
        category = _guess_category(merchant, t_type)

        description_parts = []
        if parsed["bank_name"]:
            description_parts.append(parsed["bank_name"])
        if parsed["card_last4"]:
            description_parts.append(f"*{parsed['card_last4']}")
        if merchant:
            description_parts.append(merchant)
        description = " | ".join(description_parts) or "SMS orqali"

        transaction = Transaction(
            user_id=user.id,
            amount=parsed["amount_float"],
            type=t_type,
            category=category,
            description=description + " (SMS auto)",
            month=now.month,
            year=now.year,
        )
        db.add(transaction)

        # Balans yangilash
        if t_type == TransactionType.INCOME:
            user.balance += parsed["amount_float"]
        else:
            user.balance -= parsed["amount_float"]

        db.flush()
        transaction_id = transaction.id
        sms_log.transaction_id = transaction_id
        sms_log.is_parsed = True

    db.commit()

    return {
        "success": True,
        "sms_log_id": sms_log.id,
        "transaction_created": transaction_id is not None,
        "transaction_id": transaction_id,
        "bank": parsed["bank_name"],
        "amount": parsed["amount_float"],
        "type": parsed["transaction_type"],
    }


@router.post("/manual", summary="✍️ Qo'lda SMS kiritish")
def manual_sms(
    data: ManualSmsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Foydalanuvchi SMS matnini qo'lda kiritib, parse qildirishi mumkin"""
    parsed = parse_sms(data.sms_text)

    sms_log = SmsLog(
        user_id=current_user.id,
        raw_sms=data.sms_text,
        bank_name=parsed["bank_name"],
        card_last4=parsed["card_last4"],
        amount=parsed["amount"],
        currency=parsed["currency"],
        transaction_type=parsed["transaction_type"],
        merchant=parsed["merchant"],
        balance_after=parsed["balance_after"],
        is_parsed=parsed["is_parsed"],
        source="manual",
    )
    db.add(sms_log)
    db.flush()

    transaction_id = None
    if parsed["is_parsed"] and parsed["amount_float"] and parsed["amount_float"] > 0:
        now = datetime.utcnow()
        t_type = TransactionType.INCOME if parsed["transaction_type"] == "income" else TransactionType.EXPENSE
        merchant = parsed.get("merchant") or ""
        category = _guess_category(merchant, t_type)

        description_parts = []
        if parsed["bank_name"]:
            description_parts.append(parsed["bank_name"])
        if parsed["card_last4"]:
            description_parts.append(f"*{parsed['card_last4']}")
        if merchant:
            description_parts.append(merchant)
        description = " | ".join(description_parts) or "Qo'lda kiritilgan SMS"

        transaction = Transaction(
            user_id=current_user.id,
            amount=parsed["amount_float"],
            type=t_type,
            category=category,
            description=description + " (SMS manual)",
            month=now.month,
            year=now.year,
        )
        db.add(transaction)
        if t_type == TransactionType.INCOME:
            current_user.balance += parsed["amount_float"]
        else:
            current_user.balance -= parsed["amount_float"]

        db.flush()
        transaction_id = transaction.id
        sms_log.transaction_id = transaction_id

    db.commit()
    db.refresh(sms_log)

    return {
        "success": True,
        "parsed": parsed,
        "transaction_created": transaction_id is not None,
        "transaction_id": transaction_id,
        "sms_log_id": sms_log.id,
    }


@router.get("/logs", response_model=List[SmsLogResponse], summary="📋 SMS loglari")
def get_sms_logs(
    skip: int = 0,
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Foydalanuvchining oxirgi SMS loglarini qaytaradi"""
    limit = max(1, min(limit, 100))
    logs = (
        db.query(SmsLog)
        .filter(SmsLog.user_id == current_user.id)
        .order_by(SmsLog.received_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return logs


@router.get("/webhook-info", response_model=WebhookTokenResponse, summary="🔑 Webhook ma'lumotlari")
def get_webhook_info(
    current_user: User = Depends(get_current_user),
):
    """
    Foydalanuvchiga Android ilovasi uchun webhook URL va token qaytaradi.
    user_token = user.id (Android ilovada saqlanadi)
    """
    base_url = "http://localhost:8000"
    return {
        "webhook_url": f"{base_url}/api/sms/webhook",
        "user_token": current_user.id,
        "webhook_token": settings.SMS_WEBHOOK_TOKEN,
        "instructions": {
            "step1": "Google Play dan 'SMS Forwarder' ilovasini yuklab oling",
            "step2": f"Webhook URL: {base_url}/api/sms/webhook",
            "step3": f"User Token: {current_user.id}",
            "step4": "Header qo'shing: X-Webhook-Token: " + settings.SMS_WEBHOOK_TOKEN,
            "step5": '{"sms_body": "$sms_body", "phone_from": "$phone_from", "user_token": "' + current_user.id + '"}',
            "supported_banks": ["Uzcard", "HUMO", "Kapitalbank", "Payme", "Click", "Xalqbank", "Agrobank"],
        },
    }


@router.delete("/logs/{log_id}", summary="🗑️ SMS logni o'chirish")
def delete_sms_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = (
        db.query(SmsLog)
        .filter(SmsLog.id == log_id, SmsLog.user_id == current_user.id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Log topilmadi!")
    db.delete(log)
    db.commit()
    return {"message": "O'chirildi!"}


# ─────────────────────────────────────────
#  YORDAMCHI FUNKSIYA
# ─────────────────────────────────────────

def _guess_category(merchant: str, t_type: TransactionType) -> str:
    """Merchant nomiga qarab kategoriya taxmin qiladi"""
    if t_type == TransactionType.INCOME:
        return "Boshqa kirim"

    merchant_lower = merchant.lower()

    # Oziq-ovqat
    food_keywords = ["korzinka", "makro", "carrefour", "supermarket", "bozor",
                     "market", "food", "restaurant", "cafe", "oshxona", "dokon"]
    if any(k in merchant_lower for k in food_keywords):
        return "Oziq-ovqat"

    # Transport
    transport_keywords = ["taxi", "taksi", "yandex", "uber", "gas", "benzin",
                          "avto", "parking", "fill", "station"]
    if any(k in merchant_lower for k in transport_keywords):
        return "Transport"

    # Sog'liq
    health_keywords = ["apteka", "pharmacy", "clinic", "klinika", "hospital",
                       "shifo", "dorixona", "medic"]
    if any(k in merchant_lower for k in health_keywords):
        return "Sog'liq"

    # Ta'lim
    edu_keywords = ["school", "maktab", "university", "kurs", "course", "edu"]
    if any(k in merchant_lower for k in edu_keywords):
        return "Ta'lim"

    # Ko'ngilochar
    fun_keywords = ["cinema", "kino", "play", "game", "sport", "gym"]
    if any(k in merchant_lower for k in fun_keywords):
        return "Ko'ngilochar"

    return "Boshqa"
