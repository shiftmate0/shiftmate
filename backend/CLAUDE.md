# ShiftMate 백엔드 CLAUDE.md

## 기술 스택
- Python, FastAPI, SQLAlchemy, Pydantic
- MySQL
- JWT (python-jose), bcrypt (passlib)
- Alembic (마이그레이션)

## 디렉터리 구조
```
backend/
  app/
    api/            # 라우터 파일 (employees.py, schedules.py 등)
    models/         # SQLAlchemy 모델
    schemas/        # Pydantic 요청·응답 스키마
    dependencies/   # auth.py (require_admin, get_current_user)
    core/           # config.py, database.py, security.py
  alembic/          # DB 마이그레이션
  main.py
  requirements.txt
```

## DB 테이블 8개
users, shift_types, schedules, schedule_periods,
swap_requests, swap_proposals, time_off_requests, system_settings

## 로컬 실행
```bash
python -m venv venv
.\venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
# → http://localhost:8000/docs
```

## 환경변수 (.env)
```
DATABASE_URL=mysql+pymysql://root:1234@localhost:3306/shiftmate
SECRET_KEY=your-secret-key-here
ADMIN_EMPLOYEE_NO=ADMIN001
ADMIN_NAME=관리자
ADMIN_PASSWORD=admin1234!
```

## 핵심 패턴

### 권한 체크 — 반드시 Depends 사용
```python
from app.dependencies.auth import require_admin, get_current_user

# 관리자 전용
@router.get("/")
def some_func(current_user=Depends(require_admin)):
    ...

# 로그인 사용자 전용
@router.get("/")
def some_func(current_user=Depends(get_current_user)):
    ...
```

### DB 세션 — 반드시 Depends(get_db) 사용
```python
from app.core.database import get_db

@router.get("/")
def some_func(db: Session = Depends(get_db)):
    ...
```

### 에러 응답 형식 — 반드시 이 형식 사용
```python
from fastapi import HTTPException

raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다")
# 응답: {"detail": "직원을 찾을 수 없습니다"}
```

### role/status ENUM — 문자열 비교
```python
if current_user.role == "admin": ...
if request.status == "pending": ...
```

## 비밀번호 정책
- 최소 8자, 영문+숫자 조합 필수
- bcrypt 해시 저장 (절대 평문 저장 금지)
- is_initial_password = true 계정은 비밀번호 변경 API 외 접근 차단

## JWT
- 만료: 8시간
- 저장 위치: 클라이언트 localStorage
- 헤더: Authorization: Bearer <token>

## system_settings 기본값
- swap_years_range: 2
- max_consecutive_night: 3
- min_daily_staff: 3
- min_avg_years: 2
