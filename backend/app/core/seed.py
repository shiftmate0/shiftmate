from datetime import time
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.models.shift_type import ShiftType
from app.models.system_settings import SystemSettings


def seed_admin(db: Session) -> None:
    if not all([settings.ADMIN_EMPLOYEE_NO, settings.ADMIN_NAME, settings.ADMIN_PASSWORD]):
        print("⚠ ADMIN 환경변수 미설정. 관리자 Seed를 건너뜁니다.")
        return

    if db.query(User).filter(User.role == "admin").count() > 0:
        print("ℹ 관리자 계정 이미 존재합니다. Seed를 건너뜁니다.")
        return

    db.add(User(
        employee_no=settings.ADMIN_EMPLOYEE_NO,
        name=settings.ADMIN_NAME,
        password=hash_password(settings.ADMIN_PASSWORD),
        role="admin",
        is_initial_password=True,
        is_active=True,
        years_of_experience=0,
    ))
    db.commit()
    print(f"✅ 관리자 계정 생성: {settings.ADMIN_EMPLOYEE_NO}")


def seed_system_settings(db: Session) -> None:
    if db.query(SystemSettings).filter(SystemSettings.id == 1).first():
        print("ℹ system_settings 이미 존재합니다.")
        return

    db.add(SystemSettings(
        id=1,
        swap_years_range=2,
        max_consecutive_night=3,
        min_daily_staff=3,
        min_avg_years=2,
    ))
    db.commit()
    print("✅ system_settings 초기값 생성")


def seed_shift_types(db: Session) -> None:
    if db.query(ShiftType).count() > 0:
        print("ℹ 근무 유형 이미 존재합니다.")
        return

    db.add_all([
        ShiftType(code="D",   label="주간", start_time=time(8, 0),  end_time=time(16, 0), color="#3B82F6", is_work_day=True,  is_system=False),
        ShiftType(code="E",   label="오후", start_time=time(16, 0), end_time=time(0, 0),  color="#8B5CF6", is_work_day=True,  is_system=False),
        ShiftType(code="N",   label="야간", start_time=time(0, 0),  end_time=time(8, 0),  color="#1D4ED8", is_work_day=True,  is_system=False),
        ShiftType(code="OFF", label="휴무", start_time=None,        end_time=None,        color="#94A3B8", is_work_day=False, is_system=True),
        ShiftType(code="VAC", label="휴가", start_time=None,        end_time=None,        color="#10B981", is_work_day=False, is_system=True),
    ])
    db.commit()
    print("✅ 근무 유형 5개 생성")


def seed_demo_employees(db: Session) -> None:
    if not settings.DEMO_MODE:
        return

    demo_users = [
        {"employee_no": "EMP002", "name": "이서윤", "years_of_experience": 3},
        {"employee_no": "EMP003", "name": "박지호", "years_of_experience": 5},
    ]

    for u in demo_users:
        if db.query(User).filter(User.employee_no == u["employee_no"]).first():
            print(f"ℹ {u['employee_no']} 이미 존재합니다.")
            continue
        db.add(User(
            employee_no=u["employee_no"],
            name=u["name"],
            password=hash_password("emp1234!"),
            role="employee",
            years_of_experience=u["years_of_experience"],
            is_initial_password=False,
            is_active=True,
        ))
        print(f"✅ 데모 직원 계정 생성: {u['employee_no']}")

    db.commit()
