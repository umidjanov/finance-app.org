"""
Telegram Bot — Polling rejimida ishlaydi (mahalliy server uchun)
Ishga tushirish: python bot_polling.py
"""
import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
if not TOKEN:
    print("❌ TELEGRAM_BOT_TOKEN .env da topilmadi!")
    sys.exit(1)

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
)
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.user import User
from app.models.transaction import Transaction, TransactionType
from sqlalchemy import func
from datetime import date

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)


def fmt(amount: float) -> str:
    return f"{amount:,.0f} so'm"


def get_db() -> Session:
    return SessionLocal()


def get_daily_report(user, db) -> str:
    today = date.today()
    income = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.INCOME,
            func.date(Transaction.date) == today,
        )
        .scalar() or 0
    )
    expense = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.EXPENSE,
            func.date(Transaction.date) == today,
        )
        .scalar() or 0
    )
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id, func.date(Transaction.date) == today)
        .order_by(Transaction.date.desc())
        .all()
    )

    msg = (
        f"💰 <b>Finance Tracker — Kunlik Hisobot</b>\n"
        f"📅 <b>{today.strftime('%d.%m.%Y')}</b>\n"
        f"👤 <b>{user.full_name}</b>\n\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"📈 <b>Bugungi Kirim:</b> +{fmt(income)}\n"
        f"📉 <b>Bugungi Chiqim:</b> -{fmt(expense)}\n"
        f"🏦 <b>Tejamkorlik:</b> {fmt(income - expense)}\n"
        f"💳 <b>Umumiy Balans:</b> {fmt(user.balance)}\n"
        f"━━━━━━━━━━━━━━━━━━━"
    )

    if transactions:
        msg += "\n\n📋 <b>Bugungi transactionlar:</b>\n"
        for t in transactions[:10]:
            emoji = "📈" if t.type == TransactionType.INCOME else "📉"
            sign = "+" if t.type == TransactionType.INCOME else "-"
            msg += f"{emoji} {t.category}: {sign}{fmt(t.amount)}"
            if t.description:
                msg += f" <i>({t.description})</i>"
            msg += "\n"
    else:
        msg += "\n\n📭 <i>Bugun transaction yo'q</i>"

    return msg


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(
        "👋 <b>Finance Tracker Botiga xush kelibsiz!</b>\n\n"
        "Bu bot har yangi transaction kiritganingizda sizga xabar yuboradi.\n\n"
        "📌 <b>Komandalar:</b>\n"
        "/connect email@gmail.com — Akkauntni ulash\n"
        "/report — Bugungi hisobot\n"
        "/balance — Joriy balans\n"
        "/disconnect — Akkauntni uzish\n"
        "/help — Yordam"
    )


async def connect(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    if not context.args:
        await update.message.reply_html(
            "❌ Email kiriting:\n<code>/connect email@gmail.com</code>"
        )
        return

    email = context.args[0].lower().strip()
    db = get_db()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.telegram_chat_id = chat_id
            db.commit()
            await update.message.reply_html(
                f"✅ <b>Akkaunt muvaffaqiyatli ulandi!</b>\n\n"
                f"👤 <b>{user.full_name}</b>\n"
                f"📧 {user.email}\n\n"
                f"Endi har bir transaction kiritganda xabar olasiz! 🎉\n\n"
                f"Hoziroq /report yozing — bugungi hisobotni ko'ring!"
            )
        else:
            await update.message.reply_html(
                f"❌ <b>{email}</b> email bilan akkaunt topilmadi!\n\n"
                f"Avval Finance App da ro'yxatdan o'ting."
            )
    finally:
        db.close()


async def report(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    db = get_db()
    try:
        user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
        if user:
            msg = get_daily_report(user, db)
            await update.message.reply_html(msg)
        else:
            await update.message.reply_html(
                "❌ Akkaunt ulanmagan!\n\n<code>/connect email@gmail.com</code> yozing"
            )
    finally:
        db.close()


async def balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    db = get_db()
    try:
        user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
        if user:
            await update.message.reply_html(
                f"💳 <b>Joriy Balans</b>\n"
                f"👤 {user.full_name}\n\n"
                f"💰 <b>{fmt(user.balance)}</b>"
            )
        else:
            await update.message.reply_html(
                "❌ Akkaunt ulanmagan!\n\n<code>/connect email@gmail.com</code> yozing"
            )
    finally:
        db.close()


async def disconnect(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = str(update.effective_chat.id)
    db = get_db()
    try:
        user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
        if user:
            user.telegram_chat_id = None
            db.commit()
            await update.message.reply_text("✅ Akkaunt uzildi!")
        else:
            await update.message.reply_text("❌ Akkaunt ulanmagan!")
    finally:
        db.close()


async def help_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(
        "📌 <b>Barcha komandalar:</b>\n\n"
        "/start — Botni ishga tushirish\n"
        "/connect email — Akkauntni ulash\n"
        "/report — Bugungi hisobot\n"
        "/balance — Joriy balans\n"
        "/disconnect — Akkauntni uzish\n"
        "/help — Yordam"
    )


def main():
    print("🤖 Finance Tracker Bot ishga tushmoqda (polling)...")
    application = Application.builder().token(TOKEN).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("connect", connect))
    application.add_handler(CommandHandler("report", report))
    application.add_handler(CommandHandler("balance", balance))
    application.add_handler(CommandHandler("disconnect", disconnect))
    application.add_handler(CommandHandler("help", help_cmd))

    print("✅ Bot tayyor! Telegram da /start bosing.")
    application.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
