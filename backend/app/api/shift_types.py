import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional
from datetime import time

from app.core.database import get_db
from app.dependencies.auth import require_admin, get_current_user
from app.models.shift_type import ShiftType
from app.models.schedule import Schedule


router = APIRouter()

CODE_RE = re.compile(r'^[A-Z0-9]{1,10}$')
COLOR_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')


class ShiftTypeCreate(BaseModel):
    code: str = Field(..., max_length=10)
    label: str = Field(..., max_length=20)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    color: str
    is_work_day: bool = True


class ShiftTypeUpdate(BaseModel):
    label: Optional[str] = Field(None, max_length=20)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    color: Optional[str] = None
    is_work_day: Optional[bool] = None


def to_dict(st: ShiftType) -> dict:
    return {
        "shift_type_id": st.shift_type_id,
        "code": st.code,
        "label": st.label,
        "start_time": st.start_time.strftime("%H:%M") if st.start_time else None,
        "end_time": st.end_time.strftime("%H:%M") if st.end_time else None,
        "color": st.color,
        "is_work_day": st.is_work_day,
        "is_system": st.is_system,
    }


@router.get("", summary="근무 유형 목록 조회")
def get_shift_types(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rows = (
        db.query(ShiftType)
        .order_by(ShiftType.is_system.asc(), ShiftType.shift_type_id.asc())
        .all()
    )
    return [to_dict(st) for st in rows]


@router.post("", status_code=201, summary="근무 유형 생성")
def create_shift_type(
    data: ShiftTypeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    if not CODE_RE.match(data.code):
        raise HTTPException(status_code=400, detail="코드는 대문자 영문과 숫자만 사용할 수 있습니다")

    if not COLOR_RE.match(data.color):
        raise HTTPException(status_code=400, detail="색상은 #RRGGBB 형식이어야 합니다")

    if db.query(ShiftType).filter(ShiftType.code == data.code).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 코드입니다")

    st = ShiftType(
        code=data.code,
        label=data.label,
        start_time=data.start_time,
        end_time=data.end_time,
        color=data.color,
        is_work_day=data.is_work_day,
        is_system=False,
    )
    db.add(st)
    db.commit()
    db.refresh(st)
    return to_dict(st)


@router.put("/{shift_type_id}", summary="근무 유형 수정")
def update_shift_type(
    shift_type_id: int,
    data: ShiftTypeUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    st = db.query(ShiftType).filter(ShiftType.shift_type_id == shift_type_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="근무 유형을 찾을 수 없습니다")

    if st.is_system:
        raise HTTPException(status_code=400, detail="시스템 예약 코드는 수정할 수 없습니다")

    if data.color is not None and not COLOR_RE.match(data.color):
        raise HTTPException(status_code=400, detail="색상은 #RRGGBB 형식이어야 합니다")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(st, key, value)

    db.commit()
    db.refresh(st)
    return to_dict(st)


@router.delete("/{shift_type_id}", summary="근무 유형 삭제")
def delete_shift_type(
    shift_type_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    st = db.query(ShiftType).filter(ShiftType.shift_type_id == shift_type_id).first()
    if not st:
        raise HTTPException(status_code=404, detail="근무 유형을 찾을 수 없습니다")

    if st.is_system:
        raise HTTPException(status_code=400, detail="시스템 예약 코드는 삭제할 수 없습니다")

    if db.query(Schedule).filter(Schedule.shift_type_id == shift_type_id).first():
        raise HTTPException(status_code=400, detail="사용 중인 코드는 삭제할 수 없습니다")

    db.delete(st)
    db.commit()
    return {"message": "근무 유형이 삭제되었습니다"}
