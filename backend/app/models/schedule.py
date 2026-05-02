from sqlalchemy import Boolean, Column, Date, ForeignKey, Integer, TIMESTAMP, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Schedule(Base):
    __tablename__ = "schedules"
    __table_args__ = (UniqueConstraint("user_id", "work_date", name="uq_schedules_user_date"),)

    schedule_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    work_date = Column(Date, nullable=False)
    shift_type_id = Column(Integer, ForeignKey("shift_types.shift_type_id"), nullable=False)
    is_locked = Column(Boolean, nullable=False, default=False)
    version = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    shift_type = relationship("ShiftType")
