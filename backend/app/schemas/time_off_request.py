from pydantic import BaseModel, field_validator
from datetime import date, datetime
from typing import Optional, Literal


# ──────────────────────────────────────────────────────────────
# 요청(Request) 스키마 — 클라이언트가 서버로 보내는 데이터 형식
# ──────────────────────────────────────────────────────────────

class TimeOffRequestCreate(BaseModel):
    """
    휴무·휴가 신청 시 클라이언트가 보내는 데이터
    예시:
    {
        "type": "VAC",
        "start_date": "2025-07-28",
        "end_date": "2025-07-30",
        "reason": "여름 휴가"
    }
    """

    # 신청 유형: OFF(휴무) 또는 VAC(휴가) 두 가지만 허용
    type: Literal["OFF", "VAC"]

    # 시작일
    start_date: date

    # 종료일 (하루 신청이면 start_date와 동일)
    end_date: date

    # 사유 (선택 입력)
    reason: Optional[str] = None

    @field_validator("end_date")
    @classmethod
    def end_date_must_be_gte_start(cls, end_date, values):
        """종료일이 시작일보다 앞에 올 수 없다"""
        # values.data로 이미 검증된 필드에 접근
        start = values.data.get("start_date")
        if start and end_date < start:
            raise ValueError("종료일은 시작일보다 이전일 수 없습니다")
        return end_date


class TimeOffRequestCancel(BaseModel):
    """
    신청 취소 시 보내는 데이터 (취소 사유는 선택 입력)
    """
    cancel_reason: Optional[str] = None


class TimeOffRequestApprove(BaseModel):
    """
    관리자가 승인할 때 보내는 데이터
    VAC 승인 시 기존 D/E/N 코드와 충돌하면
    force_overwrite=True로 재요청해야 함
    """
    admin_comment: Optional[str] = None
    force_overwrite: bool = False  # VAC 충돌 시 강제 덮어쓰기 여부


class TimeOffRequestReject(BaseModel):
    """관리자가 반려할 때 보내는 데이터"""
    admin_comment: Optional[str] = None


# ──────────────────────────────────────────────────────────────
# 응답(Response) 스키마 — 서버가 클라이언트로 돌려주는 데이터 형식
# ──────────────────────────────────────────────────────────────

class RequesterInfo(BaseModel):
    """응답에 포함되는 신청자 기본 정보"""
    user_id: int
    name: str

    class Config:
        from_attributes = True  # SQLAlchemy 모델 → Pydantic 자동 변환 허용


class TimeOffRequestResponse(BaseModel):
    """
    휴무·휴가 신청 단건 응답
    직원 본인 목록 조회, 관리자 전체 목록 조회 모두 이 형식으로 반환
    """
    request_id: int
    type: str                          # "OFF" 또는 "VAC"
    start_date: date
    end_date: date
    reason: Optional[str]
    status: str                        # "pending" / "approved" / "rejected" / "canceled"
    admin_comment: Optional[str]
    cancel_reason: Optional[str]
    created_at: datetime
    processed_at: Optional[datetime]

    # 관리자 화면에서 누가 신청했는지 보여주기 위한 신청자 정보
    requester: RequesterInfo

    class Config:
        from_attributes = True


class TimeOffRequestListResponse(BaseModel):
    """목록 조회 응답 — 여러 건을 배열로 감싸서 반환"""
    data: list[TimeOffRequestResponse]


# ──────────────────────────────────────────────────────────────
# 관리자 대시보드 응답 스키마
# ──────────────────────────────────────────────────────────────

class WeeklyScheduleItem(BaseModel):
    """이번 주 날짜별 근무자 수 항목"""
    date: str          # "2025-07-14" 형식
    working_count: int  # 해당 날짜 근무자 수


class AdminDashboardResponse(BaseModel):
    """
    관리자 대시보드 API 응답
    화면 상단 카드 4개 + 이번 주 근무 현황 차트 데이터
    """
    total_employees: int       # 전체 직원 수 (is_active=true)
    today_working: int         # 오늘 is_work_day=true 코드 배정 직원 수
    today_on_leave: int        # 오늘 VAC 코드 배정 직원 수
    pending_requests: int      # 승인 대기 건수 (휴무 + 교대 합산)
    this_week_schedule: list[WeeklyScheduleItem]  # 이번 주(월~일) 날짜별 근무자 수
