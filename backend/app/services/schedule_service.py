from sqlalchemy.orm import Session
from datetime import date, datetime
from app.models.schedule import Schedule


def upsert_schedule(
    db: Session,
    user_id: int,
    work_date: date,
    shift_type_id: int,
) -> None:
    """
    schedules 테이블 upsert.
    commit은 호출자 트랜잭션에서 처리.
    """
    existing = db.query(Schedule).filter_by(
        user_id=user_id, work_date=work_date
    ).first()
    if existing:
        existing.shift_type_id = shift_type_id
        existing.updated_at = datetime.now()
    else:
        db.add(Schedule(
            user_id=user_id,
            work_date=work_date,
            shift_type_id=shift_type_id,
        ))
    # commit은 호출자에서 처리
