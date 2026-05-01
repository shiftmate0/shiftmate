# ShiftMate — INTEGRATION.md
# 4명 병렬 개발 통합 기준 문서
# 작업 시작 전 전원 필독

---

## 0. 담당자 매핑

| 역할 | 사용자 | 담당 PRD |
|---|---|---|
| 팀장 | 사용자1 | PRD_01·02·03·11·12·13(BE) |
| 멤버1 | 사용자2 | PRD_04·05·06(FE) |
| 멤버2 | 사용자3 | PRD_06(BE)·07·08·14(직원) |
| 멤버3 | 사용자4 | PRD_09·10·13(FE)·14(관리자) |

---

## 1. 파일 소유권 원칙

각 담당자는 자신이 소유한 파일만 수정합니다.
타인 소유 파일 수정이 필요한 경우:
  → 슬랙/노션에 요청 메시지 작성
  → 파일 소유자가 수정 후 커밋
  → 절대 직접 수정 금지

### 사용자1 소유 파일
```
backend/app/api/auth.py
backend/app/api/swap_requests.py
backend/app/core/seed.py
backend/app/core/security.py
backend/app/core/config.py
backend/app/core/database.py
backend/app/dependencies/auth.py
backend/app/models/user.py
backend/app/models/swap_request.py
backend/app/models/swap_proposal.py
backend/app/models/system_settings.py
backend/main.py                          ← 라우터 등록 대리 처리
backend/alembic/                         ← 마이그레이션 단독 관리
frontend/src/context/AuthContext.jsx
frontend/src/api/client.js
frontend/src/components/                 ← 초기 생성 및 수정 대리
frontend/src/pages/LoginPage.jsx
frontend/src/pages/ChangePasswordPage.jsx
frontend/src/pages/employee/SwapRequestsPage.jsx
frontend/src/pages/employee/SwapRequestDetailPage.jsx
frontend/src/api/mocks/                  ← 전체 초기 생성
```

### 사용자2 소유 파일
```
backend/app/api/employees.py
backend/app/api/shift_types.py
backend/app/models/shift_type.py
frontend/src/pages/admin/EmployeesPage.jsx
frontend/src/pages/admin/ShiftTypesPage.jsx
frontend/src/pages/admin/SchedulePage.jsx   ← 그리드 탭 담당
```

### 사용자3 소유 파일
```
backend/app/api/schedules.py
backend/app/models/schedule.py
backend/app/models/schedule_period.py
backend/app/services/validation.py
backend/app/services/schedule_service.py   ← 사용자4가 호출
frontend/src/pages/admin/SchedulePage.jsx  ← 캘린더 탭 추가 (사용자2와 협의)
frontend/src/pages/employee/SchedulePage.jsx
frontend/src/pages/employee/DashboardPage.jsx
frontend/src/components/CalendarBase.jsx    ← 사용자1 초기 생성 후 인계
```

### 사용자4 소유 파일
```
backend/app/api/requests.py
backend/app/models/time_off_request.py
frontend/src/pages/admin/DashboardPage.jsx
frontend/src/pages/admin/RequestsPage.jsx
frontend/src/pages/employee/RequestsPage.jsx
```

### 공용 파일 수정 규칙
```
backend/main.py           → 사용자1에게 라우터 등록 요청
frontend/src/components/  → 사용자1에게 수정 요청
backend/alembic/          → 사용자1 단독 관리
```

---

## 2. 브랜치 전략

```
메인 브랜치: main

담당자 브랜치:
  user1/foundation  → PRD_01~03, PRD_11~13
  user2/member1     → PRD_04~05, PRD_06(FE)
  user3/member2     → PRD_06(BE), PRD_07~08, PRD_14(직원)
  user4/member3     → PRD_09~10, PRD_13(FE), PRD_14(관리자)

통합 순서:
  1. user1/foundation → main  (Layer 0: PRD_01~03 완료 후)
  2. 나머지 브랜치 → main     (Layer별 PRD 완료 후 PR)
  3. 충돌 발생 시 사용자1 중재

커밋 메시지 규칙:
  [PRD_번호] 작업 내용
  예: [PRD_04] GET /api/admin/employees 구현
      [PRD_06] 근무표 그리드 FE 구현
```

---

## 3. API 공통 규칙

### 3-1. 기본 설정
```
baseURL:      http://localhost:8000
prefix:       /api
인증 헤더:    Authorization: Bearer {JWT}
응답 형식:    JSON (Content-Type: application/json)
JWT 만료:     8시간
```

### 3-2. 에러 응답 형식 (전 API 통일)
```python
# 모든 에러는 반드시 이 형식 사용
raise HTTPException(status_code=404, detail="직원을 찾을 수 없습니다")
# 응답: { "detail": "직원을 찾을 수 없습니다" }

# HTTP 상태코드 기준
200: 성공 (조회, 수정)
201: 생성 성공
400: 잘못된 요청 (비즈니스 로직 오류)
401: 인증 실패
403: 권한 없음
404: 리소스 없음
409: 동시성 충돌
500: 서버 내부 오류
```

### 3-3. 권한 체크 방식
```python
# 반드시 FastAPI Depends 사용
from app.dependencies.auth import require_admin, get_current_user

# 관리자 전용
@router.get("/")
def some_func(current_user = Depends(require_admin)): ...

# 로그인 필요
@router.get("/")
def some_func(current_user = Depends(get_current_user)): ...

# 금지: 직접 role 체크
❌ if token.role == "admin": ...
✅ current_user = Depends(require_admin)
```

### 3-4. DB 세션
```python
# 반드시 Depends(get_db) 사용
from app.core.database import get_db

@router.get("/")
def some_func(db: Session = Depends(get_db)): ...

# 금지: 직접 SessionLocal() 호출 (startup 이벤트 제외)
```

### 3-5. ENUM 비교
```python
# 문자열 직접 비교 사용
if current_user.role == "admin": ...
if request.status == "pending": ...
```

---

## 4. 데이터 구조 공통 규칙

### 4-1. 날짜/시간 형식
```
date:      "YYYY-MM-DD"         예: "2026-05-01"
datetime:  ISO 8601             예: "2026-05-01T10:00:00Z"
time:      "HH:MM"              예: "08:00"
```

### 4-2. 공유 응답 필드명 (전 API 통일)
```
사용자 ID:     user_id
직원 번호:     employee_no
근무 유형 ID:  shift_type_id
근무 코드:     shift_code
근무 색상:     shift_color
근무 라벨:     shift_label
잠금 여부:     is_locked
활성 여부:     is_active
초기 비번:     is_initial_password
생성일:        created_at
수정일:        updated_at
처리일:        processed_at
```

### 4-3. GET /api/schedules 응답 구조 (확정)
사용자3 구현 — 사용자2·4 참조
```json
{
  "period_status": "draft | confirmed",
  "schedules": [
    {
      "schedule_id": 1,
      "user_id": 2,
      "work_date": "2026-05-01",
      "shift_type_id": 1,
      "shift_code": "D",
      "shift_color": "#3B82F6",
      "shift_label": "주간",
      "is_locked": false
    }
  ]
}
```

### 4-4. schedule_service.py 공유 함수 (확정)
```
파일:   backend/app/services/schedule_service.py
소유:   사용자3
사용:   사용자4 (VAC 승인 시 schedules upsert)
```

```python
# 함수 시그니처 (사용자3 구현)
def upsert_schedule(
    db: Session,
    user_id: int,
    work_date: date,
    shift_type_id: int
) -> None:
    existing = db.query(Schedule).filter_by(
        user_id=user_id, work_date=work_date
    ).first()
    if existing:
        existing.shift_type_id = shift_type_id
        existing.updated_at = datetime.now()
    else:
        db.add(Schedule(
            user_id=user_id,
            work_date=work_date,
            shift_type_id=shift_type_id
        ))
    # commit은 호출자 트랜잭션에서 처리

# 사용자4 호출 예시
from app.services.schedule_service import upsert_schedule
upsert_schedule(db, user_id, work_date, vac_shift_type_id)
db.commit()  # 호출자가 직접 커밋
```

### 4-5. AuthContext user 구조 (확정)
사용자1 구현 — 전원 참조
```javascript
// user 구조
{
  user_id:             integer,
  name:                string,
  role:                "admin" | "employee",
  is_initial_password: boolean,
  employee_no:         string,
  years_of_experience: integer
}

// 사용 예시
const { user } = useAuth()
if (user.role === 'admin') { /* 관리자 전용 */ }
if (user.is_initial_password) { navigate('/change-password') }
```

### 4-6. Mock 파일 데이터 구조 (확정)
사용자1 초기 생성 — 전원 참조

```javascript
// mocks/employees.js
export const mockEmployees = [
  { user_id: 1, name: "김민준", employee_no: "ADMIN001",
    role: "admin", years_of_experience: 5,
    is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { user_id: 2, name: "이서윤", employee_no: "EMP002",
    role: "employee", years_of_experience: 3,
    is_active: true, created_at: "2026-01-02T00:00:00Z" },
  { user_id: 3, name: "박지호", employee_no: "EMP003",
    role: "employee", years_of_experience: 5,
    is_active: true, created_at: "2026-01-03T00:00:00Z" }
]

// mocks/shiftTypes.js
export const mockShiftTypes = [
  { shift_type_id: 1, code: "D", label: "주간",
    start_time: "08:00", end_time: "16:00",
    color: "#3B82F6", is_work_day: true, is_system: false },
  { shift_type_id: 2, code: "E", label: "오후",
    start_time: "16:00", end_time: "00:00",
    color: "#8B5CF6", is_work_day: true, is_system: false },
  { shift_type_id: 3, code: "N", label: "야간",
    start_time: "00:00", end_time: "08:00",
    color: "#1D4ED8", is_work_day: true, is_system: false },
  { shift_type_id: 4, code: "OFF", label: "휴무",
    start_time: null, end_time: null,
    color: "#94A3B8", is_work_day: false, is_system: true },
  { shift_type_id: 5, code: "VAC", label: "휴가",
    start_time: null, end_time: null,
    color: "#10B981", is_work_day: false, is_system: true }
]

// mocks/schedules.js
export const mockSchedulesMeta = {
  period_status: "draft",
  schedules: [
    { schedule_id: 1, user_id: 2, work_date: "2026-05-01",
      shift_type_id: 1, shift_code: "D", shift_color: "#3B82F6",
      shift_label: "주간", is_locked: false },
    { schedule_id: 2, user_id: 2, work_date: "2026-05-02",
      shift_type_id: 2, shift_code: "E", shift_color: "#8B5CF6",
      shift_label: "오후", is_locked: false },
    { schedule_id: 3, user_id: 3, work_date: "2026-05-01",
      shift_type_id: 3, shift_code: "N", shift_color: "#1D4ED8",
      shift_label: "야간", is_locked: false }
  ]
}

// mocks/timeOffRequests.js
export const mockTimeOffRequests = [
  { request_id: 1, requester_id: 2, requester_name: "이서윤",
    type: "OFF", start_date: "2026-05-10", end_date: "2026-05-10",
    reason: "개인 사정", status: "pending",
    admin_comment: null, created_at: "2026-05-01T10:00:00Z",
    processed_at: null },
  { request_id: 2, requester_id: 3, requester_name: "박지호",
    type: "VAC", start_date: "2026-05-20", end_date: "2026-05-22",
    reason: "여행", status: "approved",
    admin_comment: "승인합니다", created_at: "2026-04-28T09:00:00Z",
    processed_at: "2026-04-29T10:00:00Z" }
]

// mocks/swapRequests.js
export const mockSwapRequests = [
  { swap_request_id: 1, requester_id: 2, requester_name: "이서윤",
    requester_schedule_id: 1,
    work_date: "2026-05-01", shift_code: "D",
    shift_color: "#3B82F6", shift_label: "주간",
    requester_years_at_request: 3,
    required_years_min: 1, required_years_max: 5,
    status: "pending", proposal_count: 2,
    expires_at: "2026-05-02T10:00:00Z",
    created_at: "2026-05-01T10:00:00Z" }
]

// mocks/dashboard.js
export const mockAdminDashboard = {
  total_employees: 7,
  today_working: 5,
  today_on_leave: 1,
  pending_requests: 4,
  this_week_schedule: [
    { date: "2026-05-04", day: "월", count: 5 },
    { date: "2026-05-05", day: "화", count: 4 },
    { date: "2026-05-06", day: "수", count: 3 },
    { date: "2026-05-07", day: "목", count: 5 },
    { date: "2026-05-08", day: "금", count: 4 },
    { date: "2026-05-09", day: "토", count: 2 },
    { date: "2026-05-10", day: "일", count: 1 }
  ]
}
export const mockEmployeeDashboard = {
  today_schedule: {
    work_date: "2026-05-04", shift_code: "D", shift_label: "주간",
    shift_color: "#3B82F6", start_time: "08:00", end_time: "16:00",
    is_work_day: true
  },
  this_week: [
    { work_date: "2026-05-04", day_label: "월", shift_code: "D",
      shift_label: "주간", shift_color: "#3B82F6", is_today: true },
    { work_date: "2026-05-05", day_label: "화", shift_code: "D",
      shift_label: "주간", shift_color: "#3B82F6", is_today: false },
    { work_date: "2026-05-06", day_label: "수", shift_code: null,
      shift_label: null, shift_color: null, is_today: false },
    { work_date: "2026-05-07", day_label: "목", shift_code: "E",
      shift_label: "오후", shift_color: "#8B5CF6", is_today: false },
    { work_date: "2026-05-08", day_label: "금", shift_code: "N",
      shift_label: "야간", shift_color: "#1D4ED8", is_today: false },
    { work_date: "2026-05-09", day_label: "토", shift_code: "OFF",
      shift_label: "휴무", shift_color: "#94A3B8", is_today: false },
    { work_date: "2026-05-10", day_label: "일", shift_code: "OFF",
      shift_label: "휴무", shift_color: "#94A3B8", is_today: false }
  ],
  my_requests: [
    { request_id: 1, type: "OFF", date_display: "5/10",
      status: "pending", created_at: "2026-05-01T10:00:00Z" },
    { request_id: 2, type: "SWAP", date_display: "5/1",
      status: "pending", created_at: "2026-05-01T09:00:00Z" }
  ]
}
```

---

## 5. 프론트엔드 공통 규칙

### 5-1. API 호출
```javascript
// 반드시 apiClient 사용
import apiClient from '../api/client'
const { data } = await apiClient.get('/admin/employees')

// 금지: axios 직접 호출
import axios from 'axios'  // ❌ 사용 금지
```

### 5-2. 라우트 URL (확정)
```
/login
/change-password
/admin/dashboard
/admin/employees
/admin/shift-types
/admin/schedules?year={year}&month={month}&view=grid|calendar
/admin/requests
/employee/dashboard
/employee/schedules?year={year}&month={month}
/employee/requests
/employee/swap-requests
/employee/swap-requests/:id
```

### 5-3. 공용 컴포넌트 import 경로
```javascript
import Button    from '../components/Button'
import Card      from '../components/Card'
import Input     from '../components/Input'
import Modal     from '../components/Modal'
import Badge     from '../components/Badge'
import Table     from '../components/Table'
import Toast     from '../components/Toast'
import KPICard   from '../components/KPICard'
import ShiftCell from '../components/ShiftCell'
```

### 5-4. view 파라미터 규칙 (/admin/schedules)
```
기본값: "grid"
전환: URL view 파라미터만 변경, 데이터 재호출 없음
  /admin/schedules?year=2026&month=5           → 그리드 (기본)
  /admin/schedules?year=2026&month=5&view=grid
  /admin/schedules?year=2026&month=5&view=calendar
```

### 5-5. Mock → 실제 API 교체 방법
```javascript
// Before (Mock)
import { mockEmployees } from '../api/mocks/employees'
const data = mockEmployees

// After (실제 API)
import apiClient from '../api/client'
const { data } = await apiClient.get('/admin/employees')
```

### 5-6. 디자인 토큰 (tailwind.config.js extend.colors 기준)
```
primary:   #3B82F6   (Primary Blue)
violet:    #8B5CF6   (Accent Violet)
success:   #10B981   (Green)
warning:   #F59E0B   (Amber)
danger:    #EF4444   (Red)
text-sub:  #64748B   (Secondary Text)
```

---

## 6. 이번 주 계산 기준 (전 API 통일)

```python
# 사용자3(PRD_10 대시보드), 사용자4(PRD_14 직원 대시보드) 동일 로직 사용
from datetime import date, timedelta

today = date.today()
monday = today - timedelta(days=today.weekday())
# weekday(): 월=0, 화=1, ..., 일=6

week_dates = [monday + timedelta(days=i) for i in range(7)]
# week_dates[0] = 월요일
# week_dates[6] = 일요일

# 요일 레이블 배열
DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"]

# 예시 (오늘=2026-05-06 수요일):
# monday = 2026-05-04
# week_dates = [05-04, 05-05, 05-06, 05-07, 05-08, 05-09, 05-10]
```

---

## 7. 만료 체크 방식 (전 API 통일)

```python
# swap_requests 만료 판단 — 이중 확인
from datetime import datetime

def is_expired(swap_request) -> bool:
    # 1차: status 체크
    if swap_request.status == 'expired':
        return True
    # 2차: expires_at 직접 비교
    if swap_request.expires_at < datetime.now():
        return True
    return False

# GET /api/swap-requests 조회 시:
# status='pending' AND expires_at < now() 감지
# → DB UPDATE status='expired'
# → 응답에 'expired' 포함
```

---

## 8. 통합 테스트 체크리스트

### Layer 0 통합 완료 기준 (사용자1 완료 후)
```
□ alembic upgrade head 오류 없음 (8개 테이블 생성)
□ uvicorn main:app --reload 정상 실행
□ http://localhost:8000/docs 접속 가능
□ POST /api/auth/login ADMIN001 계정 로그인 성공
□ POST /api/auth/login EMP002 계정 로그인 성공 (DEMO_MODE)
□ npm run dev 정상 실행
□ http://localhost:5173/login 렌더링 확인
□ 6개 mock 파일 커밋 완료
□ API 명세서 공유 (슬랙 or 노션)
```

### Layer 1 통합 완료 기준
```
□ GET  /api/admin/employees — 목록 반환 (사용자2)
□ POST /api/admin/employees — temporary_password 포함 (사용자2)
□ GET  /api/admin/shift-types — 5개 코드 반환 (사용자2)
□ GET  /api/schedules — period_status 래퍼 응답 (사용자3)
□ POST /api/admin/schedules/bulk — upsert 동작 (사용자3)
□ POST /api/requests — 신청 성공 (사용자4)
□ GET  /api/admin/dashboard — 5개 항목 반환 (사용자4)
□ schedule_service.upsert_schedule 함수 공유 완료 (사용자3→사용자4)
```

### Layer 2 통합 완료 기준
```
□ 캘린더 화면 색상 표시 (사용자3)
□ GET /api/admin/schedules/validate — 5가지 경고 (사용자3)
□ POST /api/swap-requests/{id}/proposals — 연차 검증 (사용자1)
□ PATCH /api/admin/requests/{id}/approve — VAC schedules 배정 (사용자4)
□ 관리자 대시보드 화면 KPI 4개 (사용자4)
```

### 최종 통합 완료 기준
```
□ PATCH /api/admin/swap-requests/{id}/approve — 두 시프트 교환 (사용자1)
□ 교대 승인 후 캘린더에서 교환된 근무 코드 확인 (사용자3)
□ 직원 대시보드 이번 주 근무 7일 (사용자3)
□ 요청 관리 화면 교대 행 실제 API 연결 (사용자4)
□ 전체 E2E 시나리오:
  □ 관리자 로그인 → 대시보드 → 직원 등록 → 근무표 작성 → 확정
  □ 직원 로그인 → 휴무 신청 → 교대 요청 → 제안 선택
  □ 관리자 → 교대 최종 승인 → 두 직원 근무 교환 확인
```

---

## 9. 라우터 등록 요청 방법

각 담당자는 API 구현 완료 후 사용자1에게 아래 형식으로 요청:

```
[라우터 등록 요청]
담당: 사용자2(멤버1)
파일: backend/app/api/employees.py
등록 코드:
  from app.api.employees import router as employees_router
  app.include_router(employees_router, prefix="/api", tags=["employees"])
```

---

## 10. 의존성 알림 규칙

API 완성 시 아래 형식으로 팀 공유:

```
[API 완성 알림]
담당: 사용자3(멤버2)
완성 API: GET /api/schedules
          POST /api/admin/schedules/bulk
영향: 사용자2(멤버1) SchedulePage FE 실제 연동 가능
      사용자4(멤버3) schedule_service 사용 가능
추가 공유: schedule_service.upsert_schedule 사용법 (위 섹션 4-4 참조)
```
