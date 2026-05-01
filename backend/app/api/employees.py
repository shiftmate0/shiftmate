from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import secrets
import string

from app.core.database import get_db
from app.core.security import hash_password
from app.dependencies.auth import require_admin
from app.models.user import User


router = APIRouter()


def generate_temp_password() -> str:
    chars = string.ascii_letters + string.digits
    while True:
        pw = ''.join(secrets.choice(chars) for _ in range(8))
        if any(c.isalpha() for c in pw) and any(c.isdigit() for c in pw):
            return pw


class EmployeeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    employee_no: str = Field(..., min_length=1, max_length=30)
    years_of_experience: int = Field(default=0)
    role: str = Field(default="employee")


class EmployeeUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=50)
    years_of_experience: int | None = None
    is_active: bool | None = None
    role: str | None = None


def employee_to_dict(user: User):
    return {
        "user_id": user.user_id,
        "name": user.name,
        "employee_no": user.employee_no,
        "role": user.role,
        "years_of_experience": user.years_of_experience,
        "is_active": user.is_active,
        "created_at": user.created_at,
    }


@router.get("")
def get_employees(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    employees = db.query(User).order_by(User.created_at.asc()).all()
    return [employee_to_dict(e) for e in employees]


@router.post("", status_code=201)
def create_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    if payload.role not in ["admin", "employee"]:
        raise HTTPException(status_code=400, detail="role은 admin 또는 employee만 가능합니다")

    if payload.years_of_experience < 0:
        raise HTTPException(status_code=400, detail="연차는 0 이상이어야 합니다")

    exists = db.query(User).filter(User.employee_no == payload.employee_no).first()
    if exists:
        raise HTTPException(status_code=400, detail="이미 사용 중인 사번입니다")

    temp_pw = generate_temp_password()

    employee = User(
        name=payload.name,
        employee_no=payload.employee_no,
        role=payload.role,
        years_of_experience=payload.years_of_experience,
        is_active=True,
        password=hash_password(temp_pw),
        is_initial_password=True,
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    result = employee_to_dict(employee)
    result["temporary_password"] = temp_pw
    return result


@router.put("/{user_id}")
def update_employee(
    user_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    employee = db.query(User).filter(User.user_id == user_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다")

    if payload.role is not None:
        if payload.role not in ["admin", "employee"]:
            raise HTTPException(status_code=400, detail="role은 admin 또는 employee만 가능합니다")
        employee.role = payload.role

    if payload.name is not None:
        employee.name = payload.name

    if payload.years_of_experience is not None:
        if payload.years_of_experience < 0:
            raise HTTPException(status_code=400, detail="연차는 0 이상이어야 합니다")
        employee.years_of_experience = payload.years_of_experience

    if payload.is_active is not None:
        employee.is_active = payload.is_active

    db.commit()
    db.refresh(employee)

    return {
        "user_id": employee.user_id,
        "name": employee.name,
        "employee_no": employee.employee_no,
        "role": employee.role,
        "years_of_experience": employee.years_of_experience,
        "is_active": employee.is_active,
    }


@router.post("/{user_id}/reset-password")
def reset_employee_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    employee = db.query(User).filter(User.user_id == user_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다")

    temp_pw = generate_temp_password()
    employee.password = hash_password(temp_pw)
    employee.is_initial_password = True

    db.commit()
    db.refresh(employee)

    return {
        "user_id": employee.user_id,
        "name": employee.name,
        "temporary_password": temp_pw,
    }
