"""
멤버 2 담당 백엔드 API
─────────────────────────────────────────
GET    /api/schedules                       근무표 조회 (관리자·직원 공용)
GET    /api/schedules/me                    내 근무표 조회
POST   /api/admin/schedules/bulk            근무표 배치 저장 (upsert)
PUT    /api/admin/schedules/{id}            근무표 단건 수정 (낙관적 잠금)
DELETE /api/admin/schedules/{id}            근무표 소프트 삭제
POST   /api/admin/schedules/{year}/{month}/confirm  월 확정
GET    /api/admin/schedules/validate        근무표 검증
GET    /api/employee/dashboard              직원 대시보드
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, extract
from datetime import date, datetime, timedelta
from typing import Optional, List
import calendar

from app.dependencies.auth import get_current_user, require_admin
from app.dependencies.db import get_db
from app.models.user import User
from app.models.schedule import Schedule, SchedulePeriod
from app.models.shift_type import ShiftType
from app.models.system_settings import SystemSettings
from app.schemas.schedule import (
    ScheduleListResponse, ScheduleItem, ShiftTypeInfo,
    ScheduleBulkRequest, ScheduleBulkResponse,
    ScheduleUpdateRequest, ScheduleUpdateResponse,
    ConfirmResponse,
    ValidateResponse, ValidationWarning,
    DashboardResponse, WeekdaySchedule,
)

router = APIRouter()


# ════════════════════════════════════════════════════════
# 📖 GET /api/schedules  —  근무표 조회 (관리자·직원 공용)
# ════════════════════════════════════════════════════════
@router.get("/api/schedules", response_model=ScheduleListResponse)
def get_schedules(
    year: int = Query(..., description="연도"),
    month: int = Query(..., description="월"),
    user_id: Optional[int] = Query(None, description="특정 직원 필터"),
    shift_type_id: Optional[int] = Query(None, description="근무 유형 필터"),
    mine: bool = Query(False, description="본인 근무만 보기"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 해당 월 날짜 범위 계산
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    query = (
        db.query(Schedule)
        .filter(
            Schedule.work_date.between(first_day, last_day),
            Schedule.is_deleted == False,
        )
    )

    # 직원은 mine=True 강제 (본인 데이터만)
    if current_user.role == "employee" or mine:
        query = query.filter(Schedule.user_id == current_user.user_id)

    if user_id:
        query = query.filter(Schedule.user_id == user_id)

    if shift_type_id:
        query = query.filter(Schedule.shift_type_id == shift_type_id)

    schedules = query.order_by(Schedule.work_date, Schedule.user_id).all()

    result = []
    for s in schedules:
        result.append(ScheduleItem(
            schedule_id=s.schedule_id,
            user_id=s.user_id,
            user_name=s.user.name,
            work_date=s.work_date,
            shift_type=ShiftTypeInfo(
                id=s.shift_type.shift_type_id,
                code=s.shift_type.code,
                label=s.shift_type.label,
                color=s.shift_type.color,
                is_work_day=s.shift_type.is_work_day,
            ),
            is_locked=s.is_locked,
            version=s.version,
        ))

    return ScheduleListResponse(data=result)


# ════════════════════════════════════════════════════════
# 📖 GET /api/schedules/me  —  내 근무표 조회
# ════════════════════════════════════════════════════════
@router.get("/api/schedules/me", response_model=ScheduleListResponse)
def get_my_schedules(
    year: int = Query(...),
    month: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    schedules = (
        db.query(Schedule)
        .filter(
            Schedule.user_id == current_user.user_id,
            Schedule.work_date.between(first_day, last_day),
            Schedule.is_deleted == False,
        )
        .order_by(Schedule.work_date)
        .all()
    )

    result = [
        ScheduleItem(
            schedule_id=s.schedule_id,
            user_id=s.user_id,
            user_name=s.user.name,
            work_date=s.work_date,
            shift_type=ShiftTypeInfo(
                id=s.shift_type.shift_type_id,
                code=s.shift_type.code,
                label=s.shift_type.label,
                color=s.shift_type.color,
                is_work_day=s.shift_type.is_work_day,
            ),
            is_locked=s.is_locked,
            version=s.version,
        )
        for s in schedules
    ]
    return ScheduleListResponse(data=result)


# ════════════════════════════════════════════════════════
# 📝 POST /api/admin/schedules/bulk  —  배치 저장 (upsert)
# ════════════════════════════════════════════════════════
@router.post("/api/admin/schedules/bulk", response_model=ScheduleBulkResponse)
def bulk_upsert_schedules(
    body: ScheduleBulkRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    upserted = 0

    try:
        for item in body.items:
            # shift_type 존재 확인
            shift = db.query(ShiftType).filter(
                ShiftType.shift_type_id == item.shift_type_id
            ).first()
            if not shift:
                raise HTTPException(
                    status_code=404,
                    detail=f"shift_type_id {item.shift_type_id} 를 찾을 수 없습니다.",
                )

            # 기존 레코드 조회 (soft delete 제외)
            existing = db.query(Schedule).filter(
                Schedule.user_id == item.user_id,
                Schedule.work_date == item.work_date,
                Schedule.is_deleted == False,
            ).first()

            if existing:
                # UPDATE: is_locked 상태면 건드리지 않음
                if existing.is_locked:
                    continue
                existing.shift_type_id = item.shift_type_id
                existing.version += 1
            else:
                # INSERT
                new_schedule = Schedule(
                    user_id=item.user_id,
                    work_date=item.work_date,
                    shift_type_id=item.shift_type_id,
                    is_locked=False,
                    version=0,
                    is_deleted=False,
                )
                db.add(new_schedule)

            upserted += 1

        db.commit()

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"저장 중 오류가 발생했습니다: {str(e)}")

    return ScheduleBulkResponse(success=True, upserted=upserted)


# ════════════════════════════════════════════════════════
# ✏️  PUT /api/admin/schedules/{schedule_id}  —  단건 수정
# ════════════════════════════════════════════════════════
@router.put("/api/admin/schedules/{schedule_id}", response_model=ScheduleUpdateResponse)
def update_schedule(
    schedule_id: int,
    body: ScheduleUpdateRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    schedule = db.query(Schedule).filter(
        Schedule.schedule_id == schedule_id,
        Schedule.is_deleted == False,
    ).first()

    if not schedule:
        raise HTTPException(status_code=404, detail="해당 근무표를 찾을 수 없습니다.")

    # 잠금 확인
    if schedule.is_locked:
        raise HTTPException(
            status_code=422,
            detail="교대 협의 중인 근무표는 수정할 수 없습니다. (SCHEDULE_LOCKED)",
        )

    # 낙관적 잠금 확인
    if schedule.version != body.version:
        raise HTTPException(
            status_code=409,
            detail="다른 사용자가 이미 수정했습니다. 최신 데이터를 다시 조회해 주세요. (VERSION_CONFLICT)",
        )

    # shift_type 존재 확인
    shift = db.query(ShiftType).filter(
        ShiftType.shift_type_id == body.shift_type_id
    ).first()
    if not shift:
        raise HTTPException(status_code=404, detail="해당 근무 유형을 찾을 수 없습니다.")

    # 수정 적용
    schedule.shift_type_id = body.shift_type_id
    schedule.version += 1

    # 확정 후 수정 시 해당 직원 수락 무효화
    from app.models.employee_acceptance import EmployeeAcceptance
    work_date = schedule.work_date
    acceptance = db.query(EmployeeAcceptance).filter(
        EmployeeAcceptance.user_id == schedule.user_id,
        EmployeeAcceptance.year == work_date.year,
        EmployeeAcceptance.month == work_date.month,
    ).first()
    if acceptance:
        acceptance.is_valid = False

    # 변경 이력 기록 (schedule_logs)
    # NOTE: 팀장 담당 테이블이므로 import 후 사용
    # from app.models.schedule_log import ScheduleLog
    # db.add(ScheduleLog(...))

    db.commit()
    db.refresh(schedule)

    return ScheduleUpdateResponse(schedule_id=schedule.schedule_id, version=schedule.version)


# ════════════════════════════════════════════════════════
# 🗑️  DELETE /api/admin/schedules/{schedule_id}  —  소프트 삭제
# ════════════════════════════════════════════════════════
@router.delete("/api/admin/schedules/{schedule_id}", status_code=204)
def delete_schedule(
    schedule_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    schedule = db.query(Schedule).filter(
        Schedule.schedule_id == schedule_id,
        Schedule.is_deleted == False,
    ).first()

    if not schedule:
        raise HTTPException(status_code=404, detail="해당 근무표를 찾을 수 없습니다.")

    if schedule.is_locked:
        raise HTTPException(
            status_code=422,
            detail="교대 협의 중인 근무표는 삭제할 수 없습니다.",
        )

    schedule.is_deleted = True
    db.commit()


# ════════════════════════════════════════════════════════
# ✅ POST /api/admin/schedules/{year}/{month}/confirm  —  월 확정
# ════════════════════════════════════════════════════════
@router.post(
    "/api/admin/schedules/{year}/{month}/confirm",
    response_model=ConfirmResponse,
)
def confirm_schedule(
    year: int,
    month: int,
    force: bool = Query(False, description="검증 경고 무시 후 강제 확정"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # 이미 확정됐는지 확인
    existing = db.query(SchedulePeriod).filter(
        SchedulePeriod.year == year,
        SchedulePeriod.month == month,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="이미 확정된 월입니다.")

    # force=False일 때 검증 먼저 실행
    if not force:
        warnings = _run_validation(year, month, db)
        if warnings:
            raise HTTPException(
                status_code=422,
                detail={
                    "message": "검증 경고가 있습니다. force=true 파라미터로 강제 확정하거나 먼저 경고를 해결하세요.",
                    "warnings": [w.dict() for w in warnings],
                },
            )

    period = SchedulePeriod(
        year=year,
        month=month,
        confirmed_at=datetime.utcnow(),
        confirmed_by=current_user.user_id,
    )
    db.add(period)
    db.commit()
    db.refresh(period)

    # 전체 직원에게 근무표 확정 알림 발송
    # NOTE: 알림 테이블은 팀장 담당 — 팀장 코드 완성 후 연결
    # _send_confirm_notifications(year, month, db)

    return ConfirmResponse(
        year=year,
        month=month,
        confirmed_at=period.confirmed_at,
        period_id=period.period_id,
    )


# ════════════════════════════════════════════════════════
# 🔍 GET /api/admin/schedules/validate  —  근무표 검증
# ════════════════════════════════════════════════════════
@router.get("/api/admin/schedules/validate", response_model=ValidateResponse)
def validate_schedules(
    year: int = Query(...),
    month: int = Query(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    warnings = _run_validation(year, month, db)
    return ValidateResponse(
        year=year,
        month=month,
        warnings=warnings,
        has_warnings=len(warnings) > 0,
    )


def _run_validation(year: int, month: int, db: Session) -> List[ValidationWarning]:
    """
    검증 로직 내부 함수 (confirm + validate 공용)
    system_settings 에서 기준값 읽기 — 하드코딩 금지
    """
    settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
    if not settings:
        raise HTTPException(status_code=500, detail="시스템 설정값을 찾을 수 없습니다.")

    max_consecutive_night = settings.max_consecutive_night   # 예: 3
    min_daily_staff = settings.min_daily_staff               # 예: 3
    min_avg_years = settings.min_avg_years                   # 예: 2

    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    schedules = (
        db.query(Schedule)
        .filter(
            Schedule.work_date.between(first_day, last_day),
            Schedule.is_deleted == False,
        )
        .order_by(Schedule.user_id, Schedule.work_date)
        .all()
    )

    warnings: List[ValidationWarning] = []

    # ── 직원별 그룹화 ────────────────────────────────────
    from collections import defaultdict
    by_user: dict = defaultdict(list)
    by_date: dict = defaultdict(list)

    for s in schedules:
        by_user[s.user_id].append(s)
        by_date[s.work_date].append(s)

    # ── 검증 1: 연속 야간근무 + 야간 후 주간 배정 ────────
    for user_id, user_schedules in by_user.items():
        sorted_s = sorted(user_schedules, key=lambda x: x.work_date)
        consecutive_night = 0

        for i, s in enumerate(sorted_s):
            if s.shift_type.code == "N":
                consecutive_night += 1
                if consecutive_night >= max_consecutive_night:
                    warnings.append(ValidationWarning(
                        type="consecutive_night",
                        message=f"{s.user.name}: {s.work_date} 기준 야간 근무 {consecutive_night}일 연속",
                        affected_date=s.work_date,
                        affected_user_id=user_id,
                        affected_user_name=s.user.name,
                    ))
                # 야간 다음 날 주간 배정
                if i + 1 < len(sorted_s):
                    next_s = sorted_s[i + 1]
                    next_date = s.work_date + timedelta(days=1)
                    if next_s.work_date == next_date and next_s.shift_type.code == "D":
                        warnings.append(ValidationWarning(
                            type="post_night_day",
                            message=f"{s.user.name}: {s.work_date} 야간 다음 날({next_date}) 주간 배정",
                            affected_date=next_date,
                            affected_user_id=user_id,
                            affected_user_name=s.user.name,
                        ))
            else:
                consecutive_night = 0

    # ── 검증 2: 날짜별 최소 인원 + 평균 연차 ────────────
    for work_date, date_schedules in by_date.items():
        work_day_shifts = [
            s for s in date_schedules if s.shift_type.is_work_day
        ]

        # 인원 부족
        if len(work_day_shifts) < min_daily_staff:
            warnings.append(ValidationWarning(
                type="understaffed",
                message=f"{work_date}: 근무 인원 {len(work_day_shifts)}명 (최소 {min_daily_staff}명 필요)",
                affected_date=work_date,
            ))

        # 평균 연차
        if work_day_shifts:
            avg_years = sum(
                s.user.years_of_experience for s in work_day_shifts
            ) / len(work_day_shifts)
            if avg_years < min_avg_years:
                warnings.append(ValidationWarning(
                    type="low_avg_years",
                    message=f"{work_date}: 평균 연차 {avg_years:.1f}년 (최소 {min_avg_years}년 필요)",
                    affected_date=work_date,
                ))

    return warnings


# ════════════════════════════════════════════════════════
# 🏠 GET /api/employee/dashboard  —  직원 대시보드
# ════════════════════════════════════════════════════════
@router.get("/api/employee/dashboard", response_model=DashboardResponse)
def employee_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()

    # 오늘 근무
    today_schedule = db.query(Schedule).filter(
        Schedule.user_id == current_user.user_id,
        Schedule.work_date == today,
        Schedule.is_deleted == False,
    ).first()

    # 이번 주 월~일 계산
    week_start = today - timedelta(days=today.weekday())  # 월요일
    week_end = week_start + timedelta(days=6)             # 일요일

    week_schedules = {
        s.work_date: s
        for s in db.query(Schedule).filter(
            Schedule.user_id == current_user.user_id,
            Schedule.work_date.between(week_start, week_end),
            Schedule.is_deleted == False,
        ).all()
    }

    this_week = []
    for i in range(7):
        d = week_start + timedelta(days=i)
        s = week_schedules.get(d)
        this_week.append(WeekdaySchedule(
            date=d,
            shift_code=s.shift_type.code if s else None,
            shift_label=s.shift_type.label if s else None,
            shift_color=s.shift_type.color if s else None,
        ))

    return DashboardResponse(
        today_shift_code=today_schedule.shift_type.code if today_schedule else None,
        today_shift_label=today_schedule.shift_type.label if today_schedule else None,
        today_shift_color=today_schedule.shift_type.color if today_schedule else None,
        this_week=this_week,
    )