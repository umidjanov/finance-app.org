from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class SmsLog(Base):
    __tablename__ = "sms_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Kelgan SMS matni
    raw_sms = Column(Text, nullable=False)

    # Parse qilingan ma'lumotlar
    bank_name = Column(String, nullable=True)       # Uzcard, HUMO, Kapitalbank...
    card_last4 = Column(String, nullable=True)      # Karta oxirgi 4 raqami
    amount = Column(String, nullable=True)          # Summa (string ko'rinishida)
    currency = Column(String, default="UZS")        # Valyuta
    transaction_type = Column(String, nullable=True)  # expense / income
    merchant = Column(String, nullable=True)        # Do'kon / savdo nuqtasi
    balance_after = Column(String, nullable=True)   # SMS dan qoldiq

    # Tizim ma'lumotlari
    is_parsed = Column(Boolean, default=False)      # Parse muvaffaqiyatli bo'ldimi
    transaction_id = Column(Integer, nullable=True) # Yaratilgan transaction ID
    phone_number = Column(String, nullable=True)    # SMS yuborgan raqam (manba)
    source = Column(String, default="sms_forwarder")  # sms_forwarder / manual

    received_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="sms_logs")
