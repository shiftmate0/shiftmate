from sqlalchemy import Column, Integer, Enum, ForeignKey, String, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base


class SwapRequest(Base):
    __tablename__ = "swap_requests"

    swap_request_id = Column(Integer, primary_key=True, autoincrement=True)
    requester_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    requester_schedule_id = Column(Integer, ForeignKey("schedules.schedule_id"), nullable=False)
    requester_years_at_request = Column(Integer, nullable=False)
    required_years_min = Column(Integer, nullable=False)
    required_years_max = Column(Integer, nullable=False)
    status = Column(
        Enum("pending", "accepted", "approved", "rejected", "expired", name="swap_request_status"),
        nullable=False,
        default="pending",
    )
    accepted_proposal_id = Column(Integer, ForeignKey("swap_proposals.swap_proposal_id"), nullable=True)
    accepted_at = Column(TIMESTAMP(timezone=True), nullable=True)
    admin_comment = Column(String(500), nullable=True)
    expires_at = Column(TIMESTAMP(timezone=True), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
