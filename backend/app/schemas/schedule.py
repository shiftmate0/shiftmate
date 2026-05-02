from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# ── 근무표 조회 응답 ──────────────────────────────────
class ScheduleItem(BaseModel):
    schedule_id: int
    user_id: int
    user_name: str
    work_date: date
    shift_type_id: int
    shift_code: str
    shift_color: str
    shift_label: str
    is_locked: bool

    class Config:
        from_attributes = True


class ScheduleListResponse(BaseModel):
    period_status: str  # "draft" | "confirmed"
    schedules: List[ScheduleItem]


# ── 근무표 배치 저장 ──────────────────────────────────
class ScheduleBulkItem(BaseModel):
    user_id: int
    work_date: date
    shift_type_id: int


class ScheduleBulkResponse(BaseModel):
    saved: int


# ── 근무표 단건 수정 ──────────────────────────────────
class ScheduleUpdateRequest(BaseModel):
    shift_type_id: int


class ScheduleUpdateResponse(BaseModel):
    schedule_id: int
    user_id: int
    work_date: date
    shift_type_id: int
    shift_code: str
    shift_label: str
    is_locked: bool


# ── 월 확정 ───────────────────────────────────────────
class ConfirmResponse(BaseModel):
    period_id: int
    year: int
    month: int
    status: str
    confirmed_at: datetime
    confirmed_by: int


# ── 검증 ──────────────────────────────────────────────
class ValidationWarning(BaseModel):
    type: str
    message: str
    affected_date: Optional[date] = None
    affected_user_id: Optional[int] = None
    affected_user_name: Optional[str] = None


class ValidateResponse(BaseModel):
    year: int
    month: int
    is_valid: bool
    has_warnings: bool
    warnings: List[ValidationWarning]


# ── 직원 대시보드 ─────────────────────────────────────
class TodaySchedule(BaseModel):
    work_date: date
    shift_code: str
    shift_label: str
    shift_color: str
    start_time: Optional[str] = None   # "HH:MM" | null
    end_time: Optional[str] = None     # "HH:MM" | null
    is_work_day: bool


class WeekdaySchedule(BaseModel):
    work_date: date
    day_label: str                      # 월~일
    shift_code: Optional[str] = None
    shift_label: Optional[str] = None
    shift_color: Optional[str] = None
    is_today: bool


class MyRequestItem(BaseModel):
    request_id: int
    type: str          # "OFF" | "VAC" | "SWAP"
    date_display: str
    status: str
    created_at: str


class DashboardResponse(BaseModel):
    today_schedule: Optional[TodaySchedule] = None
    this_week: List[WeekdaySchedule]
    my_requests: List[MyRequestItem]
