from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional
from datetime import time

from app.core.database import get_db
from app.dependencies.auth import require_admin
from app.models.shift_type import ShiftType
from app.models.schedule import Schedule


router = APIRouter()


class ShiftTypeCreate(BaseModel):
    code: str = Field(..., max_length=20)
    label: str = Field(..., max_length=20)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    color: str = Field(..., max_length=10)
    is_work_day: bool = True


class ShiftTypeUpdate(BaseModel):
    label: Optional[str] = Field(None, max_length=20)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    color: Optional[str] = Field(None, max_length=10)
    is_work_day: Optional[bool] = None


@router.get("")
def get_shift_types(db: Session = Depends(get_db)):
    shift_types = db.query(ShiftType).order_by(ShiftType.shift_type_id).all()
    return shift_types


@router.post("", status_code=status.HTTP_201_CREATED)
def create_shift_type(
    data: ShiftTypeCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    exists = db.query(ShiftType).filter(ShiftType.code == data.code).first()

    if exists:
        raise HTTPException(
            status_code=400,
            detail="이미 존재하는 근무 코드입니다."
        )

    new_shift_type = ShiftType(
        code=data.code,
        label=data.label,
        start_time=data.start_time,
        end_time=data.end_time,
        color=data.color,
        is_work_day=data.is_work_day,
        is_system=False,
    )

    db.add(new_shift_type)
    db.commit()
    db.refresh(new_shift_type)

    return {
        "message": "근무 유형이 등록되었습니다.",
        "data": new_shift_type
    }


@router.put("/{shift_type_id}")
def update_shift_type(
    shift_type_id: int,
    data: ShiftTypeUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    shift_type = db.query(ShiftType).filter(
        ShiftType.shift_type_id == shift_type_id
    ).first()

    if not shift_type:
        raise HTTPException(
            status_code=404,
            detail="근무 유형을 찾을 수 없습니다."
        )

    if shift_type.is_system:
        raise HTTPException(
            status_code=400,
            detail="OFF, VAC 같은 시스템 예약 코드는 수정할 수 없습니다."
        )

    update_data = data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="수정할 값이 없습니다."
        )

    for key, value in update_data.items():
        setattr(shift_type, key, value)

    db.commit()
    db.refresh(shift_type)

    return {
        "message": "근무 유형이 수정되었습니다.",
        "data": shift_type
    }


@router.delete("/{shift_type_id}")
def delete_shift_type(
    shift_type_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    shift_type = db.query(ShiftType).filter(
        ShiftType.shift_type_id == shift_type_id
    ).first()

    if not shift_type:
        raise HTTPException(
            status_code=404,
            detail="근무 유형을 찾을 수 없습니다."
        )

    if shift_type.is_system:
        raise HTTPException(
            status_code=400,
            detail="OFF, VAC 같은 시스템 예약 코드는 삭제할 수 없습니다."
        )

    used_schedule = db.query(Schedule).filter(
        Schedule.shift_type_id == shift_type_id
    ).first()

    if used_schedule:
        raise HTTPException(
            status_code=400,
            detail="이미 근무표에서 사용 중인 근무 유형은 삭제할 수 없습니다."
        )

    db.delete(shift_type)
    db.commit()

    return {
        "message": "근무 유형이 삭제되었습니다."
    }