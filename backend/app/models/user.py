from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from ..database import Base

def generate_user_id():
    return str(uuid.uuid4()).replace('-', '')[:14].upper()

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_user_id, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, default="")
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    balance = Column(Float, default=0.0)
    avatar = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)  # ← yangi
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="user")
    sms_logs = relationship("SmsLog", back_populates="user")
    bank_cards = relationship("BankCard", back_populates="user")