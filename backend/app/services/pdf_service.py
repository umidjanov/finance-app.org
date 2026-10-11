from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from ..database import get_db
from ..models.transaction import Transaction, TransactionType
from ..models.user import User
from .auth import get_current_user
from ..services.pdf_service import generate_monthly_pdf, generate_all_transactions_pdf

# ... mavjud kod ...

# --- Oylik PDF ---
@router.get("/export/monthly-pdf")
def export_monthly_pdf(
    month: int = None,
    year: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.utcnow()
    if not month: month = now.month
    if not year: year = now.year

    month_names = {
        1: "Yanvar", 2: "Fevral", 3: "Mart", 4: "Aprel",
        5: "May", 6: "Iyun", 7: "Iyul", 8: "Avgust",
        9: "Sentabr", 10: "Oktabr", 11: "Noyabr", 12: "Dekabr"
    }

    income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == TransactionType.INCOME,
        Transaction.month == month,
        Transaction.year == year
    ).scalar() or 0

    expense = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == TransactionType.EXPENSE,
        Transaction.month == month,
        Transaction.year == year
    ).scalar() or 0

    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.month == month,
        Transaction.year == year
    ).order_by(Transaction.date.desc()).all()

    # Kategoriya ma'lumotlari
    category_data = {}
    for t in transactions:
        if t.type == TransactionType.EXPENSE:
            category_data[t.category] = category_data.get(t.category, 0) + t.amount

    tx_list = [
        {
            "date": t.date,
            "type": t.type.value,
            "category": t.category,
            "description": t.description,
            "amount": t.amount
        }
        for t in transactions
    ]

    pdf_buffer = generate_monthly_pdf(
        full_name=current_user.full_name,
        email=current_user.email,
        month_name=month_names[month],
        year=year,
        income=income,
        expense=expense,
        savings=income - expense,
        transactions=tx_list,
        category_data=category_data
    )

    filename = f"hisobot_{month_names[month]}_{year}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# --- Barcha transactionlar PDF ---
@router.get("/export/all-pdf")
def export_all_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transactions = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(Transaction.date.desc()).all()

    total_income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == TransactionType.INCOME
    ).scalar() or 0

    total_expense = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.type == TransactionType.EXPENSE
    ).scalar() or 0

    tx_list = [
        {
            "date": t.date,
            "type": t.type.value,
            "category": t.category,
            "description": t.description,
            "amount": t.amount
        }
        for t in transactions
    ]

    pdf_buffer = generate_all_transactions_pdf(
        full_name=current_user.full_name,
        email=current_user.email,
        balance=current_user.balance,
        total_income=total_income,
        total_expense=total_expense,
        transactions=tx_list
    )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=barcha_transactionlar.pdf"}
    )