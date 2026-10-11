"""
Bank Cards Router
=================
Foydalanuvchi bank kartalarini qo'shadi.
Karta qo'shilgandan keyin, SMS Forwarder orqali kelgan SMS lari
avtomatik ravishda shu kartaga bog'lanadi va transaction yaratiladi.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from ..database import get_db
from ..models.bank_card import BankCard
from ..models.user import User
from .auth import get_current_user

router = APIRouter()

BANK_PREFIXES = {
    "Uzcard": "8600",
    "HUMO": "9860",
    "Kapitalbank": "5614",
    "Xalqbank": "8610",
    "Agrobank": "8620",
    "Ipoteka Bank": "5897",
    "Boshqa": "",
}

CARD_COLORS = {
    "Uzcard": "#1a6b3c",
    "HUMO": "#2e7d32",
    "Kapitalbank": "#1565c0",
    "Xalqbank": "#c62828",
    "Agrobank": "#2e7d32",
    "Boshqa": "#37474f",
}


class CardCreate(BaseModel):
    bank_name: str
    card_last4: str          # Faqat oxirgi 4 raqam (xavfsizlik uchun)
    nickname: Optional[str] = "Mening kartam"


class CardResponse(BaseModel):
    id: int
    bank_name: str
    card_last4: str
    card_number_masked: Optional[str]
    nickname: str
    is_active: bool
    color: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[CardResponse], summary="💳 Kartalarim")
def get_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(BankCard)
        .filter(BankCard.user_id == current_user.id)
        .order_by(BankCard.created_at.desc())
        .all()
    )


@router.post("/", response_model=CardResponse, summary="➕ Karta qo'shish")
def add_card(
    data: CardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Faqat raqam bo'lishi kerak
    last4 = data.card_last4.strip().replace(" ", "")
    if not last4.isdigit() or len(last4) != 4:
        raise HTTPException(
            status_code=400,
            detail="Karta raqamining faqat oxirgi 4 raqamini kiriting!"
        )

    # Bir xil karta bor-yo'qligini tekshirish
    existing = db.query(BankCard).filter(
        BankCard.user_id == current_user.id,
        BankCard.bank_name == data.bank_name,
        BankCard.card_last4 == last4,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu karta allaqachon qo'shilgan!")

    # Bank prefixi
    prefix = BANK_PREFIXES.get(data.bank_name, "****")
    masked = f"{prefix} **** **** {last4}" if prefix else f"**** **** **** {last4}"
    color = CARD_COLORS.get(data.bank_name, "#37474f")

    card = BankCard(
        user_id=current_user.id,
        bank_name=data.bank_name,
        card_last4=last4,
        card_number_masked=masked,
        nickname=data.nickname or "Mening kartam",
        color=color,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.delete("/{card_id}", summary="🗑️ Kartani o'chirish")
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = db.query(BankCard).filter(
        BankCard.id == card_id,
        BankCard.user_id == current_user.id,
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Karta topilmadi!")
    db.delete(card)
    db.commit()
    return {"message": "Karta o'chirildi!"}


@router.patch("/{card_id}/toggle", summary="🔄 Karta faolligini o'zgartirish")
def toggle_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card = db.query(BankCard).filter(
        BankCard.id == card_id,
        BankCard.user_id == current_user.id,
    ).first()
    if not card:
        raise HTTPException(status_code=404, detail="Karta topilmadi!")
    card.is_active = not card.is_active
    db.commit()
    return {"message": "Yangilandi!", "is_active": card.is_active}
