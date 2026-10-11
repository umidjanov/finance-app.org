import requests as req
from ..config import settings


def send_telegram_message(chat_id: str, message: str) -> bool:
    """Telegram ga xabar yuborish"""
    if not settings.TELEGRAM_BOT_TOKEN or not chat_id:
        return False
    try:
        url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
        response = req.post(
            url,
            json={"chat_id": chat_id, "text": message, "parse_mode": "HTML"},
            timeout=10,
        )
        return response.status_code == 200
    except Exception as e:
        print(f"Telegram xatosi: {e}")
        return False


def send_transaction_notification(
    chat_id: str,
    full_name: str,
    amount: float,
    transaction_type: str,
    category: str,
    description: str,
    balance: float,
) -> bool:
    """Transaction kiritilganda Telegram ga bildirishnoma yuborish"""
    if not chat_id:
        return False

    fmt = lambda x: f"{x:,.0f} so'm"

    if transaction_type == "income":
        emoji = "📈"
        type_text = "Kirim"
        sign = "+"
        amount_style = f"<b>+{fmt(amount)}</b>"
    else:
        emoji = "📉"
        type_text = "Chiqim"
        sign = "-"
        amount_style = f"<b>-{fmt(amount)}</b>"

    desc_line = f"\n📝 <i>{description}</i>" if description else ""

    message = (
        f"{emoji} <b>Yangi {type_text}!</b>\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"👤 <b>{full_name}</b>\n"
        f"💰 Summa: {amount_style}\n"
        f"🏷 Kategoriya: <b>{category}</b>"
        f"{desc_line}\n"
        f"━━━━━━━━━━━━━━━━━━━\n"
        f"💳 Joriy balans: <b>{fmt(balance)}</b>"
    )

    return send_telegram_message(chat_id, message)
