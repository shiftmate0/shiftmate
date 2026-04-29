from sqlalchemy import Boolean, Column, Integer

from app.core.database import Base


class EmployeeAcceptance(Base):
    __tablename__ = "employee_acceptances"

    acceptance_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    is_valid = Column(Boolean, nullable=False, default=True)
