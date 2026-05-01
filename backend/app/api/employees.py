from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import secrets
import string

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User


router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_temp_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return "".join(secrets.choice(alphabet) for _ in range(length))


class EmployeeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    employee_no: str = Field(..., min_length=1, max_length=30)
    years_of_experience: int = Field(default=0, ge=0)
    role: str = Field(default="employee")
    is_active: bool = True


class EmployeeUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=50)
    years_of_experience: int | None = Field(default=None, ge=0)
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
        "is_initial_password": user.is_initial_password,
        "created_at": user.created_at,
    }


@router.get("")
def get_employees(db: Session = Depends(get_db)):
    employees = db.query(User).order_by(User.user_id.asc()).all()
    return [employee_to_dict(employee) for employee in employees]


@router.post("")
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db)):
    if payload.role not in ["admin", "employee"]:
        raise HTTPException(status_code=400, detail="role은 admin 또는 employee만 가능합니다.")

    exists = db.query(User).filter(User.employee_no == payload.employee_no).first()
    if exists:
        raise HTTPException(status_code=400, detail="이미 존재하는 사번입니다.")

    temp_password = generate_temp_password()

    employee = User(
        name=payload.name,
        employee_no=payload.employee_no,
        role=payload.role,
        years_of_experience=payload.years_of_experience,
        is_active=payload.is_active,
        password=hash_password(temp_password),
        is_initial_password=True,
    )

    db.add(employee)
    db.commit()
    db.refresh(employee)

    result = employee_to_dict(employee)
    result["temporary_password"] = temp_password

    return result


@router.put("/{user_id}")
def update_employee(
    user_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
):
    employee = db.query(User).filter(User.user_id == user_id).first()

    if not employee:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다.")

    if payload.role is not None:
        if payload.role not in ["admin", "employee"]:
            raise HTTPException(status_code=400, detail="role은 admin 또는 employee만 가능합니다.")
        employee.role = payload.role

    if payload.name is not None:
        employee.name = payload.name

    if payload.years_of_experience is not None:
        employee.years_of_experience = payload.years_of_experience

    if payload.is_active is not None:
        employee.is_active = payload.is_active

    db.commit()
    db.refresh(employee)

    return employee_to_dict(employee)


@router.post("/{user_id}/reset-password")
def reset_employee_password(user_id: int, db: Session = Depends(get_db)):
    employee = db.query(User).filter(User.user_id == user_id).first()

    if not employee:
        raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다.")

    temp_password = generate_temp_password()

    employee.password = hash_password(temp_password)
    employee.is_initial_password = True

    db.commit()
    db.refresh(employee)

    result = employee_to_dict(employee)
    result["temporary_password"] = temp_password

    return result