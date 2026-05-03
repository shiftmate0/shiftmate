# [사용자2] PRD_04·05·06(FE) — 직원관리 / 근무유형 / 근무표 작성 화면 프롬프트

> 실행 순서: PRD_04 → PRD_05 → PRD_06(FE)
> 전제: 사용자1 PRD_01~03 완료 + Mock 파일 수신
> PRD_06(FE)는 사용자3 PRD_06(BE) 완료 알림 후 실행

---

## PRD_04 프롬프트

```
너는 ShiftMate 프로젝트의 멤버1이야.
사용자1(팀장)이 PRD_01~03을 완료했고, Mock 파일과 공용 컴포넌트가 준비된 상태야.

지금 PRD_04 Employee Management 를 구현해.

## 전제 조건
- backend/app/dependencies/auth.py: require_admin, get_current_user 사용 가능
- backend/app/models/user.py: User 모델 사용 가능
- frontend/src/components/: 공용 컴포넌트 사용 가능
- frontend/src/api/mocks/employees.js: Mock 데이터 사용 가능

## 백엔드 (backend/app/api/employees.py)

GET /api/admin/employees
  권한: require_admin
  처리: 전체 users 조회, created_at ASC 정렬
  응답 200: [{
    user_id, name, employee_no, role,
    years_of_experience, is_active, created_at
  }]

POST /api/admin/employees
  권한: require_admin
  요청: { name: str, employee_no: str, years_of_experience: int, role: str }
  검증:
    employee_no 중복 → 400 "이미 사용 중인 사번입니다"
    years_of_experience < 0 → 400 "연차는 0 이상이어야 합니다"
  처리:
    임시 비밀번호 생성:
      import secrets, string
      chars = string.ascii_letters + string.digits
      temp_pw = ''.join(secrets.choice(chars) for _ in range(8))
      (최소 1개 영문 + 1개 숫자 포함 보장)
    bcrypt 해시 저장
    is_initial_password=True
  응답 201: {
    user_id, name, employee_no, role,
    years_of_experience, is_active,
    temporary_password  ← 평문 1회만 포함
  }

PUT /api/admin/employees/{id}
  권한: require_admin
  요청 (부분 수정): { name, years_of_experience, is_active, role }
  처리:
    404 처리
    employee_no는 요청에 있어도 무시
    None이 아닌 필드만 업데이트
  응답 200: { user_id, name, employee_no, role, years_of_experience, is_active }

POST /api/admin/employees/{id}/reset-password
  권한: require_admin
  처리:
    404 처리
    임시 비밀번호 재생성 (POST와 동일 로직)
    is_initial_password=True 재설정
  응답 200: { user_id, name, temporary_password }

라우터 등록 요청:
  사용자1(팀장)에게 슬랙/노션으로 요청:
  "from app.api.employees import router as employees_router
   app.include_router(employees_router, prefix='/api', tags=['employees'])"

## 프론트엔드 (frontend/src/pages/admin/EmployeesPage.jsx)
라우트: /admin/employees

AppLayout role="admin" 사용

PageHeader:
  title="직원 관리"
  actions=<Button variant="primary" onClick={openAddModal}>직원 추가</Button>

필터 행:
  역할 Select: [전체 / 관리자 / 직원]
  상태 Select: [전체 / 재직 / 비활성]
  검색 Input: name 또는 employee_no 부분 일치
  FE 클라이언트 필터링 (useMemo 사용)

Table 컴포넌트:
  컬럼: 이름, 사번, 연차, 상태, 관리
  연차: `{years_of_experience}년차`
  상태 Badge:
    is_active=true  → variant="status-approved" "재직"
    is_active=false → variant="default" "비활성" 회색
  관리:
    [수정] ghost sm
    [초기화] ghost sm (is_active=true 시만 표시)
  빈 상태: "조건에 맞는 직원이 없습니다"

직원 등록 모달 (Modal size="md", onClose=null 닫기 차단 불필요):
  ModalHeader: "직원 등록"
  입력: 이름(text), 사번(text, placeholder="EMP001"),
        연차(number, min=0), 권한(select: 직원/관리자)
  클라이언트 검증: 모든 필드 필수, 연차 0 이상
  [등록] primary disabled 조건: 빈 필드 있음
  POST /api/admin/employees 호출
  성공 → 등록 모달 닫기 → 임시 비밀번호 모달 열기

임시 비밀번호 모달 (Modal size="sm", 닫기 차단):
  onClose prop 없음 (Modal의 ESC/백드롭 닫기 차단)
  ModalHeader: "⚠ 임시 비밀번호"
  내용:
    비밀번호 텍스트 (monospace font) + [복사] ghost 버튼
    "이 창을 닫으면 다시 볼 수 없습니다."
    "직원에게 전달 후 닫아주세요."
  [확인] primary → 모달 닫기 + 목록 새로고침 + 비밀번호 state null로 초기화
  [복사] 클릭: navigator.clipboard.writeText(pw) → Toast success "복사되었습니다"

직원 수정 모달 (Modal size="md"):
  ModalHeader: "직원 정보 수정"
  입력 (현재 값 pre-fill):
    이름, 연차, 권한, 상태 Toggle(재직/비활성)
    사번: Input readOnly, helper="사번은 변경할 수 없습니다"
  PUT /api/admin/employees/{id} 호출
  성공: Toast success "직원 정보가 수정되었습니다" + 목록 새로고침

비밀번호 초기화 확인 모달 (Modal size="sm"):
  내용: "{name}님의 비밀번호를 초기화하시겠습니까?"
  [취소] secondary + [초기화] danger
  POST /api/admin/employees/{id}/reset-password
  성공 → 임시 비밀번호 모달 재사용

데이터 흐름:
  마운트: GET /api/admin/employees (실제 API)
  완료 전: mocks/employees.js 사용 후 교체

## 완료 조건
- temporary_password 1회 응답 확인
- 중복 사번 → 400 모달 내 인라인 에러 확인
- 임시 비밀번호 모달: 닫기 버튼만으로 닫힘, 복사 동작 확인
- 비활성 직원 [초기화] 버튼 미표시 확인
- 필터/검색 클라이언트 처리 동작 확인
```

---

## PRD_05 프롬프트

```
너는 ShiftMate 프로젝트의 멤버1이야.
PRD_04가 완료되었고, 사용자1의 seed.py 파일이 커밋된 상태야.

착수 전 확인:
  backend/app/core/seed.py 파일이 존재하는지 확인
  없으면 사용자1(팀장)에게 커밋 요청 후 착수

지금 PRD_05 Shift Type Management 를 구현해.

## 백엔드 — seed 추가 (backend/app/core/seed.py)
seed_shift_types(db) 함수가 없으면 추가:
  shift_types COUNT=0 일 때만 실행
  D/E/N/OFF/VAC 5개 INSERT
  (사용자1 PRD_03에서 이미 구현되어 있으면 생략)

라우터 등록 요청: 사용자1에게
  "from app.api.shift_types import router as shift_types_router
   app.include_router(shift_types_router, prefix='/api', tags=['shift-types'])"

## 백엔드 (backend/app/api/shift_types.py)

GET /api/admin/shift-types
  권한: get_current_user (관리자·직원 모두 접근 가능)
  처리: 전체 조회, 정렬 is_system ASC, shift_type_id ASC
  응답 200: [{
    shift_type_id, code, label, start_time, end_time,
    color, is_work_day, is_system
  }]

POST /api/admin/shift-types
  권한: require_admin
  요청: { code, label, start_time(선택), end_time(선택), color, is_work_day }
  검증:
    code: ^[A-Z0-9]{1,10}$ → 400 "코드는 대문자 영문과 숫자만 사용할 수 있습니다"
    color: ^#[0-9A-Fa-f]{6}$ → 400 "색상은 #RRGGBB 형식이어야 합니다"
    code 중복 → 400 "이미 사용 중인 코드입니다"
  처리: is_system=False 고정
  응답 201: 전체 필드

PUT /api/admin/shift-types/{id}
  권한: require_admin
  검증:
    404
    is_system=True → 400 "시스템 예약 코드는 수정할 수 없습니다"
    color 형식 검증
  처리: code 수정 불가 (무시), 나머지 부분 업데이트
  응답 200: 전체 필드

DELETE /api/admin/shift-types/{id}
  권한: require_admin
  검증:
    404
    is_system=True → 400 "시스템 예약 코드는 삭제할 수 없습니다"
    schedules 참조: SELECT COUNT(*) WHERE shift_type_id={id}
    count > 0 → 400 "사용 중인 코드는 삭제할 수 없습니다"
  응답 200: { "message": "근무 유형이 삭제되었습니다" }

## 프론트엔드 (frontend/src/pages/admin/ShiftTypesPage.jsx)
라우트: /admin/shift-types

PageHeader title="근무 유형 관리" + [근무 유형 추가] primary 버튼

Table:
  컬럼: 코드(font-bold), 라벨, 시간, 색상, 관리
  시간: start_time + "~" + end_time / 둘 다 null이면 "-"
  색상: 원형 div (16px, backgroundColor=color, rounded-full)
  관리:
    is_system=true: 🔒 텍스트 (버튼 없음)
    is_system=false: [수정] ghost
    삭제 버튼: 미사용 코드만 표시
               (삭제 시도 후 400으로 판단하는 방식)

근무 유형 추가 모달 (Modal size="md"):
  코드: text Input, helper="대문자 영문과 숫자만, 최대 10자"
  라벨: text Input
  시작 시간: time Input (선택)
  종료 시간: time Input (선택)
    → 한 개만 입력 시 에러: "시작/종료 시간을 모두 입력하거나 모두 비우세요"
  색상:
    왼쪽: 원형 칩 (16px, 실시간 color 반영)
    오른쪽: text Input (#RRGGBB)
    onChange: 유효한 HEX면 칩 업데이트, 아니면 칩 회색
  근무일 여부: Toggle (기본 true)
  POST /api/admin/shift-types

근무 유형 수정 모달 (Modal size="md"):
  code: Input readOnly
  나머지: pre-fill + 색상 칩 연동
  PUT /api/admin/shift-types/{id}

삭제 확인 모달 (Modal size="sm"):
  "{code} ({label}) 근무 유형을 삭제하시겠습니까?"
  [삭제] danger → DELETE /api/admin/shift-types/{id}
  400 "사용 중인 코드": Toast error "현재 근무표에서 사용 중인 코드는 삭제할 수 없습니다"

## 완료 조건
- 앱 기동 후 D/E/N/OFF/VAC 5개 자동 생성 확인
- OFF/VAC 수정·삭제 시도 → 400 확인
- 사용 중 코드 삭제 시도 → 400 + Toast 확인
- 색상 칩 HEX 실시간 연동 확인
- is_system 행 🔒 표시 + 버튼 없음 확인
```

---

## PRD_06 FE 프롬프트 (사용자3 PRD_06 BE 완료 알림 수신 후 실행)

```
너는 ShiftMate 프로젝트의 멤버1이야.
사용자3(멤버2)이 PRD_06 BE를 완료했고 아래 API가 사용 가능해:
  GET /api/schedules?year={년}&month={월}
    응답: { period_status: "draft"|"confirmed", schedules: [...] }
    schedules 항목: { schedule_id, user_id, user_name, work_date, shift_type_id,
                      shift_code, shift_color, shift_label, is_locked }
  GET /api/schedules/me?year={년}&month={월}
  POST /api/admin/schedules/bulk
  PUT /api/admin/schedules/{id}
  POST /api/admin/schedules/{year}/{month}/confirm
  GET /api/admin/schedules/validate (Day 3 AM 사용 가능)
    응답: { year, month, is_valid, has_warnings, warnings: [{ type, message, affected_date, affected_user_id, affected_user_name }] }

지금 PRD_06 Schedule Write FE 를 구현해.

## 프론트엔드 (frontend/src/pages/admin/SchedulePage.jsx)
라우트: /admin/schedules?year={년}&month={월}&view=grid|calendar

주의: 사용자3(멤버2)이 이 파일에 캘린더 탭을 추가할 예정이므로
      그리드 탭과 캘린더 탭을 분리된 구조로 작성할 것.
      예: {view === 'grid' ? <GridView /> : <CalendarView />}

## URL 파라미터 관리
const [searchParams, setSearchParams] = useSearchParams()
const year = parseInt(searchParams.get('year')) || new Date().getFullYear()
const month = parseInt(searchParams.get('month')) || new Date().getMonth() + 1
const view = searchParams.get('view') || 'grid'

뷰 전환: setSearchParams({ year, month, view: 'grid'|'calendar' })
         → 데이터 재호출 없음

## 그리드 뷰 구현

PageHeader:
  title=`근무표 작성 — ${year}년 ${month}월`
  actions=<월 네비게이션>

월 네비게이션:
  [◀ {prev}월] 텍스트 버튼
  [{next}월 ▶] 텍스트 버튼
  클릭 시: year/month 파라미터만 변경 + GET /api/schedules 재호출

뷰 전환 탭:
  [그리드 작성] [캘린더 조회]
  탭 클릭: view 파라미터만 변경

액션 바:
  period_status Badge:
    'confirmed' → Badge variant="status-approved" "Confirmed"
    'draft'     → Badge variant="default" "Draft" 회색
  [검증 실행] secondary 버튼
  [확정하기] primary 버튼 (항상 활성 — 확정 후 수정·재확정 가능)

그리드 Table:
  행: GET /api/admin/employees → is_active=true + created_at ASC
  열: getDaysInMonth(year, month)개 날짜
  헤더: `${day}(${getDayOfWeek(year, month, day)})`
        토요일: text-blue-500 / 일요일: text-red-500

  각 셀: ShiftCell 컴포넌트
    배정: shift_code + shift_color 배경 + 흰 텍스트
    미배정: 회색 점선 border, 빈 셀
    is_locked: 🔒 아이콘, pointer-events-none, opacity-50
    클릭 가능: !is_locked

  고정 헤더/첫 번째 열: sticky top-0, sticky left-0

셀 클릭 모달 (Modal size="sm"):
  제목: `{work_date} / {name}`
  라디오 목록:
    GET /api/admin/shift-types 결과
    각 항목: 좌측 색상칩 + "{code} {label}"
    현재 shift_type_id pre-select
  [취소] secondary
  [저장] primary → 저장 로직:
    기존 schedule (schedule_id 있음): PUT /api/admin/schedules/{id}
    미배정 셀 (schedule_id 없음): POST /api/admin/schedules/bulk [{ user_id, work_date, shift_type_id }]
    성공: schedules state 부분 업데이트 (해당 셀만, 전체 reload 없음)
          period_status가 'confirmed'였으면 → state를 'draft'로 전환
          (백엔드가 저장 시 자동으로 confirmed → draft 전환하므로 FE state도 동기화)
    400 is_locked: Toast error "교대 협의 중인 시프트는 수정할 수 없습니다"

검증 결과 영역 (그리드 하단):
  validationResult state (null | { is_valid, warnings })

  [검증 실행] 클릭:
    Day 3 이전 (사용자3 검증 API 미완성):
      Toast info "검증 기능은 준비 중입니다"
      validationResult = null
    Day 3 AM 이후:
      GET /api/admin/schedules/validate?year={year}&month={month}
      validationResult = 응답 결과

  validationResult 표시:
    is_valid=true: "✅ 검증 통과" text-green-600
    is_valid=false: 경고 목록
      배경 #FEF3C7, 텍스트 #D97706
      • {message} (type별 포맷:
        consecutive_night/night_to_day/workload_bias → "• {affected_user_name}: {message}"
        min_staff/avg_years → "• {affected_date}: {message}")

확정 흐름 ([확정하기] 버튼):
  async handleConfirm():
    // Step 1: 검증 (Day 3 AM 이후)
    let warnings = []
    if (validateApiReady) {  // 검증 API 준비 플래그
      const res = await apiClient.get('/admin/schedules/validate', { params: { year, month } })
      warnings = res.data.warnings
    }

    // Step 2: 경고 모달
    if (warnings.length > 0) {
      showValidationModal(warnings)
      return
    }

    // Step 3: 확정
    await confirmSchedule()

  confirmSchedule():
    POST /api/admin/schedules/{year}/{month}/confirm
    성공: period_status state → 'confirmed'
          Toast success `${year}년 ${month}월 근무표가 확정되었습니다`

검증 경고 모달 (Modal size="md"):
  제목: "⚠ 검증 경고"
  경고 목록 표시 (배경 #FEF3C7)
  "경고가 있어도 확정할 수 있습니다."
  [취소] secondary → 모달 닫기
  [강제 확정] primary → confirmSchedule()

상태 관리 (useState):
  employees: []
  shiftTypes: []
  schedulesData: { period_status: null, schedules: [] }
  selectedCell: null
  validationResult: null

useEffect(마운트):
  Promise.all([
    apiClient.get('/admin/employees'),
    apiClient.get('/admin/shift-types'),
    apiClient.get('/schedules', { params: { year, month } })
  ])

useEffect(year/month 변경):
  apiClient.get('/schedules', { params: { year, month } })

## 완료 조건
- 그리드 직원×날짜 렌더링 확인
- ShiftCell 배정/미배정/잠금 상태 표시 확인
- 셀 클릭 → 모달 → 저장 → 셀 즉시 업데이트 (전체 reload 없음) 확인
- 월 네비게이션 데이터 교체 확인
- Draft/Confirmed Badge 표시 확인
- Day 3 AM: 검증 → 경고 모달 → 강제 확정 흐름 확인
```
