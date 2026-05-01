# [사용자1] PRD_02·03 — Auth Login + Admin Seed 프롬프트

> 실행 순서: 2번째 | 전제: PRD_01 완료
> 완료 후: 멤버 3명 Layer 1 착수 가능

---

## 프롬프트 (Claude Code에 그대로 붙여넣기)

```
너는 ShiftMate 프로젝트의 팀장이야.
PRD_01이 완료된 상태야 (DB 마이그레이션, core/, dependencies/ 구현 완료).

지금 PRD_02 Auth Login + PRD_03 Admin Seed 를 순서대로 구현해.

## PRD_02 구현 범위

### 백엔드 (backend/app/api/auth.py)

POST /api/auth/login
  요청 body: { employee_no: str, password: str }
  처리:
    1. employee_no로 users 조회 → 없으면 401
    2. is_active=false → 401 "비활성화된 계정입니다"
    3. bcrypt 비밀번호 검증 실패 → 401 "사번 또는 비밀번호가 올바르지 않습니다"
    4. JWT 생성 (payload: user_id, role, 만료 8시간)
    5. 응답
  응답 200: {
    access_token, token_type: "bearer",
    user_id, name, role, is_initial_password,
    employee_no, years_of_experience
  }

POST /api/auth/logout
  권한: get_current_user
  응답 200: { "message": "로그아웃되었습니다" }

GET /api/auth/me
  권한: get_current_user
  응답 200: {
    user_id, name, role, is_initial_password,
    employee_no, years_of_experience, is_active
  }
  실패: 401 { "detail": "인증이 필요합니다" }

PUT /api/auth/password
  권한: get_current_user
  요청 body: { current_password: str, new_password: str }
  처리:
    1. current_password bcrypt 검증
    2. new_password 규칙: (?=.*[a-zA-Z])(?=.*\d).{8,}
    3. bcrypt 해시 저장
    4. is_initial_password = false 업데이트
  응답 200: { "message": "비밀번호가 변경되었습니다" }
  실패:
    400 "현재 비밀번호가 올바르지 않습니다"
    400 "비밀번호는 최소 8자, 영문+숫자 조합이어야 합니다"

main.py에 auth 라우터 등록:
  from app.api.auth import router as auth_router
  app.include_router(auth_router, prefix="/api", tags=["auth"])

### 프론트엔드

frontend/src/pages/LoginPage.jsx:
  레이아웃: flex-row, 100vw × 100vh
  좌측 패널 (55%):
    배경: linear-gradient(135deg, #3B82F6, #8B5CF6)
    내용: "ShiftMate" 로고, "스마트한 근무 스케줄 관리" 메인 카피,
          기능 뱃지 3개 (실시간 현황/권한 기반/교대 매칭),
          특징 목록 3개
  우측 패널 (45%):
    흰 배경, 중앙 정렬 폼
    제목: "ShiftMate 로그인" (24px/700)
    사번 Input (type=text, placeholder="사번을 입력하세요")
    비밀번호 Input (type=password, 눈 아이콘 토글)
    [로그인] Button (primary, lg, 전체 너비)
    에러: 폼 하단 인라인 (#DC2626)
    로딩: disabled + 스피너
    구분선 + "데모 로그인"
    [관리자] [직원] ghost 버튼:
      [관리자] → employee_no="ADMIN001", password="admin1234!" 자동 입력 + submit
      [직원]   → employee_no="EMP002",   password="emp1234!"  자동 입력 + submit
    © 2026 ShiftMate
  로그인 성공 분기:
    is_initial_password=true → navigate('/change-password')
    role='admin'             → navigate('/admin/dashboard')
    role='employee'          → navigate('/employee/dashboard')

frontend/src/pages/ChangePasswordPage.jsx:
  진입 분기 (useAuth().user.is_initial_password):
    초기(true): 제목 "초기 비밀번호 변경",
                안내: "보안을 위해 초기 비밀번호를 변경해 주세요." (info 스타일)
                취소 버튼 없음, 뒤로가기 차단
    일반(false): 제목 "비밀번호 변경", 취소 버튼 표시
  입력 필드:
    현재 비밀번호 (password Input)
    새 비밀번호 (password Input, helper: "최소 8자, 영문+숫자 조합")
    새 비밀번호 확인 (password Input)
  클라이언트 검증:
    새 비밀번호 규칙 미충족 → 인라인 에러
    확인 불일치 → 인라인 에러
    [변경 완료] 조건 미충족 시 disabled
  완료 후:
    초기: is_initial_password=false → role별 대시보드
    일반: Toast success + navigate(-1) 또는 대시보드

Route Guard (frontend/src/App.jsx):
  PrivateRoute: 비로그인 → /login
  InitialPasswordGuard: is_initial_password=true이면 /change-password 외 차단
  AdminRoute: role='admin'만 접근
  EmployeeRoute: role='employee'만 접근

## PRD_03 구현 범위

backend/app/core/seed.py:

def seed_admin(db: Session):
  동작: users WHERE role='admin' COUNT=0 일 때만 실행
  환경변수 누락 시: 경고 로그 후 return
  비밀번호: bcrypt 해시
  필드: employee_no, name, password, role='admin',
        is_initial_password=True, is_active=True, years_of_experience=0
  로그:
    생성: f"✅ 관리자 계정 생성: {ADMIN_EMPLOYEE_NO}"
    스킵: "ℹ 관리자 계정 이미 존재합니다. Seed를 건너뜁니다."
    누락: "⚠ ADMIN 환경변수 미설정. 관리자 Seed를 건너뜁니다."

def seed_system_settings(db: Session):
  동작: system_settings WHERE id=1 없을 때만
  생성: id=1, swap_years_range=2, max_consecutive_night=3,
        min_daily_staff=3, min_avg_years=2
  로그:
    생성: "✅ system_settings 초기값 생성"
    스킵: "ℹ system_settings 이미 존재합니다."

def seed_shift_types(db: Session):
  동작: shift_types COUNT=0 일 때만
  생성 5개:
    D:   label=주간, 08:00, 16:00, #3B82F6, is_work_day=True,  is_system=False
    E:   label=오후, 16:00, 00:00, #8B5CF6, is_work_day=True,  is_system=False
    N:   label=야간, 00:00, 08:00, #1D4ED8, is_work_day=True,  is_system=False
    OFF: label=휴무, None,  None,  #94A3B8, is_work_day=False, is_system=True
    VAC: label=휴가, None,  None,  #10B981, is_work_day=False, is_system=True
  로그:
    생성: "✅ 근무 유형 5개 생성"
    스킵: "ℹ 근무 유형 이미 존재합니다."

def seed_demo_employee(db: Session):
  동작: DEMO_MODE=true AND employee_no='EMP002' 없을 때만
  생성: employee_no='EMP002', name='이서윤',
        password=bcrypt('emp1234!'), role='employee',
        years_of_experience=3, is_initial_password=False, is_active=True
  로그:
    생성: "✅ 데모 직원 계정 생성: EMP002"
    스킵: "ℹ EMP002 이미 존재합니다."

main.py startup 이벤트 최종 등록:
  @app.on_event("startup")
  def startup_event():
      db = SessionLocal()
      try:
          seed_admin(db)
          seed_system_settings(db)
          seed_shift_types(db)
          seed_demo_employee(db)
      finally:
          db.close()

## 완료 조건
- POST /api/auth/login ADMIN001 성공 + is_initial_password 포함 응답 확인
- POST /api/auth/login 잘못된 비밀번호 → 401 확인
- PUT /api/auth/password → is_initial_password=false 전환 DB 확인
- /login 데모 로그인 버튼 동작 확인
- is_initial_password=true 계정 → /change-password 강제 이동 확인
- uvicorn 기동 로그 4개 Seed 완료 메시지 확인
- DB에서 ADMIN001, EMP002, 5개 shift_types, system_settings 존재 확인
- uvicorn 재기동 후 중복 INSERT 없음 확인
```
