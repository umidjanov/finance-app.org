from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class BankCard(Base):
    __tablename__ = "bank_cards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    bank_name = Column(String, nullable=False)        # Uzcard, HUMO, Kapitalbank...
    card_last4 = Column(String, nullable=False)       # Karta oxirgi 4 raqami
    card_number_masked = Column(String, nullable=True) # 8600 **** **** 1234 ko'rinishida
    nickname = Column(String, default="Mening kartam")  # Foydalanuvchi nomi
    is_active = Column(Boolean, default=True)
    color = Column(String, default="#FCA311")          # Karta rangi (UI uchun)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="bank_cards")
