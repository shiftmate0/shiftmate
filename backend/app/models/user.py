from sqlalchemy import Column, Integer, String, Boolean, Enum, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False)
    employee_no = Column(String(30), unique=True, nullable=False)
    role = Column(Enum("admin", "employee", name="user_role"), nullable=False)
    years_of_experience = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    password = Column(String(255), nullable=False)
    is_initial_password = Column(Boolean, nullable=False, default=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    time_off_requests = relationship("TimeOffRequest", foreign_keys="TimeOffRequest.requester_id")
