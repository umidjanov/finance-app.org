from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from ..database import get_db
from ..models.user import User
from ..models.transaction import Transaction, TransactionType
from ..services.telegram_service import send_telegram_message

router = APIRouter()


def fmt(amount: float) -> str:
    return f"{amount:,.0f} so'm"


def get_daily_report(user: User, db: Session) -> str:
    today = date.today()

    income = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.INCOME,
            func.date(Transaction.date) == today,
        )
        .scalar()
        or 0
    )

    expense = (
        db.query(func.sum(Transaction.amount))
        .filter(
            Transaction.user_id == user.id,
            Transaction.type == TransactionType.EXPENSE,
            func.date(Transaction.date) == today,
        )
        .scalar()
        or 0
    )

    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id, func.date(Transaction.date) == today)
        .order_by(Transaction.date.desc())
        .all()
    )

    msg = f"""💰 <b>Finance App — Kunlik Hisobot</b>
📅 <b>{today.strftime('%d.%m.%Y')}</b>
👤 <b>{user.full_name}</b>

━━━━━━━━━━━━━━━━━━━
📈 <b>Bugungi Kirim:</b> +{fmt(income)}
📉 <b>Bugungi Chiqim:</b> -{fmt(expense)}
🏦 <b>Tejamkorlik:</b> {fmt(income - expense)}
💳 <b>Umumiy Balans:</b> {fmt(user.balance)}
━━━━━━━━━━━━━━━━━━━"""

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


@router.post("/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
    except:
        return {"ok": True}

    message = data.get("message", {})
    chat_id = str(message.get("chat", {}).get("id", ""))
    text = message.get("text", "").strip()

    if not chat_id or not text:
        return {"ok": True}

    # /start
    if text == "/start":
        send_telegram_message(
            chat_id,
            """👋 <b>Finance App Botiga xush kelibsiz!</b>

Bu bot har kuni <b>21:00</b> da kunlik kirim-chiqim hisobotini yuboradi.

📌 <b>Komandalar:</b>
/connect email@gmail.com — Akkauntni ulash
/report — Bugungi hisobot
/balance — Joriy balans
/help — Yordam""",
        )

    # /connect
    elif text.startswith("/connect"):
        parts = text.split()
        if len(parts) < 2:
            send_telegram_message(
                chat_id, "❌ Email kiriting:\n<code>/connect email@gmail.com</code>"
            )
        else:
            email = parts[1].lower().strip()
            user = db.query(User).filter(User.email == email).first()
            if user:
                user.telegram_chat_id = chat_id
                db.commit()
                send_telegram_message(
                    chat_id,
                    f"""✅ <b>Akkaunt muvaffaqiyatli ulandi!</b>

👤 <b>{user.full_name}</b>
📧 {user.email}

Endi har kuni <b>21:00</b> da hisobot olasiz! 🎉

Hoziroq /report yozing — bugungi hisobotni ko'ring!""",
                )
            else:
                send_telegram_message(
                    chat_id,
                    f"❌ <b>{email}</b> email bilan akkaunt topilmadi!\n\nAvval Finance App da ro'yxatdan o'ting.",
                )

    # /report
    elif text == "/report":
        user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
        if user:
            report = get_daily_report(user, db)
            send_telegram_message(chat_id, report)
        else:
            send_telegram_message(
                chat_id,
                "❌ Akkaunt ulanmagan!\n\n<code>/connect email@gmail.com</code> yozing",
            )

    # /balance
    elif text == "/balance":
        user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
        if user:
            send_telegram_message(
                chat_id,
                f"""💳 <b>Joriy Balans</b>
👤 {user.full_name}

💰 <b>{fmt(user.balance)}</b>""",
            )
        else:
            send_telegram_message(
                chat_id,
                "❌ Akkaunt ulanmagan!\n\n<code>/connect email@gmail.com</code> yozing",
            )

    # /disconnect
    elif text == "/disconnect":
        user = db.query(User).filter(User.telegram_chat_id == chat_id).first()
        if user:
            user.telegram_chat_id = None
            db.commit()
            send_telegram_message(chat_id, "✅ Akkaunt uzildi!")
        else:
            send_telegram_message(chat_id, "❌ Akkaunt ulanmagan!")

    # /help
    elif text == "/help":
        send_telegram_message(
            chat_id,
            """📌 <b>Barcha komandalar:</b>

/start — Botni ishga tushirish
/connect email — Akkauntni ulash
/report — Bugungi hisobot
/balance — Joriy balans
/disconnect — Akkauntni uzish
/help — Yordam""",
        )

    else:
        send_telegram_message(chat_id, "❓ Noma'lum komanda. /help yozing")

    return {"ok": True}


def send_daily_reports_to_all(db_session):
    """Barcha ulangan userlarga kunlik hisobot"""
    users = (
        db_session.query(User)
        .filter(User.telegram_chat_id != None, User.is_active == True)
        .all()
    )

    sent = 0
    for user in users:
        try:
            report = get_daily_report(user, db_session)
            result = send_telegram_message(user.telegram_chat_id, report)
            if result:
                sent += 1
                print(f"✅ Yuborildi: {user.email}")
        except Exception as e:
            print(f"❌ Xato {user.email}: {e}")

    print(f"📊 Kunlik hisobot: {sent}/{len(users)} user ga yuborildi")
