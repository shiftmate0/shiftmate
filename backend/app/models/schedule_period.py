from sqlalchemy import Column, Integer, Enum, ForeignKey, TIMESTAMP, UniqueConstraint
from sqlalchemy.sql import func
from app.core.database import Base

class SchedulePeriod(Base):
    __tablename__ = "schedule_periods"
    __table_args__ = (UniqueConstraint("year", "month", name="uq_schedule_periods_year_month"),)

    period_id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    status = Column(Enum("draft", "confirmed", name="period_status"), nullable=False, default="draft")
    confirmed_at = Column(TIMESTAMP(timezone=True), nullable=True)
    confirmed_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
