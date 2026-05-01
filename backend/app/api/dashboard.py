from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta

from app.core.database import get_db
from app.dependencies.auth import require_admin
from app.models.user import User                          # 팀장 모델
from app.models.time_off_request import TimeOffRequest    # 팀장 모델
from app.models.swap_request import SwapRequest           # 팀장 모델
from app.models.shift_type import ShiftType               # 멤버1 모델
from app.models.schedule import Schedule                  # 멤버2 모델
from app.schemas.time_off_request import (               # 내 스키마
    AdminDashboardResponse,
    WeeklyScheduleItem,
)

router = APIRouter()


@router.get(
    "/admin/dashboard",
    response_model=AdminDashboardResponse,
    summary="관리자 대시보드",
)
def get_admin_dashboard(
    current_user=Depends(require_admin),  # 관리자만 접근 가능
    db: Session = Depends(get_db),
):
    """
    관리자 대시보드에 표시될 요약 데이터를 반환합니다.

    반환 항목:
    - total_employees  : 전체 재직 직원 수
    - today_working    : 오늘 is_work_day=true 코드 배정 직원 수
    - today_on_leave   : 오늘 VAC 코드 배정 직원 수
    - pending_requests : 승인 대기 건수 (휴무·휴가 + 교대 요청 합산)
    - this_week_schedule: 이번 주(월~일) 날짜별 근무자 수 배열
    """

    today = date.today()

    # ── 1. 전체 재직 직원 수 ───────────────────────────────────
    # is_active=True인 employee 역할 직원만 카운트 (관리자 제외)
    total_employees = db.query(func.count(User.user_id)).filter(
        User.is_active == True,
        User.role == "employee",
    ).scalar()  # 숫자 하나만 꺼내옴

    # ── 2. 오늘 근무자 수 ──────────────────────────────────────
    # 오늘 날짜 schedules에서 is_work_day=True인 코드(D/E/N) 배정 직원 수
    today_working = (
        db.query(func.count(Schedule.schedule_id))
        .join(ShiftType, Schedule.shift_type_id == ShiftType.shift_type_id)
        .filter(
            Schedule.work_date == today,
            ShiftType.is_work_day == True,  # OFF/VAC 제외, D/E/N만 카운트
        )
        .scalar()
    )

    # ── 3. 오늘 휴가자 수 ──────────────────────────────────────
    # 오늘 VAC 코드 배정된 직원 수
    vac_shift = db.query(ShiftType).filter(ShiftType.code == "VAC").first()

    today_on_leave = 0
    if vac_shift:
        today_on_leave = db.query(func.count(Schedule.schedule_id)).filter(
            Schedule.work_date == today,
            Schedule.shift_type_id == vac_shift.shift_type_id,
        ).scalar()

    # ── 4. 승인 대기 건수 합산 ─────────────────────────────────
    # 휴무·휴가 pending 건수
    time_off_pending = db.query(func.count(TimeOffRequest.request_id)).filter(
        TimeOffRequest.status == "pending"
    ).scalar()

    # 교대 요청 pending + accepted 건수
    # accepted = 직원 간 합의 완료, 관리자 최종 승인 대기 중
    swap_pending = db.query(func.count(SwapRequest.swap_request_id)).filter(
        SwapRequest.status.in_(["pending", "accepted"])
    ).scalar()

    pending_requests = time_off_pending + swap_pending

    # ── 5. 이번 주(월~일) 날짜별 근무자 수 ────────────────────
    # 이번 주 월요일 계산 (weekday(): 월=0, 일=6)
    monday = today - timedelta(days=today.weekday())

    this_week_schedule = []
    for i in range(7):  # 월(0) ~ 일(6) 7일 반복
        day = monday + timedelta(days=i)

        # 해당 날짜에 is_work_day=True 코드 배정된 직원 수
        count = (
            db.query(func.count(Schedule.schedule_id))
            .join(ShiftType, Schedule.shift_type_id == ShiftType.shift_type_id)
            .filter(
                Schedule.work_date == day,
                ShiftType.is_work_day == True,
            )
            .scalar()
        )

        this_week_schedule.append(
            WeeklyScheduleItem(
                date=day.strftime("%Y-%m-%d"),  # "2025-07-14" 형식으로 변환
                working_count=count,
            )
        )

    return AdminDashboardResponse(
        total_employees=total_employees,
        today_working=today_working,
        today_on_leave=today_on_leave,
        pending_requests=pending_requests,
        this_week_schedule=this_week_schedule,
    )
