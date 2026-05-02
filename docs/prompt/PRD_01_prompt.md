# [사용자1] PRD_01 — Project Foundation 프롬프트

> 실행 순서: 1번째 | 다음 PRD: PRD_02
> 완료 후 멤버 3명에게 Mock 파일 + API 명세 공유 필수

---

## 프롬프트 (Claude Code에 그대로 붙여넣기)

```
너는 ShiftMate 프로젝트의 팀장이야.
기술 스택: FastAPI, SQLAlchemy, MySQL, React(Vite), Tailwind CSS v3

지금 PRD_01 Project Foundation 을 구현해.

## 구현 범위

### 백엔드
1. backend/ 폴더 구조 생성
2. requirements.txt 작성:
   fastapi uvicorn sqlalchemy pymysql cryptography alembic
   python-jose[cryptography] passlib[bcrypt] python-dotenv pydantic

3. .env 파일:
   DATABASE_URL=mysql+pymysql://root:1234@localhost:3306/shiftmate
   SECRET_KEY=shiftmate-secret-key-2026
   ADMIN_EMPLOYEE_NO=ADMIN001
   ADMIN_NAME=관리자
   ADMIN_PASSWORD=admin1234!
   DEMO_MODE=true

4. backend/app/core/config.py
   환경변수 로드 (python-dotenv 사용)
   DATABASE_URL, SECRET_KEY, ADMIN_EMPLOYEE_NO, ADMIN_NAME,
   ADMIN_PASSWORD, DEMO_MODE 로드

5. backend/app/core/database.py
   engine = create_engine(DATABASE_URL)
   SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
   get_db() 제너레이터 함수

6. backend/app/core/security.py
   create_access_token(data: dict) → str  (만료: 8시간)
   verify_token(token: str) → dict | None
   JWT 라이브러리: python-jose

7. backend/app/dependencies/auth.py
   get_current_user(token: str = Depends(oauth2_scheme), db = Depends(get_db))
     → User 객체 반환 (없으면 401)
   require_admin(current_user = Depends(get_current_user))
     → role='admin' 확인 (아니면 403)

8. backend/app/models/ — SQLAlchemy 모델 8개 파일:

   user.py (users 테이블):
     user_id INT PK AUTO_INCREMENT
     name VARCHAR(100) NOT NULL
     employee_no VARCHAR(50) UNIQUE NOT NULL
     role ENUM('admin','employee') NOT NULL
     years_of_experience INT NOT NULL DEFAULT 0
     is_active BOOLEAN NOT NULL DEFAULT true
     password VARCHAR(255) NOT NULL
     is_initial_password BOOLEAN NOT NULL DEFAULT true
     created_at TIMESTAMP DEFAULT now()

   shift_type.py (shift_types 테이블):
     shift_type_id INT PK AUTO_INCREMENT
     code VARCHAR(10) UNIQUE NOT NULL
     label VARCHAR(50) NOT NULL
     start_time TIME NULL
     end_time TIME NULL
     color VARCHAR(7) NOT NULL
     is_work_day BOOLEAN NOT NULL
     is_system BOOLEAN NOT NULL DEFAULT false

   schedule.py (schedules 테이블):
     schedule_id INT PK AUTO_INCREMENT
     user_id INT NOT NULL FK(users.user_id)
     work_date DATE NOT NULL
     shift_type_id INT NOT NULL FK(shift_types.shift_type_id) ON DELETE RESTRICT
     is_locked BOOLEAN NOT NULL DEFAULT false
     version INT NOT NULL DEFAULT 0
     created_at TIMESTAMP DEFAULT now()
     updated_at TIMESTAMP DEFAULT now()
     UniqueConstraint(user_id, work_date)

   schedule_period.py (schedule_periods 테이블):
     period_id INT PK AUTO_INCREMENT
     year INT NOT NULL
     month INT NOT NULL
     status VARCHAR(20) NOT NULL DEFAULT 'confirmed'
     confirmed_at TIMESTAMP NULL
     confirmed_by INT NULL FK(users.user_id)
     UniqueConstraint(year, month)

   swap_request.py (swap_requests 테이블):
     swap_request_id INT PK AUTO_INCREMENT
     requester_id INT NOT NULL FK(users.user_id)
     requester_schedule_id INT NOT NULL FK(schedules.schedule_id)
     requester_years_at_request INT NOT NULL
     required_years_min INT NOT NULL
     required_years_max INT NOT NULL
     status ENUM('pending','accepted','approved','rejected','expired') NOT NULL DEFAULT 'pending'
     accepted_proposal_id INT NULL
     accepted_at TIMESTAMP NULL
     admin_comment TEXT NULL
     expires_at TIMESTAMP NOT NULL
     created_at TIMESTAMP DEFAULT now()
     updated_at TIMESTAMP DEFAULT now()

   swap_proposal.py (swap_proposals 테이블):
     swap_proposal_id INT PK AUTO_INCREMENT
     swap_request_id INT NOT NULL FK(swap_requests.swap_request_id)
     proposer_id INT NOT NULL FK(users.user_id)
     proposer_schedule_id INT NOT NULL FK(schedules.schedule_id)
     proposer_years_at_proposal INT NOT NULL
     status ENUM('proposed','selected','rejected') NOT NULL DEFAULT 'proposed'
     selected_at TIMESTAMP NULL
     rejected_at TIMESTAMP NULL
     created_at TIMESTAMP DEFAULT now()

   time_off_request.py (time_off_requests 테이블):
     request_id INT PK AUTO_INCREMENT
     requester_id INT NOT NULL FK(users.user_id)
     type ENUM('OFF','VAC') NOT NULL
     start_date DATE NOT NULL
     end_date DATE NOT NULL
     reason TEXT NULL
     status ENUM('pending','approved','rejected','canceled') NOT NULL DEFAULT 'pending'
     admin_comment TEXT NULL
     canceled_by INT NULL FK(users.user_id)
     cancel_reason TEXT NULL
     created_at TIMESTAMP DEFAULT now()
     processed_at TIMESTAMP NULL

   system_settings.py (system_settings 테이블):
     id INT PK DEFAULT 1
     swap_years_range INT NOT NULL DEFAULT 2
     max_consecutive_night INT NOT NULL DEFAULT 3
     min_daily_staff INT NOT NULL DEFAULT 3
     min_avg_years INT NOT NULL DEFAULT 2
     updated_at TIMESTAMP DEFAULT now()

9. alembic 초기화:
   alembic init alembic
   alembic/env.py — target_metadata = Base.metadata 설정
   alembic revision --autogenerate -m "initial migration"
   alembic upgrade head 실행

10. backend/main.py:
    FastAPI 앱 생성
    CORS 설정 (origins=["http://localhost:5173"])
    startup 이벤트 등록 (seed 함수 placeholder — PRD_03에서 구현)
    uvicorn 실행 확인

### 프론트엔드
1. Vite + React 프로젝트 생성: npm create vite@latest frontend -- --template react
2. 패키지 설치:
   npm install tailwindcss postcss autoprefixer
   npm install react-router-dom axios
   npm install react-big-calendar date-fns
   npm install recharts lucide-react
   npx tailwindcss init -p

3. tailwind.config.js — extend.colors 추가:
   primary: '#3B82F6'
   violet: '#8B5CF6'
   success: '#10B981'
   warning: '#F59E0B'
   danger: '#EF4444'

4. frontend/src/api/client.js — Axios 인스턴스:
   baseURL: 'http://localhost:8000/api'
   요청 인터셉터: localStorage.getItem('token') → Authorization: Bearer {token}
   응답 인터셉터: 401 수신 시 localStorage.removeItem('token') + window.location='/login'

5. frontend/src/context/AuthContext.jsx:
   상태: user, token
   login(employeeNo, password):
     POST /auth/login → token/user 저장 → is_initial_password 분기
   logout(): localStorage 클리어 → /login
   마운트 복원: token 있으면 GET /auth/me → user 복원, 실패 시 클리어

6. frontend/src/components/ — 공용 컴포넌트 구현:

   Button.jsx:
     props: variant(primary/secondary/ghost/danger), size(sm/md/lg),
            disabled, loading, onClick, children, icon
     loading 시: disabled + 스피너 표시
     Tailwind 클래스로 스타일링

   Card.jsx:
     props: variant(default/elevated/outlined/clickable), children
     CardHeader, CardContent, CardFooter 서브컴포넌트 포함

   Input.jsx:
     props: label, type(text/password/number/date/select/textarea),
            placeholder, value, onChange, error, helper, required,
            disabled, readOnly, icon
     password: 우측 눈 아이콘 (표시/숨김 토글)
     에러: 하단 인라인 빨강 텍스트

   Modal.jsx:
     props: size(sm:400/md:600/lg:800/xl:1000), open, onClose, children
     ModalHeader, ModalBody, ModalFooter 서브컴포넌트
     백드롭: rgba(0,0,0,0.4) blur(4px)
     닫기: X버튼/ESC키/백드롭 클릭
     onClose=null 이면 ESC/백드롭 닫기 차단

   Badge.jsx:
     props: variant(status-pending/status-approved/status-rejected/
                    role-admin/role-employee/count/default), children
     색상: pending=#FEF3C7/#D97706, approved=#ECFDF5/#059669,
           rejected=#FEF2F2/#DC2626

   Table.jsx:
     TableHeader, TableBody, TableRow, TableHead, TableCell 서브컴포넌트
     row hover: bg-gray-50
     empty state prop 지원
     loading state: skeleton rows 표시

   Toast.jsx:
     전역 토스트 시스템 (Context 기반 또는 portal)
     position: top-right fixed
     3000ms 자동 닫힘
     types: success(#ECFDF5/#10B981)/error(#FEF2F2/#EF4444)/info(#EFF6FF/#3B82F6)
     useToast() 훅 export

   KPICard.jsx:
     props: icon, label, value, sub, color, bg
     아이콘: lucide-react 컴포넌트 (24px)
     value 폰트: 28px/700
     카드: 흰 배경, rounded-2xl, shadow

   ShiftCell.jsx:
     props: shift(코드), color(HEX), bg(HEX), onClick, editable, locked
     locked=true: 🔒 아이콘, 클릭 불가, opacity-50
     미배정: 회색 점선 border, 빈 셀
     hover: bg-gray-50, border-blue-500 dashed

   AppLayout.jsx:
     props: role('admin'|'employee'), children
     Sidebar + Header + main 콘텐츠 영역

   Sidebar.jsx:
     props: role, currentPath
     관리자 메뉴: 대시보드/직원관리/근무유형관리/근무표작성/요청관리/캘린더조회
     직원 메뉴: 대시보드/근무표조회/휴무휴가신청/교대요청
     너비: 260px (확장) / 68px (축소) — 전환 버튼
     전환 애니메이션: 200ms
     active 상태: bg-blue-50 text-blue-600 + 좌측 수직선
     하단: 역할전환(데모) / 로그아웃 / 사용자명

7. frontend/src/components/CalendarBase.jsx:
   react-big-calendar 기본 월간 뷰
   date-fns localizer + 한국어 locale
   기본 이벤트 1개 표시 예시
   eventPropGetter 확장 포인트 주석
   dayPropGetter 확장 포인트 주석

8. React Router v6 라우팅 (frontend/src/App.jsx):
   /login → LoginPage
   /change-password → ChangePasswordPage
   /admin/* → AdminLayout (require_admin Route Guard)
   /employee/* → EmployeeLayout (require_employee Route Guard)
   Route Guard:
     비로그인 → /login
     is_initial_password=true → /change-password (다른 경로 차단)
     role 기반 접근 제한

9. frontend/src/api/mocks/ — 6개 파일 생성:
   employees.js, shiftTypes.js, schedules.js,
   timeOffRequests.js, swapRequests.js, dashboard.js
   (INTEGRATION.md 섹션 4-6 JSON 구조 그대로 사용)

## 출력 형식
- 모든 파일 경로를 주석 첫 줄에 표시
  예: # backend/app/core/config.py
      // frontend/src/api/client.js
- 실제 동작 코드로 생성 (placeholder 없음)
- alembic upgrade head 실행 결과 확인

## 완료 조건
- alembic upgrade head 오류 없음
- http://localhost:8000/docs 접속 확인
- http://localhost:5173/login 렌더링 확인
- mock 파일 6개 커밋 후 멤버들에게 공유
```
