# backend/main.py
from datetime import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.config import settings
from app.core.security import hash_password

from app.api import auth, employees, shift_types, schedules, swap_requests, time_off_requests, dashboard

from app.models.shift_type import ShiftType
from app.models.system_settings import SystemSettings
from app.models.user import User

app = FastAPI(title="ShiftMate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(employees.router, prefix="/api/admin/employees", tags=["employees"])
app.include_router(shift_types.router, prefix="/api/admin/shift-types", tags=["shift-types"])
app.include_router(schedules.router, prefix="/api", tags=["schedules"])
app.include_router(swap_requests.router, prefix="/api", tags=["swap-requests"])
app.include_router(time_off_requests.router, prefix="/api", tags=["time-off"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])


@app.on_event("startup")
def startup_event():
    db: Session = SessionLocal()
    try:
        _seed_admin(db)
        _seed_system_settings(db)
        _seed_shift_types(db)
        if settings.DEMO_MODE:
            _seed_demo_employees(db)
    finally:
        db.close()


def _seed_admin(db: Session):
    if db.query(User).filter(User.role == "admin").first():
        return
    db.add(User(
        name=settings.ADMIN_NAME,
        employee_no=settings.ADMIN_EMPLOYEE_NO,
        role="admin",
        years_of_experience=0,
        is_active=True,
        password=hash_password(settings.ADMIN_PASSWORD),
        is_initial_password=True,
    ))
    db.commit()
    print(f"초기 관리자 계정 생성: {settings.ADMIN_EMPLOYEE_NO}")


def _seed_system_settings(db: Session):
    if db.query(SystemSettings).filter(SystemSettings.id == 1).first():
        return
    db.add(SystemSettings(
        id=1,
        swap_years_range=2,
        max_consecutive_night=3,
        min_daily_staff=3,
        min_avg_years=2,
    ))
    db.commit()
    print("system_settings 초기값 생성")


def _seed_shift_types(db: Session):
    if db.query(ShiftType).first():
        return
    defaults = [
        ShiftType(code="D",   label="주간", start_time=time(8, 0),  end_time=time(16, 0), color="#3B82F6", is_work_day=True,  is_system=False),
        ShiftType(code="E",   label="오후", start_time=time(16, 0), end_time=time(0, 0),  color="#8B5CF6", is_work_day=True,  is_system=False),
        ShiftType(code="N",   label="야간", start_time=time(0, 0),  end_time=time(8, 0),  color="#1D4ED8", is_work_day=True,  is_system=False),
        ShiftType(code="OFF", label="휴무", start_time=None,        end_time=None,        color="#94A3B8", is_work_day=False, is_system=True),
        ShiftType(code="VAC", label="휴가", start_time=None,        end_time=None,        color="#10B981", is_work_day=False, is_system=True),
    ]
    db.add_all(defaults)
    db.commit()
    print("기본 근무 유형 생성 (D, E, N, OFF, VAC)")


def _seed_demo_employees(db: Session):
    demo_users = [
        {"name": "이서윤", "employee_no": "EMP002", "years_of_experience": 3},
        {"name": "박지호", "employee_no": "EMP003", "years_of_experience": 5},
    ]
    created = False
    for u in demo_users:
        if not db.query(User).filter(User.employee_no == u["employee_no"]).first():
            db.add(User(
                name=u["name"],
                employee_no=u["employee_no"],
                role="employee",
                years_of_experience=u["years_of_experience"],
                is_active=True,
                password=hash_password("emp1234!"),
                is_initial_password=True,
            ))
            created = True
    if created:
        db.commit()
        print("데모 직원 계정 생성 (EMP002, EMP003)")
