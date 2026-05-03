# ShiftMate

교대근무 조직을 위한 권한 기반 근무 스케줄 관리 웹 애플리케이션.
직원은 휴무·휴가 신청 및 교대 요청을, 관리자는 근무표 작성·확정 및 요청 승인·반려를 처리한다.

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React (Vite), Tailwind CSS v3, React Router v6, Axios, react-big-calendar |
| Backend | Python, FastAPI, SQLAlchemy 2.0, Pydantic, Alembic |
| DB | MySQL 8.0 |
| 인프라 | Docker, Docker Compose, nginx |

---

## 로컬 실행

### 백엔드

```bash
cd backend

python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# .env 파일 생성 (아래 환경변수 표 참고)
cp .env.example .env

alembic upgrade head
uvicorn main:app --reload
# → http://localhost:8000/docs
```

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Docker 실행

```bash
# backend/.env 파일 생성 (아래 환경변수 표 참고)
cp backend/.env.example backend/.env

docker-compose up --build
# Frontend  → http://localhost
# Backend API → http://localhost:8000/docs
```

---

## 환경변수

`backend/.env` 파일에 아래 항목을 설정한다. (git에서 제외됨)

| 변수명 | 예시 값 | 설명 |
|---|---|---|
| `DATABASE_URL` | `mysql+pymysql://root:1234@localhost:3306/shiftmate` | DB 연결 문자열 |
| `SECRET_KEY` | `your-secret-key-here` | JWT 서명 키 |
| `ADMIN_EMPLOYEE_NO` | `ADMIN001` | 초기 관리자 사번 |
| `ADMIN_NAME` | `관리자` | 초기 관리자 이름 |
| `ADMIN_PASSWORD` | `admin1234!` | 초기 관리자 비밀번호 |
| `DEMO_MODE` | `true` | 데모 직원 계정 자동 생성 여부 |

---

## 초기 계정

| 구분 | 사번 | 이름 | 비밀번호 | 비고 |
|---|---|---|---|---|
| 관리자 | `ADMIN001` | 관리자 | `admin1234!` | |
| 데모 직원 | `EMP002` | 이서윤 | `emp1234!` | `DEMO_MODE=true` 시에만 생성 |
| 데모 직원 | `EMP003` | 박지호 | `emp1234!` | `DEMO_MODE=true` 시에만 생성 |
