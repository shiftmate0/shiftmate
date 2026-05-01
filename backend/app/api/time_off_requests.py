from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.time_off_request import TimeOffRequest  # 팀장 모델
from app.models.shift_type import ShiftType             # 멤버1 모델
from app.models.schedule import Schedule                # 멤버2 모델
from app.schemas.time_off_request import (             # 내 스키마
    TimeOffRequestCreate,
    TimeOffRequestCancel,
    TimeOffRequestApprove,
    TimeOffRequestReject,
    TimeOffRequestResponse,
    TimeOffRequestListResponse,
)

router = APIRouter()


# ══════════════════════════════════════════════════════════════
# 직원 전용 API
# ══════════════════════════════════════════════════════════════

@router.post(
    "/requests",
    response_model=TimeOffRequestResponse,
    status_code=201,
    summary="휴무·휴가 신청",
)
def create_time_off_request(
    body: TimeOffRequestCreate,               # 클라이언트 JSON → Pydantic 자동 검증
    current_user=Depends(get_current_user),   # 로그인 사용자 자동 주입
    db: Session = Depends(get_db),            # DB 세션 자동 주입
):
    """
    직원이 휴무(OFF) 또는 휴가(VAC)를 신청합니다.

    비즈니스 규칙:
    - 같은 날짜 범위에 이미 pending 신청이 있으면 400 에러
    """

    # ── 중복 신청 차단 ──────────────────────────────────────────
    # 날짜 범위가 겹치는지 확인
    # 겹침 조건: 기존 start <= 신규 end AND 기존 end >= 신규 start
    duplicate = db.query(TimeOffRequest).filter(
        TimeOffRequest.requester_id == current_user.user_id,
        TimeOffRequest.status == "pending",
        TimeOffRequest.start_date <= body.end_date,
        TimeOffRequest.end_date >= body.start_date,
    ).first()

    if duplicate:
        raise HTTPException(
            status_code=400,
            detail="해당 날짜에 이미 대기 중인 신청이 있습니다",
        )

    # ── 신청 저장 ──────────────────────────────────────────────
    new_request = TimeOffRequest(
        requester_id=current_user.user_id,
        type=body.type,
        start_date=body.start_date,
        end_date=body.end_date,
        reason=body.reason,
        status="pending",  # 신청 직후 항상 대기 상태
    )

    db.add(new_request)      # DB에 추가 예약
    db.commit()              # 실제로 저장
    db.refresh(new_request)  # 저장 후 자동 생성된 ID 등 반영

    return new_request


@router.get(
    "/requests/me",
    response_model=TimeOffRequestListResponse,
    summary="내 요청 목록 조회",
)
def get_my_requests(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """로그인한 직원 본인의 휴무·휴가 신청 목록을 반환합니다. 최신순 정렬."""

    requests = (
        db.query(TimeOffRequest)
        .filter(TimeOffRequest.requester_id == current_user.user_id)
        .order_by(TimeOffRequest.created_at.desc())  # 최신순
        .all()
    )

    return {"data": requests}


@router.patch(
    "/requests/{request_id}/cancel",
    response_model=TimeOffRequestResponse,
    summary="요청 취소",
)
def cancel_request(
    request_id: int,                          # URL 경로에서 자동 추출
    body: TimeOffRequestCancel,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    직원이 본인의 신청을 취소합니다.
    - pending 상태인 신청만 취소 가능
    - 다른 사람의 신청 취소 불가
    """

    # ── 신청 존재 여부 확인 ────────────────────────────────────
    request = db.query(TimeOffRequest).filter(
        TimeOffRequest.request_id == request_id
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="신청을 찾을 수 없습니다")

    # ── 본인 신청인지 확인 ─────────────────────────────────────
    if request.requester_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="본인의 신청만 취소할 수 있습니다")

    # ── pending 상태인지 확인 ──────────────────────────────────
    if request.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="대기 중인 신청만 취소할 수 있습니다",
        )

    # ── 취소 처리 ──────────────────────────────────────────────
    request.status = "canceled"
    request.canceled_by = current_user.user_id
    request.cancel_reason = body.cancel_reason
    request.processed_at = datetime.utcnow()

    db.commit()
    db.refresh(request)

    return request


# ══════════════════════════════════════════════════════════════
# 관리자 전용 API
# ══════════════════════════════════════════════════════════════

@router.get(
    "/admin/requests",
    response_model=TimeOffRequestListResponse,
    summary="전체 요청 목록 조회 (관리자)",
)
def get_all_requests(
    status: str = None,                   # ?status=pending 으로 필터링 가능
    current_user=Depends(require_admin),  # 관리자만 접근 가능
    db: Session = Depends(get_db),
):
    """관리자가 전체 직원의 휴무·휴가 신청 목록을 조회합니다."""

    query = db.query(TimeOffRequest)

    # status 파라미터가 있으면 해당 상태만 필터링
    if status:
        query = query.filter(TimeOffRequest.status == status)

    requests = query.order_by(TimeOffRequest.created_at.desc()).all()

    return {"data": requests}


@router.patch(
    "/admin/requests/{request_id}/approve",
    response_model=TimeOffRequestResponse,
    summary="요청 승인 (관리자)",
)
def approve_request(
    request_id: int,
    body: TimeOffRequestApprove,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    관리자가 휴무·휴가 신청을 승인합니다.

    VAC 승인 시 추가 처리:
    - 해당 날짜 범위 schedules에 VAC 코드 자동 배정
    - 기존 D/E/N 코드가 있으면 force_overwrite=True 없이는 422 반환
    """

    # ── 신청 조회 ──────────────────────────────────────────────
    request = db.query(TimeOffRequest).filter(
        TimeOffRequest.request_id == request_id
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="신청을 찾을 수 없습니다")

    if request.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="대기 중인 신청만 승인할 수 있습니다",
        )

    # ── VAC 승인 시: schedules 테이블에 VAC 코드 자동 배정 ─────
    if request.type == "VAC":
        # VAC shift_type 조회
        vac_shift = db.query(ShiftType).filter(ShiftType.code == "VAC").first()

        if not vac_shift:
            raise HTTPException(status_code=500, detail="VAC 근무 유형을 찾을 수 없습니다")

        # start_date ~ end_date 사이 충돌 날짜 먼저 확인
        current_date = request.start_date
        conflict_dates = []

        while current_date <= request.end_date:
            existing = db.query(Schedule).filter(
                Schedule.user_id == request.requester_id,
                Schedule.work_date == current_date,
            ).first()

            if existing:
                existing_shift = db.query(ShiftType).filter(
                    ShiftType.shift_type_id == existing.shift_type_id
                ).first()
                # 실제 근무일(D/E/N) 코드가 있으면 충돌로 기록
                if existing_shift and existing_shift.is_work_day:
                    conflict_dates.append(str(current_date))

            current_date += timedelta(days=1)

        # 충돌이 있고 강제 덮어쓰기 없으면 422 반환
        if conflict_dates and not body.force_overwrite:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"다음 날짜에 이미 근무가 배정되어 있습니다: "
                    f"{', '.join(conflict_dates)}. "
                    f"force_overwrite=true로 재요청하세요."
                ),
            )

        # 실제 VAC 배정 처리 (충돌 없거나 force_overwrite=True)
        current_date = request.start_date
        while current_date <= request.end_date:
            existing = db.query(Schedule).filter(
                Schedule.user_id == request.requester_id,
                Schedule.work_date == current_date,
            ).first()

            if existing:
                # 기존 스케줄이 있으면 VAC로 업데이트
                existing.shift_type_id = vac_shift.shift_type_id
                existing.updated_at = datetime.utcnow()
            else:
                # 기존 스케줄이 없으면 새로 추가
                new_schedule = Schedule(
                    user_id=request.requester_id,
                    work_date=current_date,
                    shift_type_id=vac_shift.shift_type_id,
                )
                db.add(new_schedule)

            current_date += timedelta(days=1)

    # ── 신청 상태를 승인으로 변경 ──────────────────────────────
    # VAC 배정 + 상태 변경이 하나의 트랜잭션으로 처리됨
    # (중간에 에러 나면 둘 다 자동 롤백됨)
    request.status = "approved"
    request.admin_comment = body.admin_comment
    request.processed_at = datetime.utcnow()

    db.commit()
    db.refresh(request)

    return request


@router.patch(
    "/admin/requests/{request_id}/reject",
    response_model=TimeOffRequestResponse,
    summary="요청 반려 (관리자)",
)
def reject_request(
    request_id: int,
    body: TimeOffRequestReject,
    current_user=Depends(require_admin),
    db: Session = Depends(get_db),
):
    """관리자가 휴무·휴가 신청을 반려합니다."""

    request = db.query(TimeOffRequest).filter(
        TimeOffRequest.request_id == request_id
    ).first()

    if not request:
        raise HTTPException(status_code=404, detail="신청을 찾을 수 없습니다")

    if request.status != "pending":
        raise HTTPException(
            status_code=400,
            detail="대기 중인 신청만 반려할 수 있습니다",
        )

    request.status = "rejected"
    request.admin_comment = body.admin_comment
    request.processed_at = datetime.utcnow()

    db.commit()
    db.refresh(request)

    return request
