import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from ..config import settings


def send_email(to_email: str, subject: str, html_content: str):
    """Email yuborish"""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.MAIL_FROM
        msg["To"] = to_email

        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
            server.starttls()
            server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
            server.sendmail(settings.MAIL_FROM, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"Email yuborishda xato: {e}")
        return False


def send_welcome_email(to_email: str, full_name: str):
    """Ro'yxatdan o'tganda xush kelibsiz email"""
    subject = "💰 Finance App ga xush kelibsiz!"
    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #14213D; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a2a4a; border-radius: 16px; padding: 40px; border: 1px solid #FCA311;">
            <h1 style="color: #FCA311; text-align: center;">💰 Finance App</h1>
            <h2 style="color: #E5E5E5;">Assalomu alaykum, {full_name}! 👋</h2>
            <p style="color: #E5E5E5; font-size: 16px;">
                Finance App ga muvaffaqiyatli ro'yxatdan o'tdingiz!
            </p>
            <div style="background: #14213D; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #FCA311;">Nima qila olasiz?</h3>
                <p style="color: #E5E5E5;">✅ Kirim va chiqimlarni kuzatish</p>
                <p style="color: #E5E5E5;">📊 Oylik statistika ko'rish</p>
                <p style="color: #E5E5E5;">📈 Grafiklar orqali tahlil</p>
                <p style="color: #E5E5E5;">🏦 Tejamkorlikni hisoblash</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:3000/dashboard"
                   style="background: #FCA311; color: #14213D; padding: 14px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 16px;">
                    🚀 Dashboardga kirish
                </a>
            </div>
            <p style="color: #E5E5E5; opacity: 0.5; text-align: center; margin-top: 30px; font-size: 12px;">
                © 2026 Finance App. Barcha huquqlar himoyalangan.
            </p>
        </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html)


def send_monthly_report_email(
    to_email: str,
    full_name: str,
    month_name: str,
    income: float,
    expense: float,
    savings: float,
):
    """Oylik hisobot email"""
    subject = f"📊 {month_name} oylik moliyaviy hisobotingiz"

    savings_color = "#38ef7d" if savings >= 0 else "#eb3349"
    savings_text = "Tejadingiz" if savings >= 0 else "Qarz qildingiz"

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #14213D; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a2a4a; border-radius: 16px; padding: 40px; border: 1px solid #FCA311;">
            <h1 style="color: #FCA311; text-align: center;">💰 Finance App</h1>
            <h2 style="color: #E5E5E5;">{month_name} oylik hisobot</h2>
            <p style="color: #E5E5E5;">Salom {full_name}! Bu oygi moliyaviy hisobotingiz:</p>

            <div style="display: grid; gap: 12px; margin: 20px 0;">
                <div style="background: #14213D; border-radius: 12px; padding: 16px; border-left: 4px solid #38ef7d;">
                    <p style="color: #E5E5E5; margin: 0; font-size: 14px;">📈 Jami Kirim</p>
                    <p style="color: #38ef7d; margin: 8px 0 0 0; font-size: 22px; font-weight: bold;">
                        +{income:,.0f} so'm
                    </p>
                </div>
                <div style="background: #14213D; border-radius: 12px; padding: 16px; border-left: 4px solid #eb3349;">
                    <p style="color: #E5E5E5; margin: 0; font-size: 14px;">📉 Jami Chiqim</p>
                    <p style="color: #eb3349; margin: 8px 0 0 0; font-size: 22px; font-weight: bold;">
                        -{expense:,.0f} so'm
                    </p>
                </div>
                <div style="background: #14213D; border-radius: 12px; padding: 16px; border-left: 4px solid {savings_color};">
                    <p style="color: #E5E5E5; margin: 0; font-size: 14px;">🏦 {savings_text}</p>
                    <p style="color: {savings_color}; margin: 8px 0 0 0; font-size: 22px; font-weight: bold;">
                        {savings:,.0f} so'm
                    </p>
                </div>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="http://localhost:3000/dashboard"
                   style="background: #FCA311; color: #14213D; padding: 14px 30px; border-radius: 10px; text-decoration: none; font-weight: bold;">
                    📊 To'liq hisobotni ko'rish
                </a>
            </div>
            <p style="color: #E5E5E5; opacity: 0.5; text-align: center; margin-top: 30px; font-size: 12px;">
                © 2026 Finance App
            </p>
        </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html)


def send_big_expense_alert(
    to_email: str, full_name: str, amount: float, category: str, balance: float
):
    """Katta chiqim ogohlantirishk"""
    subject = f"⚠️ Katta chiqim: {amount:,.0f} so'm"
    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background: #14213D; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #1a2a4a; border-radius: 16px; padding: 40px; border: 2px solid #eb3349;">
            <h1 style="color: #FCA311; text-align: center;">💰 Finance App</h1>
            <h2 style="color: #eb3349; text-align: center;">⚠️ Katta chiqim aniqlandi!</h2>

            <p style="color: #E5E5E5;">Salom {full_name}!</p>
            <p style="color: #E5E5E5;">Hisobingizdan katta miqdorda pul chiqdi:</p>

            <div style="background: #14213D; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #eb3349;">
                <p style="color: #E5E5E5; margin: 0;">💸 Chiqim miqdori:</p>
                <p style="color: #eb3349; font-size: 28px; font-weight: bold; margin: 8px 0;">
                    -{amount:,.0f} so'm
                </p>
                <p style="color: #E5E5E5; margin: 0;">📂 Kategoriya: <span style="color: #FCA311;">{category}</span></p>
                <p style="color: #E5E5E5; margin: 8px 0 0 0;">💳 Joriy balans: <span style="color: #FCA311;">{balance:,.0f} so'm</span></p>
            </div>

            <p style="color: #E5E5E5; opacity: 0.7; font-size: 14px;">
                Agar bu siz tomonidan amalga oshirilgan bo'lmasa, tezda parolingizni o'zgartiring.
            </p>

            <div style="text-align: center; margin-top: 20px;">
                <a href="http://localhost:3000/dashboard"
                   style="background: #FCA311; color: #14213D; padding: 14px 30px; border-radius: 10px; text-decoration: none; font-weight: bold;">
                    📊 Dashboardga kirish
                </a>
            </div>
            <p style="color: #E5E5E5; opacity: 0.5; text-align: center; margin-top: 30px; font-size: 12px;">
                © 2026 Finance App
            </p>
        </div>
    </body>
    </html>
    """
    return send_email(to_email, subject, html)
