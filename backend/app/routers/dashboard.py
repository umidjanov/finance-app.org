from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime
from ..database import get_db
from ..models.transaction import Transaction, TransactionType
from ..models.user import User
from .auth import get_current_user
from ..services.email_service import send_monthly_report_email
import threading

router = APIRouter()


@router.post("/send-monthly-report")
def send_monthly_report(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()
    month_names = {
        1: "Yanvar",
        2: "Fevral",
        3: "Mart",
        4: "Aprel",
        5: "May",
        6: "Iyun",
        7: "Iyul",
        8: "Avgust",
        9: "Sentabr",
        10: "Oktabr",
        11: "Noyabr",
        12: "Dekabr",
    }

    income = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.INCOME,
            Transaction.month == now.month,
            Transaction.year == now.year,
        )
        .scalar()
        or 0
    )

    expense = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.EXPENSE,
            Transaction.month == now.month,
            Transaction.year == now.year,
        )
        .scalar()
        or 0
    )

    threading.Thread(
        target=send_monthly_report_email,
        args=(
            current_user.email,
            current_user.full_name,
            month_names[now.month],
            income,
            expense,
            income - expense,
        ),
    ).start()

    return {"message": f"Hisobot {current_user.email} ga yuborildi!"}


# --- Umumiy summary ---
@router.get("/summary")
def get_summary(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()

    # Bu oylik
    monthly_income = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.INCOME,
            Transaction.month == now.month,
            Transaction.year == now.year,
        )
        .scalar()
        or 0
    )

    monthly_expense = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.EXPENSE,
            Transaction.month == now.month,
            Transaction.year == now.year,
        )
        .scalar()
        or 0
    )

    # Jami barcha vaqt
    total_income = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.INCOME,
        )
        .scalar()
        or 0
    )

    total_expense = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.EXPENSE,
        )
        .scalar()
        or 0
    )

    return {
        "balance": current_user.balance,
        "this_month": {
            "income": monthly_income,
            "expense": monthly_expense,
            "savings": monthly_income - monthly_expense,
        },
        "all_time": {
            "income": total_income,
            "expense": total_expense,
            "savings": total_income - total_expense,
        },
    }


# --- Oylik summalar (har oy alohida) ---
@router.get("/monthly-summary")
def get_monthly_summary(
    year: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    if not year:
        year = now.year
    if year < 2000 or year > 2100:
        raise HTTPException(status_code=400, detail="Yil noto'g'ri!")

    month_names = {
        1: "Yanvar",
        2: "Fevral",
        3: "Mart",
        4: "Aprel",
        5: "May",
        6: "Iyun",
        7: "Iyul",
        8: "Avgust",
        9: "Sentabr",
        10: "Oktabr",
        11: "Noyabr",
        12: "Dekabr",
    }

    result = []
    for month in range(1, 13):
        income = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == TransactionType.INCOME,
                Transaction.month == month,
                Transaction.year == year,
            )
            .scalar()
            or 0
        )

        expense = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.month == month,
                Transaction.year == year,
            )
            .scalar()
            or 0
        )

        result.append(
            {
                "oy": month,
                "oy_name": month_names[month],
                "yil": year,
                "kirim": income,
                "chiqim": expense,
                "hozirgi_summa": income - expense,
            }
        )

    return result


# --- Yillik summary ---
@router.get("/yearly-summary")
def get_yearly_summary(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    years_query = (
        db.query(Transaction.year)
        .filter(Transaction.user_id == current_user.id)
        .distinct()
        .all()
    )

    result = []
    for row in years_query:
        year = row[0]
        income = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == TransactionType.INCOME,
                Transaction.year == year,
            )
            .scalar()
            or 0
        )

        expense = (
            db.query(func.sum(Transaction.amount))
            .filter(
                Transaction.user_id == current_user.id,
                Transaction.type == TransactionType.EXPENSE,
                Transaction.year == year,
            )
            .scalar()
            or 0
        )

        result.append(
            {
                "year": year,
                "income": income,
                "expense": expense,
                "savings": income - expense,
            }
        )

    return sorted(result, key=lambda x: x["year"])


# --- Kategoriya bo'yicha ---
@router.get("/by-category")
def get_by_category(
    month: int = None,
    year: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if month is not None and not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="Oy 1 dan 12 gacha bo'lishi kerak!")
    if year is not None and (year < 2000 or year > 2100):
        raise HTTPException(status_code=400, detail="Yil noto'g'ri!")

    expense_query = db.query(
        Transaction.category, func.sum(Transaction.amount).label("total")
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == TransactionType.EXPENSE,
    )

    income_query = db.query(
        Transaction.category, func.sum(Transaction.amount).label("total")
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == TransactionType.INCOME,
    )

    if month:
        expense_query = expense_query.filter(Transaction.month == month)
        income_query = income_query.filter(Transaction.month == month)
    if year:
        expense_query = expense_query.filter(Transaction.year == year)
        income_query = income_query.filter(Transaction.year == year)

    expenses = expense_query.group_by(Transaction.category).all()
    incomes = income_query.group_by(Transaction.category).all()

    return {
        "expense_by_category": [
            {"category": r.category, "total": r.total} for r in expenses
        ],
        "income_by_category": [
            {"category": r.category, "total": r.total} for r in incomes
        ],
    }


# --- Oxirgi transactionlar ---
@router.get("/recent")
def get_recent(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.date.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": t.id,
            "amount": t.amount,
            "type": t.type,
            "category": t.category,
            "description": t.description,
            "oy": t.month,
            "yil": t.year,
            "sana": t.date,
        }
        for t in transactions
    ]


# --- Bugungi summary ---
@router.get("/today")
def get_today(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()

    today_income = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.INCOME,
            func.date(Transaction.date) == now.date(),
        )
        .scalar()
        or 0
    )

    today_expense = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.type == TransactionType.EXPENSE,
            func.date(Transaction.date) == now.date(),
        )
        .scalar()
        or 0
    )

    return {
        "sana": now.date(),
        "kirim": today_income,
        "chiqim": today_expense,
        "hozirgi_summa": today_income - today_expense,
    }