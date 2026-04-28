from sqlalchemy import Column, Integer, Enum, ForeignKey, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base


class SwapProposal(Base):
    __tablename__ = "swap_proposals"

    swap_proposal_id = Column(Integer, primary_key=True, autoincrement=True)
    swap_request_id = Column(Integer, ForeignKey("swap_requests.swap_request_id"), nullable=False)
    proposer_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    proposer_schedule_id = Column(Integer, ForeignKey("schedules.schedule_id"), nullable=False)
    proposer_years_at_proposal = Column(Integer, nullable=False)
    status = Column(
        Enum("proposed", "selected", "rejected", name="swap_proposal_status"),
        nullable=False,
        default="proposed",
    )
    selected_at = Column(TIMESTAMP(timezone=True), nullable=True)
    rejected_at = Column(TIMESTAMP(timezone=True), nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
