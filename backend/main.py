from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.database import engine, SessionLocal, Base
from app.core.config import settings
from app.core.security import hash_password

from app.api import auth, employees, shift_types, schedules, swap_requests, time_off_requests, dashboard

from app.models.shift_type import ShiftType
from app.models.system_settings import SystemSettings
from app.models.user import User

# 테이블 생성 (Alembic 사용 시 이 줄은 제거)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ShiftMate API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
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
    finally:
        db.close()


def _seed_admin(db: Session):
    admin = db.query(User).filter(User.role == "admin").first()
    if admin:
        return
    admin = User(
        name=settings.ADMIN_NAME,
        employee_no=settings.ADMIN_EMPLOYEE_NO,
        role="admin",
        years_of_experience=0,
        is_active=True,
        password=hash_password(settings.ADMIN_PASSWORD),
        is_initial_password=True,
    )
    db.add(admin)
    db.commit()
    print(f"초기 관리자 계정 생성 완료: {settings.ADMIN_EMPLOYEE_NO}")


def _seed_system_settings(db: Session):
    settings_row = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
    if settings_row:
        return
    settings_row = SystemSettings(
        id=1,
        swap_years_range=2,
        max_consecutive_night=3,
        min_daily_staff=3,
        min_avg_years=2,
    )
    db.add(settings_row)
    db.commit()
    print("system_settings 초기값 생성 완료")


def _seed_shift_types(db: Session):
    if db.query(ShiftType).first():
        return
    defaults = [
        ShiftType(code="D", label="Day", color="#3B82F6", is_work_day=True, is_system=False),
        ShiftType(code="E", label="Evening", color="#F59E0B", is_work_day=True, is_system=False),
        ShiftType(code="N", label="Night", color="#6366F1", is_work_day=True, is_system=False),
        ShiftType(code="OFF", label="Off", color="#9CA3AF", is_work_day=False, is_system=True),
        ShiftType(code="VAC", label="Vacation", color="#10B981", is_work_day=False, is_system=True),
    ]
    db.add_all(defaults)
    db.commit()
    print("기본 근무 유형 생성 완료 (D, E, N, OFF, VAC)")
