from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models.user import User
from ..models.transaction import Transaction, TransactionType
from .auth import get_current_user

router = APIRouter()

# Admin tekshirish
def require_admin(current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin huquqi yo'q!")
    return current_user

# --- Umumiy statistika ---
@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_transactions = db.query(func.count(Transaction.id)).scalar() or 0
    total_income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.type == TransactionType.INCOME
    ).scalar() or 0
    total_expense = db.query(func.sum(Transaction.amount)).filter(
        Transaction.type == TransactionType.EXPENSE
    ).scalar() or 0

    return {
        "total_users": total_users,
        "active_users": active_users,
        "blocked_users": total_users - active_users,
        "total_transactions": total_transactions,
        "total_income": total_income,
        "total_expense": total_expense,
        "total_savings": total_income - total_expense
    }

# --- Barcha userlarni olish ---
@router.get("/users")
def get_all_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    limit = max(1, min(limit, 100))
    skip = max(0, skip)

    users = db.query(User).offset(skip).limit(limit).all()

    counts = dict(
        db.query(Transaction.user_id, func.count(Transaction.id))
        .filter(Transaction.user_id.in_([u.id for u in users]))
        .group_by(Transaction.user_id)
        .all()
    )

    return [
        {
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "full_name": u.full_name,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "is_verified": u.is_verified,
            "balance": u.balance,
            "created_at": u.created_at,
            "transaction_count": counts.get(u.id, 0)
        }
        for u in users
    ]

# --- Userni bloklash/faollashtirish ---
@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: str, 
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User topilmadi!")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="O'zingizni bloklayolmaysiz!")
    user.is_active = not user.is_active
    db.commit()
    return {
        "message": f"User {'faollashtirildi' if user.is_active else 'bloklandi'}!",
        "is_active": user.is_active
    }

# --- Admin qilish/olib tashlash ---
@router.put("/users/{user_id}/toggle-admin")
def toggle_admin(
    user_id: str, 
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User topilmadi!")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="O'zingizni o'zgartiraysiz!")
    user.is_admin = not user.is_admin
    db.commit()
    return {
        "message": f"User {'admin qilindi' if user.is_admin else 'admin emas'}!",
        "is_admin": user.is_admin
    }

# --- Userni o'chirish ---
@router.delete("/users/{user_id}")
def delete_user(
    user_id: str, 
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User topilmadi!")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="O'zingizni o'chira olmaysiz!")
    db.query(Transaction).filter(Transaction.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"message": "User o'chirildi!"}

# --- Barcha transactionlar ---
@router.get("/transactions")
def get_all_transactions(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    limit = max(1, min(limit, 100))
    skip = max(0, skip)

    rows = (
        db.query(Transaction, User.email)
        .join(User, User.id == Transaction.user_id)
        .order_by(Transaction.date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": t.id,
            "user_id": t.user_id,
            "user_email": email,
            "amount": t.amount,
            "type": t.type,
            "category": t.category,
            "description": t.description,
            "date": t.date,
            "month": t.month,
            "year": t.year
        }
        for t, email in rows
    ]