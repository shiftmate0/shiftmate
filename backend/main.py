from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.seed import seed_admin, seed_system_settings, seed_shift_types, seed_demo_employees

from app.api import auth, employees, shift_types, schedules, swap_requests, time_off_requests, dashboard

app = FastAPI(title="ShiftMate API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["인증"])
app.include_router(employees.router, prefix="/api/admin/employees", tags=["직원 관리"])
app.include_router(shift_types.router, prefix="/api/admin/shift-types", tags=["근무 유형"])
app.include_router(schedules.router, prefix="/api", tags=["근무표"])
app.include_router(swap_requests.router, prefix="/api", tags=["교대 신청"])
app.include_router(time_off_requests.router, prefix="/api", tags=["휴무·휴가 신청"])
app.include_router(dashboard.router, prefix="/api", tags=["대시보드"])


@app.on_event("startup")
def startup_event():
    db: Session = SessionLocal()
    try:
        seed_admin(db)
        seed_system_settings(db)
        seed_shift_types(db)
        seed_demo_employees(db)
    finally:
        db.close()
