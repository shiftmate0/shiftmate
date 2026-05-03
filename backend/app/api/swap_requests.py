from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, update as sql_update
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.schedule import Schedule
from app.models.shift_type import ShiftType
from app.models.swap_proposal import SwapProposal
from app.models.swap_request import SwapRequest
from app.models.user import User

router = APIRouter()


# ─── Pydantic 스키마 ────────────────────────────────────────────────────────
class SwapRequestCreate(BaseModel):
    requester_schedule_id: int
    required_years_min: int
    required_years_max: int
    expires_hours: int = 24


class ProposalCreate(BaseModel):
    proposer_schedule_id: int


class AcceptProposal(BaseModel):
    proposal_id: int


class AdminReject(BaseModel):
    admin_comment: str = ""


# ════════════════════════════════════════════════════════
# POST /api/swap-requests  —  교대 요청 생성 (PRD_11)
# ════════════════════════════════════════════════════════
@router.post("/swap-requests", status_code=201, summary="교대 요청 생성")
def create_swap_request(
    body: SwapRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "employee":
        raise HTTPException(status_code=403, detail="직원만 교대 요청을 생성할 수 있습니다")

    schedule = db.query(Schedule).filter(Schedule.schedule_id == body.requester_schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="스케줄을 찾을 수 없습니다")

    if schedule.user_id != current_user.user_id:
        raise HTTPException(status_code=400, detail="본인의 시프트만 교대 요청할 수 있습니다")

    if schedule.work_date <= date.today():
        raise HTTPException(status_code=400, detail="오늘 이후 날짜의 시프트만 교대 요청할 수 있습니다")

    duplicate = db.query(SwapRequest).filter(
        SwapRequest.requester_schedule_id == body.requester_schedule_id,
        SwapRequest.status == "pending",
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="이미 대기 중인 교대 요청이 있습니다")

    if body.required_years_min > body.required_years_max:
        raise HTTPException(status_code=400, detail="연차 최솟값은 최댓값보다 클 수 없습니다")

    # 원자적 CAS: is_locked=False 인 경우에만 True 로 갱신
    lock_result = db.execute(
        sql_update(Schedule)
        .where(Schedule.schedule_id == body.requester_schedule_id)
        .where(Schedule.is_locked == False)
        .values(is_locked=True)
        .execution_options(synchronize_session=False)
    )
    if lock_result.rowcount == 0:
        raise HTTPException(status_code=409, detail="교대 협의 중인 시프트는 요청할 수 없습니다")

    hours = max(1, min(72, body.expires_hours))
    swap_req = SwapRequest(
        requester_id=current_user.user_id,
        requester_schedule_id=body.requester_schedule_id,
        requester_years_at_request=current_user.years_of_experience,
        required_years_min=body.required_years_min,
        required_years_max=body.required_years_max,
        status="pending",
        expires_at=datetime.now() + timedelta(hours=hours),
    )
    db.add(swap_req)
    db.commit()
    db.refresh(swap_req)

    return {
        "swap_request_id": swap_req.swap_request_id,
        "requester_id": swap_req.requester_id,
        "requester_schedule_id": swap_req.requester_schedule_id,
        "requester_years_at_request": swap_req.requester_years_at_request,
        "required_years_min": swap_req.required_years_min,
        "required_years_max": swap_req.required_years_max,
        "status": swap_req.status,
        "expires_at": swap_req.expires_at,
        "created_at": swap_req.created_at,
    }


# ════════════════════════════════════════════════════════
# GET /api/swap-requests  —  목록 조회 (PRD_11)
# ════════════════════════════════════════════════════════
@router.get("/swap-requests", summary="교대 요청 목록 조회")
def list_swap_requests(
    status: str = None,
    role: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now()

    expired_list = db.query(SwapRequest).filter(
        SwapRequest.status == "pending",
        SwapRequest.expires_at < now,
    ).all()
    for req in expired_list:
        req.status = "expired"
    if expired_list:
        db.commit()

    qs = db.query(SwapRequest)

    if current_user.role != "admin":
        if role == "requester":
            qs = qs.filter(SwapRequest.requester_id == current_user.user_id)
        elif role == "proposer":
            proposer_ids = (
                db.query(SwapProposal.swap_request_id)
                .filter(SwapProposal.proposer_id == current_user.user_id)
                .subquery()
            )
            qs = qs.filter(SwapRequest.swap_request_id.in_(proposer_ids))
        else:
            proposer_ids = (
                db.query(SwapProposal.swap_request_id)
                .filter(SwapProposal.proposer_id == current_user.user_id)
                .subquery()
            )
            qs = qs.filter(
                (SwapRequest.requester_id == current_user.user_id)
                | SwapRequest.swap_request_id.in_(proposer_ids)
            )

    if status:
        qs = qs.filter(SwapRequest.status == status)

    swap_list = qs.order_by(SwapRequest.created_at.desc()).all()

    result = []
    for req in swap_list:
        schedule = db.query(Schedule).filter(Schedule.schedule_id == req.requester_schedule_id).first()
        shift_type = (
            db.query(ShiftType).filter(ShiftType.shift_type_id == schedule.shift_type_id).first()
            if schedule else None
        )
        requester = db.query(User).filter(User.user_id == req.requester_id).first()
        proposal_count = (
            db.query(func.count(SwapProposal.swap_proposal_id))
            .filter(SwapProposal.swap_request_id == req.swap_request_id)
            .scalar()
        )
        result.append({
            "swap_request_id": req.swap_request_id,
            "requester_id": req.requester_id,
            "requester_name": requester.name if requester else None,
            "requester_schedule_id": req.requester_schedule_id,
            "work_date": schedule.work_date.isoformat() if schedule else None,
            "shift_code": shift_type.code if shift_type else None,
            "shift_color": shift_type.color if shift_type else None,
            "shift_label": shift_type.label if shift_type else None,
            "requester_years_at_request": req.requester_years_at_request,
            "required_years_min": req.required_years_min,
            "required_years_max": req.required_years_max,
            "status": req.status,
            "proposal_count": proposal_count,
            "expires_at": req.expires_at,
            "created_at": req.created_at,
        })

    return result


# ════════════════════════════════════════════════════════
# GET /api/swap-requests/{id}  —  상세 조회 (PRD_12)
# ════════════════════════════════════════════════════════
@router.get("/swap-requests/{swap_request_id}", summary="교대 요청 상세 조회")
def get_swap_request(
    swap_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    swap_req = db.query(SwapRequest).filter(SwapRequest.swap_request_id == swap_request_id).first()
    if not swap_req:
        raise HTTPException(status_code=404, detail="교대 요청을 찾을 수 없습니다")

    if current_user.role != "admin":
        is_requester = swap_req.requester_id == current_user.user_id
        is_proposer = db.query(SwapProposal).filter(
            SwapProposal.swap_request_id == swap_request_id,
            SwapProposal.proposer_id == current_user.user_id,
        ).first() is not None
        if not is_requester and not is_proposer:
            raise HTTPException(status_code=403, detail="접근 권한이 없습니다")

    schedule = db.query(Schedule).filter(Schedule.schedule_id == swap_req.requester_schedule_id).first()
    shift_type = (
        db.query(ShiftType).filter(ShiftType.shift_type_id == schedule.shift_type_id).first()
        if schedule else None
    )
    requester = db.query(User).filter(User.user_id == swap_req.requester_id).first()

    proposals_raw = (
        db.query(SwapProposal)
        .filter(SwapProposal.swap_request_id == swap_request_id)
        .order_by(SwapProposal.created_at.asc())
        .all()
    )

    proposals = []
    for p in proposals_raw:
        proposer = db.query(User).filter(User.user_id == p.proposer_id).first()
        p_sched = db.query(Schedule).filter(Schedule.schedule_id == p.proposer_schedule_id).first()
        p_shift = (
            db.query(ShiftType).filter(ShiftType.shift_type_id == p_sched.shift_type_id).first()
            if p_sched else None
        )
        proposals.append({
            "swap_proposal_id": p.swap_proposal_id,
            "proposer_id": p.proposer_id,
            "proposer_name": proposer.name if proposer else None,
            "proposer_schedule_id": p.proposer_schedule_id,
            "proposer_work_date": p_sched.work_date.isoformat() if p_sched else None,
            "proposer_shift_code": p_shift.code if p_shift else None,
            "proposer_shift_color": p_shift.color if p_shift else None,
            "proposer_shift_label": p_shift.label if p_shift else None,
            "proposer_years_at_proposal": p.proposer_years_at_proposal,
            "status": p.status,
            "created_at": p.created_at,
        })

    return {
        "swap_request_id": swap_req.swap_request_id,
        "requester_id": swap_req.requester_id,
        "requester_name": requester.name if requester else None,
        "requester_schedule_id": swap_req.requester_schedule_id,
        "work_date": schedule.work_date.isoformat() if schedule else None,
        "shift_code": shift_type.code if shift_type else None,
        "shift_color": shift_type.color if shift_type else None,
        "shift_label": shift_type.label if shift_type else None,
        "requester_years_at_request": swap_req.requester_years_at_request,
        "required_years_min": swap_req.required_years_min,
        "required_years_max": swap_req.required_years_max,
        "status": swap_req.status,
        "accepted_proposal_id": swap_req.accepted_proposal_id,
        "admin_comment": swap_req.admin_comment,
        "expires_at": swap_req.expires_at,
        "created_at": swap_req.created_at,
        "proposals": proposals,
    }


# ════════════════════════════════════════════════════════
# PATCH /api/swap-requests/{id}/cancel  —  요청 취소 (PRD_11)
# ════════════════════════════════════════════════════════
@router.patch("/swap-requests/{swap_request_id}/cancel", summary="교대 요청 취소")
def cancel_swap_request(
    swap_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    swap_req = db.query(SwapRequest).filter(SwapRequest.swap_request_id == swap_request_id).first()
    if not swap_req:
        raise HTTPException(status_code=404, detail="교대 요청을 찾을 수 없습니다")

    if swap_req.requester_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="본인의 요청만 취소할 수 있습니다")

    if swap_req.status != "pending":
        raise HTTPException(status_code=400, detail="대기 중인 요청만 취소할 수 있습니다")

    swap_req.status = "rejected"

    requester_schedule = db.query(Schedule).filter(
        Schedule.schedule_id == swap_req.requester_schedule_id
    ).first()
    if requester_schedule:
        requester_schedule.is_locked = False

    proposals = db.query(SwapProposal).filter(
        SwapProposal.swap_request_id == swap_request_id
    ).all()
    for proposal in proposals:
        proposal.status = "rejected"
        proposer_schedule = db.query(Schedule).filter(
            Schedule.schedule_id == proposal.proposer_schedule_id
        ).first()
        if proposer_schedule:
            proposer_schedule.is_locked = False

    db.commit()
    return {"swap_request_id": swap_request_id, "status": "rejected"}


# ════════════════════════════════════════════════════════
# POST /api/swap-requests/{id}/proposals  —  제안 생성 (PRD_12)
# ════════════════════════════════════════════════════════
@router.post("/swap-requests/{swap_request_id}/proposals", status_code=201, summary="교대 제안 생성")
def create_proposal(
    swap_request_id: int,
    body: ProposalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. 직원만 제안 가능
    if current_user.role != "employee":
        raise HTTPException(status_code=403, detail="직원만 제안할 수 있습니다")

    # 2. 교대 요청 존재 확인
    swap_req = db.query(SwapRequest).filter(SwapRequest.swap_request_id == swap_request_id).first()
    if not swap_req:
        raise HTTPException(status_code=404, detail="교대 요청을 찾을 수 없습니다")

    # 3. 본인 요청에 제안 불가
    if swap_req.requester_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="본인 요청에 제안할 수 없습니다")

    # 4. pending 상태 확인
    if swap_req.status != "pending":
        raise HTTPException(status_code=400, detail="대기 중인 요청에만 제안할 수 있습니다")

    # 5. 만료 이중 체크
    if swap_req.expires_at < datetime.now():
        swap_req.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="만료된 요청입니다")

    # 6. 제안 시프트 존재 확인
    prop_schedule = db.query(Schedule).filter(
        Schedule.schedule_id == body.proposer_schedule_id
    ).first()
    if not prop_schedule:
        raise HTTPException(status_code=404, detail="스케줄을 찾을 수 없습니다")

    # 7. 본인 시프트 확인
    if prop_schedule.user_id != current_user.user_id:
        raise HTTPException(status_code=400, detail="본인 시프트만 제안할 수 있습니다")

    # 8. 오늘 이후 날짜 확인
    if prop_schedule.work_date <= date.today():
        raise HTTPException(status_code=400, detail="오늘 이후 날짜의 시프트만 제안할 수 있습니다")

    # 9. 중복 제안 확인
    duplicate = db.query(SwapProposal).filter(
        SwapProposal.swap_request_id == swap_request_id,
        SwapProposal.proposer_id == current_user.user_id,
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="이미 이 요청에 제안하셨습니다")

    # 10. 연차 검증
    years = current_user.years_of_experience
    if not (swap_req.required_years_min <= years <= swap_req.required_years_max):
        raise HTTPException(
            status_code=400,
            detail=(
                f"연차 조건을 충족하지 않습니다 "
                f"(요청 조건: {swap_req.required_years_min}~{swap_req.required_years_max}년차, "
                f"현재 연차: {years}년차)"
            ),
        )

    # 11. 원자적 CAS: proposer 시프트 잠금
    lock_result = db.execute(
        sql_update(Schedule)
        .where(Schedule.schedule_id == body.proposer_schedule_id)
        .where(Schedule.is_locked == False)
        .values(is_locked=True)
        .execution_options(synchronize_session=False)
    )
    if lock_result.rowcount == 0:
        raise HTTPException(status_code=409, detail="교대 협의 중인 시프트는 제안할 수 없습니다")

    proposal = SwapProposal(
        swap_request_id=swap_request_id,
        proposer_id=current_user.user_id,
        proposer_schedule_id=body.proposer_schedule_id,
        proposer_years_at_proposal=current_user.years_of_experience,
        status="proposed",
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    return {
        "swap_proposal_id": proposal.swap_proposal_id,
        "swap_request_id": proposal.swap_request_id,
        "proposer_id": proposal.proposer_id,
        "proposer_schedule_id": proposal.proposer_schedule_id,
        "proposer_years_at_proposal": proposal.proposer_years_at_proposal,
        "status": proposal.status,
        "created_at": proposal.created_at,
    }


# ════════════════════════════════════════════════════════
# PATCH /api/swap-requests/{id}/accept  —  제안 선택 (PRD_12)
# ════════════════════════════════════════════════════════
@router.patch("/swap-requests/{swap_request_id}/accept", summary="교대 제안 선택")
def accept_proposal(
    swap_request_id: int,
    body: AcceptProposal,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    swap_req = db.query(SwapRequest).filter(SwapRequest.swap_request_id == swap_request_id).first()
    if not swap_req:
        raise HTTPException(status_code=404, detail="교대 요청을 찾을 수 없습니다")

    if swap_req.requester_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="본인의 요청만 처리할 수 있습니다")

    if swap_req.status != "pending":
        raise HTTPException(status_code=400, detail="대기 중인 요청만 제안을 선택할 수 있습니다")

    proposal = db.query(SwapProposal).filter(
        SwapProposal.swap_proposal_id == body.proposal_id
    ).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="제안을 찾을 수 없습니다")

    if proposal.swap_request_id != swap_request_id:
        raise HTTPException(status_code=400, detail="이 요청의 제안이 아닙니다")

    now = datetime.now()

    # 선택된 제안 확정
    proposal.status = "selected"
    proposal.selected_at = now

    # 나머지 제안 거절 + proposer 스케줄 잠금 해제
    others = db.query(SwapProposal).filter(
        SwapProposal.swap_request_id == swap_request_id,
        SwapProposal.swap_proposal_id != body.proposal_id,
    ).all()
    for other in others:
        other.status = "rejected"
        other.rejected_at = now
        other_sched = db.query(Schedule).filter(
            Schedule.schedule_id == other.proposer_schedule_id
        ).first()
        if other_sched:
            other_sched.is_locked = False

    # 교대 요청 상태 업데이트 (선택된 proposer_schedule is_locked 유지)
    swap_req.status = "accepted"
    swap_req.accepted_proposal_id = body.proposal_id
    swap_req.accepted_at = now

    db.commit()

    return {
        "swap_request_id": swap_req.swap_request_id,
        "status": swap_req.status,
        "accepted_proposal_id": swap_req.accepted_proposal_id,
        "accepted_at": swap_req.accepted_at,
    }


# ════════════════════════════════════════════════════════
# PATCH /api/admin/swap-requests/{id}/approve  —  관리자 승인 (PRD_13)
# ════════════════════════════════════════════════════════
@router.patch("/admin/swap-requests/{swap_request_id}/approve", summary="교대 요청 승인 (관리자)")
def approve_swap_request(
    swap_request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    swap_req = db.query(SwapRequest).filter(SwapRequest.swap_request_id == swap_request_id).first()
    if not swap_req:
        raise HTTPException(status_code=404, detail="교대 요청을 찾을 수 없습니다")

    if swap_req.status == "pending":
        raise HTTPException(status_code=400, detail="제안이 선택된 요청만 승인할 수 있습니다")

    if swap_req.status in ("approved", "rejected", "expired"):
        raise HTTPException(status_code=400, detail="이미 처리된 요청입니다")

    # status == 'accepted' 만 통과
    proposal = db.query(SwapProposal).filter(
        SwapProposal.swap_proposal_id == swap_req.accepted_proposal_id
    ).first()
    if not proposal:
        raise HTTPException(status_code=400, detail="선택된 제안을 찾을 수 없습니다")

    req_schedule = db.query(Schedule).filter(
        Schedule.schedule_id == swap_req.requester_schedule_id
    ).first()
    prop_schedule = db.query(Schedule).filter(
        Schedule.schedule_id == proposal.proposer_schedule_id
    ).first()

    if not req_schedule or not prop_schedule:
        raise HTTPException(status_code=400, detail="스케줄 정보를 찾을 수 없습니다")

    req_shift_type_id = req_schedule.shift_type_id
    prop_shift_type_id = prop_schedule.shift_type_id

    # 데드락 방지: 낮은 schedule_id 순서로 처리
    pairs = sorted(
        [(req_schedule, prop_shift_type_id), (prop_schedule, req_shift_type_id)],
        key=lambda x: x[0].schedule_id,
    )

    now = datetime.now()

    # 두 근무표 교환 + 요청 상태 변경을 단일 트랜잭션으로 처리
    try:
        for sched, new_type_id in pairs:
            result = db.execute(
                sql_update(Schedule)
                .where(Schedule.schedule_id == sched.schedule_id)
                .where(Schedule.version == sched.version)
                .values(
                    shift_type_id=new_type_id,
                    is_locked=False,
                    version=sched.version + 1,
                    updated_at=now,
                )
                .execution_options(synchronize_session=False)
            )
            if result.rowcount == 0:
                raise HTTPException(
                    status_code=409,
                    detail="동시성 충돌이 발생했습니다. 다시 시도해 주세요",
                )

        swap_req.status = "approved"
        swap_req.updated_at = now
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="교대 승인 처리 중 오류가 발생했습니다")

    return {
        "swap_request_id": swap_req.swap_request_id,
        "status": "approved",
        "requester_schedule_id": swap_req.requester_schedule_id,
        "proposer_schedule_id": proposal.proposer_schedule_id,
        "approved_at": now,
    }


# ════════════════════════════════════════════════════════
# PATCH /api/admin/swap-requests/{id}/reject  —  관리자 반려 (PRD_13)
# ════════════════════════════════════════════════════════
@router.patch("/admin/swap-requests/{swap_request_id}/reject", summary="교대 요청 반려 (관리자)")
def reject_swap_request_admin(
    swap_request_id: int,
    body: AdminReject,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    swap_req = db.query(SwapRequest).filter(SwapRequest.swap_request_id == swap_request_id).first()
    if not swap_req:
        raise HTTPException(status_code=404, detail="교대 요청을 찾을 수 없습니다")

    if swap_req.status not in ("pending", "accepted"):
        raise HTTPException(status_code=400, detail="이미 처리된 요청입니다")

    now = datetime.now()
    was_accepted = swap_req.status == "accepted"

    swap_req.status = "rejected"
    swap_req.admin_comment = body.admin_comment
    swap_req.updated_at = now

    # requester 스케줄 잠금 해제
    req_schedule = db.query(Schedule).filter(
        Schedule.schedule_id == swap_req.requester_schedule_id
    ).first()
    if req_schedule:
        req_schedule.is_locked = False

    if was_accepted and swap_req.accepted_proposal_id:
        # 선택된 proposer 스케줄 잠금 해제 + 전체 proposals 거절
        accepted_prop = db.query(SwapProposal).filter(
            SwapProposal.swap_proposal_id == swap_req.accepted_proposal_id
        ).first()
        if accepted_prop:
            prop_sched = db.query(Schedule).filter(
                Schedule.schedule_id == accepted_prop.proposer_schedule_id
            ).first()
            if prop_sched:
                prop_sched.is_locked = False

        for prop in db.query(SwapProposal).filter(
            SwapProposal.swap_request_id == swap_request_id
        ).all():
            prop.status = "rejected"
            prop.rejected_at = now
    else:
        # pending 상태: 전체 proposals 거절 + 각 proposer 스케줄 잠금 해제
        for prop in db.query(SwapProposal).filter(
            SwapProposal.swap_request_id == swap_request_id
        ).all():
            prop.status = "rejected"
            prop.rejected_at = now
            p_sched = db.query(Schedule).filter(
                Schedule.schedule_id == prop.proposer_schedule_id
            ).first()
            if p_sched:
                p_sched.is_locked = False

    db.commit()

    return {
        "swap_request_id": swap_request_id,
        "status": "rejected",
        "admin_comment": body.admin_comment,
    }
