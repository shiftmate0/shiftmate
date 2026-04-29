from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


# ── 공용 ──────────────────────────────────────────────
class ShiftTypeInfo(BaseModel):
    id: int
    code: str
    label: str
    color: str
    is_work_day: bool

    class Config:
        from_attributes = True


# ── 근무표 조회 응답 ──────────────────────────────────
class ScheduleItem(BaseModel):
    schedule_id: int
    user_id: int
    user_name: str
    work_date: date
    shift_type: ShiftTypeInfo
    is_locked: bool
    version: int

    class Config:
        from_attributes = True


class ScheduleListResponse(BaseModel):
    data: List[ScheduleItem]


# ── 근무표 배치 저장 ──────────────────────────────────
class ScheduleBulkItem(BaseModel):
    user_id: int
    work_date: date
    shift_type_id: int


class ScheduleBulkRequest(BaseModel):
    items: List[ScheduleBulkItem]


class ScheduleBulkResponse(BaseModel):
    success: bool
    upserted: int  # 처리된 레코드 수


# ── 근무표 단건 수정 ──────────────────────────────────
class ScheduleUpdateRequest(BaseModel):
    shift_type_id: int
    version: int = Field(..., description="낙관적 잠금용 현재 version 값")
    change_reason: str


class ScheduleUpdateResponse(BaseModel):
    schedule_id: int
    version: int  # 업데이트된 새 version


# ── 월 확정 ───────────────────────────────────────────
class ConfirmResponse(BaseModel):
    year: int
    month: int
    confirmed_at: datetime
    period_id: int


# ── 검증 ──────────────────────────────────────────────
class ValidationWarning(BaseModel):
    type: str   # consecutive_night | post_night_day | understaffed | low_avg_years | overloaded
    message: str
    affected_date: Optional[date] = None
    affected_user_id: Optional[int] = None
    affected_user_name: Optional[str] = None


class ValidateResponse(BaseModel):
    year: int
    month: int
    warnings: List[ValidationWarning]
    has_warnings: bool


# ── 직원 대시보드 ─────────────────────────────────────
class WeekdaySchedule(BaseModel):
    date: date
    shift_code: Optional[str] = None
    shift_label: Optional[str] = None
    shift_color: Optional[str] = None


class DashboardResponse(BaseModel):
    today_shift_code: Optional[str]
    today_shift_label: Optional[str]
    today_shift_color: Optional[str]
    this_week: List[WeekdaySchedule]  # 월~일 7일
