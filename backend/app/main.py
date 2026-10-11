from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from .database import engine, Base, SessionLocal
from .models import User, Transaction
from .routers import auth, transactions, dashboard, admin, otp, telegram_bot, sms_webhook, cards
from .routers.telegram_bot import send_daily_reports_to_all
from .middleware.rate_limit import limiter
from .config import settings
import os
import requests

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Finance App API", docs_url="/api/docs", redoc_url="/api/redoc")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "https://finance-app-nj6h.vercel.app",
        "https://finance-app-nj6h-c2x0qmsat-fayzullohumidjanovs-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


os.makedirs("uploads/avatars", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["🔐 Auth"])
app.include_router(
    transactions.router, prefix="/api/transactions", tags=["💳 Transactions"]
)
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["📊 Dashboard"])
app.include_router(admin.router, prefix="/api/admin", tags=["🔒 Admin"])
app.include_router(otp.router, prefix="/api/otp", tags=["📱 OTP"])
app.include_router(telegram_bot.router, prefix="/api/telegram", tags=["🤖 Telegram"])
app.include_router(sms_webhook.router, prefix="/api/sms", tags=["📲 SMS Webhook"])
app.include_router(cards.router, prefix="/api/cards", tags=["💳 Bank Cards"])

# Scheduler — har kuni 21:00
scheduler = BackgroundScheduler(timezone="Asia/Tashkent")


def daily_report_job():
    db = SessionLocal()
    try:
        send_daily_reports_to_all(db)
    finally:
        db.close()


scheduler.add_job(
    daily_report_job,
    CronTrigger(hour=21, minute=0),
    id="daily_report",
    replace_existing=True,
)
scheduler.start()


@app.on_event("startup")
async def startup():
    if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_WEBHOOK_URL:
        try:
            webhook_url = f"{settings.TELEGRAM_WEBHOOK_URL}/api/telegram/webhook"
            requests.post(
                f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/setWebhook",
                json={"url": webhook_url},
                timeout=5,
            )
            print(f"✅ Telegram webhook o'rnatildi: {webhook_url}")
        except Exception as e:
            print(f"❌ Webhook xatosi: {e}")


@app.get("/")
def root():
    return {"message": "Finance App API ishlamoqda! 🚀"}


@app.get("/health")
def health_check():
    return {"status": "OK"}
