from sqlalchemy import Boolean, Column, Integer, String, Time

from app.core.database import Base


class ShiftType(Base):
    __tablename__ = "shift_types"

    shift_type_id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(20), unique=True, nullable=False)
    label = Column(String(20), nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    color = Column(String(10), nullable=False)
    is_work_day = Column(Boolean, nullable=False)
    is_system = Column(Boolean, nullable=False, default=False)
