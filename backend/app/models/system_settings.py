from sqlalchemy import Column, Integer, TIMESTAMP
from sqlalchemy.sql import func

from app.core.database import Base


class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, default=1)
    swap_years_range = Column(Integer, nullable=False, default=2)
    max_consecutive_night = Column(Integer, nullable=False, default=3)
    min_daily_staff = Column(Integer, nullable=False, default=3)
    min_avg_years = Column(Integer, nullable=False, default=2)
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
