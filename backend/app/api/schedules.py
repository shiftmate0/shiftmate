"""
PRD_06BE / PRD_07 / PRD_08 — 근무표 API
사용자3(멤버2) 담당
"""

import calendar
from datetime import date, datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.schedule import Schedule
from app.models.schedule_period import SchedulePeriod
from app.models.shift_type import ShiftType
from app.models.swap_request import SwapRequest
from app.models.time_off_request import TimeOffRequest
from app.models.user import User
from app.schemas.schedule import (
    ConfirmResponse,
    DashboardResponse,
    MyRequestItem,
    ScheduleBulkItem,
    ScheduleBulkResponse,
    ScheduleItem,
    ScheduleListResponse,
    ScheduleUpdateRequest,
    ScheduleUpdateResponse,
    TodaySchedule,
    ValidateResponse,
    WeekdaySchedule,
)
from app.services.validation import validate_schedule

router = APIRouter()


# ════════════════════════════════════════════════════════
# GET /api/schedules  —  근무표 조회 (관리자·직원 공용)
# ════════════════════════════════════════════════════════
@router.get("/schedules", response_model=ScheduleListResponse, summary="근무표 조회")
def get_schedules(
    year: int = Query(...),
    month: int = Query(...),
    user_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    query = db.query(Schedule).filter(
        Schedule.work_date.between(first_day, last_day)
    )

    if current_user.role == "employee" and not user_id:
        query = query.filter(Schedule.user_id == current_user.user_id)
    elif user_id:
        query = query.filter(Schedule.user_id == user_id)

    schedules = query.order_by(Schedule.work_date, Schedule.user_id).all()

    period = db.query(SchedulePeriod).filter_by(year=year, month=month).first()
    period_status = "confirmed" if period else "draft"

    items = [
        ScheduleItem(
            schedule_id=s.schedule_id,
            user_id=s.user_id,
            user_name=s.user.name,
            work_date=s.work_date,
            shift_type_id=s.shift_type_id,
            shift_code=s.shift_type.code,
            shift_color=s.shift_type.color,
            shift_label=s.shift_type.label,
            is_locked=s.is_locked,
        )
        for s in schedules
    ]

    return ScheduleListResponse(period_status=period_status, schedules=items)


# ════════════════════════════════════════════════════════
# GET /api/schedules/me  —  내 근무표 조회 (직원 전용)
# ════════════════════════════════════════════════════════
@router.get("/schedules/me", response_model=ScheduleListResponse, summary="내 근무표 조회")
def get_my_schedules(
    year: int = Query(...),
    month: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "admin":
        raise HTTPException(status_code=403, detail="직원 전용 엔드포인트입니다")

    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    schedules = (
        db.query(Schedule)
        .filter(
            Schedule.user_id == current_user.user_id,
            Schedule.work_date.between(first_day, last_day),
        )
        .order_by(Schedule.work_date)
        .all()
    )

    period = db.query(SchedulePeriod).filter_by(year=year, month=month).first()
    period_status = "confirmed" if period else "draft"

    items = [
        ScheduleItem(
            schedule_id=s.schedule_id,
            user_id=s.user_id,
            user_name=s.user.name,
            work_date=s.work_date,
            shift_type_id=s.shift_type_id,
            shift_code=s.shift_type.code,
            shift_color=s.shift_type.color,
            shift_label=s.shift_type.label,
            is_locked=s.is_locked,
        )
        for s in schedules
    ]

    return ScheduleListResponse(period_status=period_status, schedules=items)


# ════════════════════════════════════════════════════════
# POST /api/admin/schedules/bulk  —  배치 저장 (upsert)
# ════════════════════════════════════════════════════════
@router.post("/admin/schedules/bulk", response_model=ScheduleBulkResponse, summary="근무표 일괄 저장")
def bulk_upsert_schedules(
    body: List[ScheduleBulkItem],
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if not body:
        raise HTTPException(status_code=400, detail="요청 데이터가 비어 있습니다")

    saved = 0
    for item in body:
        user = db.query(User).filter(User.user_id == item.user_id).first()
        if not user:
            raise HTTPException(status_code=400, detail=f"user_id {item.user_id}를 찾을 수 없습니다")

        shift = db.query(ShiftType).filter(ShiftType.shift_type_id == item.shift_type_id).first()
        if not shift:
            raise HTTPException(status_code=400, detail=f"shift_type_id {item.shift_type_id}를 찾을 수 없습니다")

        existing = db.query(Schedule).filter_by(
            user_id=item.user_id, work_date=item.work_date
        ).first()

        if existing:
            if existing.is_locked:
                raise HTTPException(
                    status_code=400,
                    detail=f"교대 협의 중인 시프트는 수정할 수 없습니다: {item.work_date}",
                )
            existing.shift_type_id = item.shift_type_id
            existing.updated_at = datetime.now()
        else:
            db.add(Schedule(
                user_id=item.user_id,
                work_date=item.work_date,
                shift_type_id=item.shift_type_id,
            ))
        saved += 1

    db.commit()
    return ScheduleBulkResponse(saved=saved)


# ════════════════════════════════════════════════════════
# PUT /api/admin/schedules/{id}  —  단건 수정
# ════════════════════════════════════════════════════════
@router.put("/admin/schedules/{schedule_id}", response_model=ScheduleUpdateResponse, summary="근무 일정 수정")
def update_schedule(
    schedule_id: int,
    body: ScheduleUpdateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    schedule = db.query(Schedule).filter(Schedule.schedule_id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="근무표를 찾을 수 없습니다")

    if schedule.is_locked:
        raise HTTPException(status_code=400, detail="교대 협의 중인 시프트는 수정할 수 없습니다")

    shift = db.query(ShiftType).filter(ShiftType.shift_type_id == body.shift_type_id).first()
    if not shift:
        raise HTTPException(status_code=400, detail="근무 유형을 찾을 수 없습니다")

    schedule.shift_type_id = body.shift_type_id
    schedule.version = (schedule.version or 0) + 1
    schedule.updated_at = datetime.now()

    db.commit()
    db.refresh(schedule)

    return ScheduleUpdateResponse(
        schedule_id=schedule.schedule_id,
        user_id=schedule.user_id,
        work_date=schedule.work_date,
        shift_type_id=schedule.shift_type_id,
        shift_code=schedule.shift_type.code,
        shift_label=schedule.shift_type.label,
        is_locked=schedule.is_locked,
    )


# ════════════════════════════════════════════════════════
# POST /api/admin/schedules/{year}/{month}/confirm  —  월 확정
# ════════════════════════════════════════════════════════
@router.post("/admin/schedules/{year}/{month}/confirm", response_model=ConfirmResponse, summary="근무표 월 확정")
def confirm_schedule(
    year: int,
    month: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    existing = db.query(SchedulePeriod).filter_by(year=year, month=month).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 확정된 근무표입니다")

    period = SchedulePeriod(
        year=year,
        month=month,
        status="confirmed",
        confirmed_at=datetime.now(),
        confirmed_by=current_user.user_id,
    )
    db.add(period)
    db.commit()
    db.refresh(period)

    return ConfirmResponse(
        period_id=period.period_id,
        year=period.year,
        month=period.month,
        status=period.status,
        confirmed_at=period.confirmed_at,
        confirmed_by=period.confirmed_by,
    )


# ════════════════════════════════════════════════════════
# GET /api/admin/schedules/validate  —  근무표 검증
# ════════════════════════════════════════════════════════
@router.get("/admin/schedules/validate", response_model=ValidateResponse, summary="근무표 유효성 검증")
def validate_schedules(
    year: int = Query(...),
    month: int = Query(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    result = validate_schedule(db, year, month)
    return ValidateResponse(
        year=year,
        month=month,
        is_valid=result["is_valid"],
        has_warnings=len(result["warnings"]) > 0,
        warnings=result["warnings"],
    )


# ════════════════════════════════════════════════════════
# GET /api/employee/dashboard  —  직원 대시보드 (PRD_14)
# ════════════════════════════════════════════════════════
_DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"]


@router.get("/employee/dashboard", response_model=DashboardResponse, summary="직원 대시보드")
def employee_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "admin":
        raise HTTPException(status_code=403, detail="직원 전용 엔드포인트입니다")

    today = date.today()

    # ── 오늘 근무 ─────────────────────────────────────
    today_row = db.query(Schedule).filter(
        Schedule.user_id == current_user.user_id,
        Schedule.work_date == today,
    ).first()

    if today_row:
        st = today_row.shift_type
        today_schedule = TodaySchedule(
            work_date=today_row.work_date,
            shift_code=st.code,
            shift_label=st.label,
            shift_color=st.color,
            start_time=st.start_time.strftime("%H:%M") if st.start_time else None,
            end_time=st.end_time.strftime("%H:%M") if st.end_time else None,
            is_work_day=st.is_work_day,
        )
    else:
        today_schedule = None

    # ── 이번 주 (월~일) ───────────────────────────────
    monday = today - timedelta(days=today.weekday())
    week_dates = [monday + timedelta(days=i) for i in range(7)]

    week_schedules = {
        s.work_date: s
        for s in db.query(Schedule).filter(
            Schedule.user_id == current_user.user_id,
            Schedule.work_date.between(week_dates[0], week_dates[6]),
        ).all()
    }

    this_week = [
        WeekdaySchedule(
            work_date=d,
            day_label=_DAY_LABELS[i],
            shift_code=week_schedules[d].shift_type.code if d in week_schedules else None,
            shift_label=week_schedules[d].shift_type.label if d in week_schedules else None,
            shift_color=week_schedules[d].shift_type.color if d in week_schedules else None,
            is_today=(d == today),
        )
        for i, d in enumerate(week_dates)
    ]

    # ── 나의 요청 최근 3건 ────────────────────────────
    time_off_reqs = (
        db.query(TimeOffRequest)
        .filter(TimeOffRequest.requester_id == current_user.user_id)
        .order_by(TimeOffRequest.created_at.desc())
        .limit(3)
        .all()
    )
    swap_reqs = (
        db.query(SwapRequest)
        .filter(SwapRequest.requester_id == current_user.user_id)
        .order_by(SwapRequest.created_at.desc())
        .limit(3)
        .all()
    )

    combined = []
    for r in time_off_reqs:
        date_display = (
            str(r.start_date)[5:]
            if r.start_date == r.end_date
            else f"{str(r.start_date)[5:]}~{str(r.end_date)[5:]}"
        )
        combined.append({
            "request_id": r.request_id,
            "type": r.type,
            "date_display": date_display,
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        })
    for r in swap_reqs:
        combined.append({
            "request_id": r.swap_request_id,
            "type": "SWAP",
            "date_display": str(r.created_at)[:10][5:],
            "status": r.status,
            "created_at": r.created_at.isoformat(),
        })

    combined.sort(key=lambda x: x["created_at"], reverse=True)
    my_requests = [MyRequestItem(**item) for item in combined[:3]]

    return DashboardResponse(
        today_schedule=today_schedule,
        this_week=this_week,
        my_requests=my_requests,
    )
