from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ..database import get_db
from ..models.transaction import Transaction, TransactionType
from ..models.user import User
from .auth import get_current_user
from ..services.email_service import send_big_expense_alert
from ..services.telegram_service import send_transaction_notification
import threading
from ..utils.security import sanitize_string

router = APIRouter()


class TransactionCreate(BaseModel):
    amount: float
    type: TransactionType
    category: str
    description: Optional[str] = ""
    month: Optional[int] = None
    year: Optional[int] = None
 

class TransactionUpdate(BaseModel):
    amount: float
    type: TransactionType
    category: str
    description: Optional[str] = ""


class TransactionResponse(BaseModel):
    id: int
    amount: float
    type: TransactionType
    category: str
    description: Optional[str]
    date: datetime
    month: int
    year: int
    user_id: str

    class Config:
        from_attributes = True


@router.post("/", response_model=TransactionResponse)
def create_transaction(
    data: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Summa 0 dan katta bo'lishi kerak!")
    if data.amount > 1_000_000_000:
        raise HTTPException(status_code=400, detail="Summa juda katta!")

    # Input tozalash
    category = sanitize_string(data.category, 50)
    description = sanitize_string(data.description or "", 500)

    now = datetime.utcnow()
    transaction = Transaction(
        user_id=current_user.id,
        amount=data.amount,
        type=data.type,
        category=category,
        description=description,
        month=now.month,
        year=now.year,
    )
    db.add(transaction)
    if data.type == TransactionType.INCOME:
        current_user.balance += data.amount
    else:
        current_user.balance -= data.amount
    db.commit()

    # Telegram bildirishnoma (background thread)
    if current_user.telegram_chat_id:
        threading.Thread(
            target=send_transaction_notification,
            args=(
                current_user.telegram_chat_id,
                current_user.full_name,
                data.amount,
                data.type.value,
                category,
                description,
                current_user.balance,
            ),
        ).start()

    if data.type == TransactionType.EXPENSE and data.amount >= 500000:
        threading.Thread(
            target=send_big_expense_alert,
            args=(
                current_user.email,
                current_user.full_name,
                data.amount,
                data.category,
                current_user.balance,
            ),
        ).start()
    db.refresh(transaction)
    return transaction


@router.get("/", response_model=List[TransactionResponse])
def get_transactions(
    skip: int = 0,
    limit: int = 50,
    type: Optional[TransactionType] = None,
    category: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    limit = max(1, min(limit, 100))
    skip = max(0, skip)
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if type:
        query = query.filter(Transaction.type == type)
    if category:
        query = query.filter(Transaction.category == category)
    if month:
        query = query.filter(Transaction.month == month)
    if year:
        query = query.filter(Transaction.year == year)
    return query.order_by(Transaction.date.desc()).offset(skip).limit(limit).all()


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id, Transaction.user_id == current_user.id
        )
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction topilmadi!")
    return transaction


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Summa 0 dan katta bo'lishi kerak!")
    if data.amount > 1_000_000_000:
        raise HTTPException(status_code=400, detail="Summa juda katta!")

    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id, Transaction.user_id == current_user.id
        )
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction topilmadi!")

    # Eski transaction balansga ta'sirini bekor qilish
    if transaction.type == TransactionType.INCOME:
        current_user.balance -= transaction.amount
    else:
        current_user.balance += transaction.amount

    # Yangi qiymatlarni qo'llash
    transaction.amount = data.amount
    transaction.type = data.type
    transaction.category = sanitize_string(data.category, 50)
    transaction.description = sanitize_string(data.description or "", 500)

    if data.type == TransactionType.INCOME:
        current_user.balance += data.amount
    else:
        current_user.balance -= data.amount

    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.id == transaction_id, Transaction.user_id == current_user.id
        )
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction topilmadi!")
    if transaction.type == TransactionType.INCOME:
        current_user.balance -= transaction.amount
    else:
        current_user.balance += transaction.amount
    db.delete(transaction)
    db.commit()
    return {"message": "Transaction o'chirildi!"}


@router.get("/meta/categories")
def get_categories(current_user: User = Depends(get_current_user)):
    return {
        "income": ["Maosh", "Freelance", "Biznes", "Investitsiya", "Sovg'a", "Boshqa"],
        "expense": [
            "Oziq-ovqat",
            "Transport",
            "Uy-joy",
            "Kiyim",
            "Sog'liq",
            "Ta'lim",
            "Ko'ngilochar",
            "Boshqa",
        ],
    }
