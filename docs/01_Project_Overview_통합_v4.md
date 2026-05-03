# ShiftMate — 통합 프로젝트 개요 v4

---

## 1. 프로젝트 비전

**ShiftMate**는 교대근무 조직에서 관리자와 직원이 근무표를 효율적으로 관리하고,
연차 기반의 안전한 근무 교대를 지원하는 **권한 기반 근무 스케줄 관리 웹 애플리케이션**이다.

직원은 본인 근무표를 확인하고, 휴무·휴가를 신청하며, 교대 요청을 통해 유연한 근무 환경을 경험할 수 있다.
관리자는 전체 직원의 근무표를 작성·확정·수정하고, 각종 요청을 검토하여 승인 또는 반려할 수 있다.

본 서비스는 단순한 근무표 조회 기능을 넘어,
**근무표 작성 → 직원 확인 → 요청 접수 → 관리자 승인**까지 이어지는
교대근무 관리 전 과정을 하나의 시스템에서 지원한다.

---

## 2. 핵심 가치

| 가치 | 설명 |
|---|---|
| 🗓️ **명확한 근무표 관리** | 직원별·월별 근무표를 캘린더 형태로 직관적으로 확인 |
| 🔐 **권한 기반 접근 제어** | 관리자와 직원의 기능 접근 범위를 명확히 구분 |
| 🎯 **연차 기반 매칭 보장** | 연차 범위를 검증하여 업무 공백 없는 안전한 교대 지원 |
| 🔄 **신청·승인 워크플로우** | 휴무·휴가 신청, 교대 요청을 관리자 승인 기반으로 처리 |
| ⚠️ **근무표 검증** | 연속 야간근무, 인원 부족, 팀 평균 연차 부족 등 자동 경고 |
| 🔒 **동시성 제어** | 교환 협의 중인 스케줄의 중복 수정 방지 |

---

## 3. 대상 사용자

### 직원 (Employee)
- 본인의 월별 근무표를 확인해야 하는 교대근무자
- 전체 근무표를 참고하여 팀 근무 현황을 확인해야 하는 직원
- 근무표 작성 전 휴무·휴가를 신청해야 하는 직원
- 확정된 근무표에 대해 교대 요청이 필요한 직원
- 다른 직원의 교대 요청을 수락하고 관리자 승인을 기다리는 직원

### 관리자 (Admin)
- 전체 직원의 월별 근무표를 작성하는 관리자
- 직원별 연차를 관리하는 관리자
- 직원의 휴무·휴가 신청 및 교대 요청을 승인·반려하는 관리자

---

## 4. 시스템 특징

### 4-1. 회원가입 없는 구조

일반적인 회원가입 기능은 제공하지 않는다. 직원 계정은 관리자가 직접 생성한다.

선택 이유:
- 실제 교대근무 조직에서 직원 계정을 관리자가 통제하는 경우가 많음
- 외부 사용자의 무단 가입 방지
- 직원 퇴사 시 계정 비활성화 관리 용이
- 권한 관리 단순화

**[변경] 관리자 초기 계정 생성 방법**

시스템 최초 배포 시 관리자 계정이 없으면 로그인 자체가 불가능하다.
이를 해결하기 위해 환경변수 기반 Seed 방식을 사용한다.

- Docker Compose의 `.env` 파일에 `ADMIN_EMPLOYEE_NO`, `ADMIN_NAME`, `ADMIN_PASSWORD` 환경변수를 정의한다.
- 애플리케이션 기동 시 `users` 테이블에 `role = admin`인 계정이 존재하지 않으면 자동 생성한다.
- 초기 관리자 비밀번호는 bcrypt 해시로 저장된다 (`is_initial_password = false`).
- 이미 admin 계정이 존재하면 이 절차는 실행되지 않는다 (멱등성 보장).

---

### 4-2. 관리자 / 직원 권한 분리

사용자는 `admin`과 `employee` 권한으로 구분된다.
- 관리자는 전체 데이터에 접근 가능
- 직원은 본인 데이터 및 전체 근무표 조회만 가능
- DB 레벨에서 role에 따른 테이블 접근 제한은 불가하므로, 모든 권한 검증은 애플리케이션 레이어(FastAPI Dependency)에서 처리한다.

**[변경] 비밀번호 정책**

| 정책 항목 | 내용 |
|---|---|
| 초기 비밀번호 | 관리자가 직원 등록 시 시스템이 임시 비밀번호를 자동 생성. `POST /api/admin/employees` 응답에 1회만 포함되며 이후 재조회 불가 (bcrypt 해시 저장으로 역산 불가) |
| 최초 로그인 | `is_initial_password = true`인 계정은 로그인 후 비밀번호 변경 화면으로 강제 이동. 변경 완료 전까지 다른 API 접근 차단 |
| 비밀번호 규칙 | 최소 8자, 영문+숫자 조합 필수 |
| 비밀번호 변경 | 직원: `PUT /api/auth/password` (현재 비밀번호 확인 후 변경) |
| 비밀번호 초기화 | 관리자: `POST /api/admin/employees/{id}/reset-password` (임시 비밀번호 재발급, `is_initial_password = true`로 재설정) |

---

### 4-3. 월간 근무표 중심 구조

핵심 화면은 월간 근무 스케줄표이며, 캘린더 기반 UI로 제공한다.
근무 코드는 관리자가 자유롭게 추가·수정·설정할 수 있다. OFF와 VAC는 시스템 예약 코드로 수정·삭제가 불가하다.

기본 제공 코드 예시 (관리자가 이름·시간·색상 변경 가능):

| 코드 | 기본 표시 이름 | 시간 | 비고 |
|---|---|---|---|
| D | Day / 주간 등 | 관리자 설정 | 근무일 |
| E | Evening / 오후 등 | 관리자 설정 | 근무일 |
| N | Night / 야간 등 | 관리자 설정 | 근무일 |
| OFF | Off (휴무) | — | 예약 코드, 수정 불가 |
| VAC | Vacation (휴가) | — | 예약 코드, 수정 불가 |

코드 이름은 조직 유형에 따라 다르게 표시 가능하다. (예: 간호직 → Day/Evening/Night, 파트타임 → 오전/오후/저녁)

**[변경] 근무 코드 제약 조건**

- `shift_types.code`는 DB 레벨 UNIQUE 제약을 적용한다. 동일 코드의 중복 등록은 허용하지 않는다.
- 근무 유형 삭제(`DELETE /api/admin/shift-types/{id}`) 시, 해당 `shift_type_id`를 참조하는 `schedules` 레코드가 존재하면 삭제를 차단한다 (DB 레벨 `ON DELETE RESTRICT`). 삭제가 필요한 경우 해당 코드를 사용하는 모든 스케줄을 먼저 변경해야 한다.
- `schedules.shift_type_id`는 NOT NULL이다. 근무 미배정 날짜의 레코드는 삽입하지 않는다. 달력에서 데이터가 없는 날짜는 "미배정"으로 표시한다.

**[변경] 근무표 확정 및 수락 단위**

- 근무표 확정 단위는 **월 단위 일괄 확정**이다. 특정 직원만 개별 확정하는 기능은 제공하지 않는다.

---

### 4-4. 연차 기반 근무 교대 매칭

교대 요청 시 **연차 범위** 조건을 검증하여 업무 공백 없는 안전한 교대를 보장한다.
허용 연차 범위는 시스템 설정에서 관리자가 직접 지정한다. (예: ±2년)

연차(`years_of_experience`)는 정수값이며, 관리자가 직접 입력한다. (예: 1년 차 → 1, 3년 차 → 3)

---

### 4-5. 2-Step Swap 시스템

직원 간 직접 교대 확정은 불가하며, 다음 단계를 거친다.

1. 교대 요청자(Requester)가 Swap Request 생성
2. 조건이 맞는 직원이 Swap Proposal 생성 (1:N 지원)
3. 요청자가 제안 중 하나를 선택하여 상호 합의
4. 관리자 최종 승인 후 근무표 변경

---

### 4-6. 동시성 제어 (State Lock)

**[변경] v2에서 수정된 항목**

- 교환 협의 중인 두 시프트 모두에 `IS_LOCKED` 플래그를 적용하여 임의 수정 차단한다.
  - Swap Request 생성 시: `requester_schedule.is_locked = true`
  - Swap Proposal 생성 시: `proposer_schedule.is_locked = true` (제안자 시프트도 잠금)
- 두 시프트를 원자적으로 잠그기 위해 항상 낮은 `schedule_id` 순서로 잠금을 획득한다. 이 순서 고정으로 교착 상태(Deadlock)를 방지한다.
- 낙관적 잠금(Optimistic Locking)을 통해 단일 레코드 수준의 Race Condition을 방지한다. `version` 필드는 초기값 0으로 설정되며, 수정 시마다 애플리케이션 레이어에서 `version + 1`로 업데이트한다. 클라이언트는 수정 요청 시 현재 `version` 값을 함께 전송해야 하며, DB의 version과 불일치 시 HTTP 409를 반환한다.
- v2의 "유향 그래프(Directed Graph) 기반 순환 참조 차단 알고리즘"은 제거한다. 현재 구조에서 두 시프트의 `is_locked`가 활성화된 이후에는 새로운 Proposal 생성이 차단되므로 순환 참조 자체가 발생하지 않는다.

**[변경] 타이머 단계 분리**

교대 요청의 자동 만료는 두 단계로 분리하여 처리한다.

| 단계 | 상태 | 타이머 | 만료 조건 | 만료 시 처리 |
|---|---|---|---|---|
| Phase 1 | `pending` | 24시간 | `created_at + 24h < now` | 모든 연관 Proposal → `rejected`, 요청자 시프트 잠금 해제 |
| Phase 2 | `accepted` | 72시간 | `accepted_at + 72h < now` | 두 시프트 잠금 해제 |

72시간 타이머는 주말을 포함하여 관리자가 부재 중에도 강제 만료되지 않도록 한 조치다.

---

## 5. 핵심 기능

### 공통 기능

| ID | 기능 | 설명 |
|---|---|---|
| C1 | 로그인 | 사용자 계정으로 로그인. `is_initial_password = true`인 경우 비밀번호 변경 화면으로 강제 이동 |
| C2 | 권한 구분 | 관리자와 직원의 접근 가능 메뉴 구분 |
| C3 | 근무표 조회 | 이번 달·과거 근무표 캘린더 조회. 특정 직원·근무 유형별·본인 근무만 보기 필터 제공. `year`, `month` 파라미터 필수. 관리자·직원 모두 사용 가능 |

---

### 직원 기능

| ID | 기능 | 설명 |
|---|---|---|
| E1 | 내 근무표 조회 | 본인의 이번 달 근무표 캘린더 조회 |
| E2 | 과거 근무표 조회 | 본인의 과거 월별 근무표 조회 |
| E3 | 휴무·휴가 신청 | 근무표 작성 전 희망 휴무일(OFF) 또는 휴가 기간(VAC)을 유형·시작일·종료일로 입력하여 신청. 근무표 확정 후에도 신청 가능하나 관리자가 근무표를 수동으로 수정 |
| E4 | 요청 상태 확인 | 본인이 신청한 휴무·휴가·교대 요청의 처리 상태 확인 |
| E5 | 교대 요청 생성 | 오늘 날짜 이후의 시프트에 대해서만 교대 요청 등록 가능 (Swap Request). 동일 시프트에 `pending` 상태 요청이 존재하면 중복 생성 불가 |
| E6 | 교대 제안 생성 | 다른 직원의 교대 요청에 본인 시프트로 제안 (Swap Proposal). 생성 시 제안자의 연차 범위 충족 여부를 서버에서 검증 |
| E7 | 교대 제안 선택 | 본인 요청에 들어온 제안 중 하나를 선택하여 상호 합의. 선택 즉시 나머지 제안은 자동으로 `rejected` 처리됨 |

---

### 관리자 기능

| ID | 기능 | 설명 |
|---|---|---|
| A1 | 직원 관리 | 직원 등록·수정·비활성화, 연차 관리, 비밀번호 초기화. 비활성화 시: 진행 중 요청 자동 취소·만료, 로그인 차단 |
| A2 | 근무표 작성 | 직원별 월간 근무표 작성 (배치 저장). 이전 달 근무표를 좌측에 나란히 표시하여 참고 가능 (태블릿은 탭 전환). 이전 달 데이터가 없는 경우(예: 1월의 이전 달) 빈 상태로 표시 |
| A3 | 근무표 수정 | 확정 전·후 근무표 수정 가능 |
| A4 | 지난 근무표 조회 | 과거 월별 근무표 조회 |
| A5 | 근무표 자동 검증 | 연속 야간근무, 인원 부족, 팀 평균 연차 부족 등 기본 검증 경고 |
| A6 | 요청 승인/반려 | 휴무·휴가·교대 요청을 승인 또는 반려. VAC 승인 시 해당 날짜에 VAC 코드 자동 배정. 기존 D/E/N 코드와 충돌 시 관리자에게 확인 모달 표시 후 처리. VAC 승인 대상 날짜 범위 내에 `is_locked=true`인 스케줄이 존재하면 HTTP 409를 반환하며 승인이 차단된다 |
| A10 | 근무 유형 관리 | 근무 코드 추가·수정. 코드명·시간·색상 설정 가능. OFF·VAC는 수정·삭제 불가. 사용 중인 코드는 삭제 불가 |

---

## 6. 주요 업무 흐름

### 흐름 1. 근무표 작성 전 휴무·휴가 신청

1. 직원이 다음 달 희망 휴무일(OFF) 또는 휴가 기간(VAC)을 유형·시작일·종료일로 입력하여 신청한다.
2. 관리자는 신청 내역을 확인한다.
3. 관리자는 승인 또는 반려 처리한다.
4. 승인된 휴무·휴가는 근무표 작성 시 참고된다.
5. VAC 승인 시, 서버는 먼저 해당 날짜 범위 내에 `is_locked=true`인 스케줄이 있는지 확인하며, 존재하면 HTTP 409를 반환하고 승인을 차단한다. 충돌이 없으면 각 날짜에 대해 `schedules` 레코드를 VAC 코드로 INSERT(미배정) 또는 UPDATE(기존 코드 존재)한다. `time_off_requests.status` 업데이트와 `schedules` VAC 배정은 단일 트랜잭션으로 처리된다.
6. 기존 D/E/N 코드가 있는 날짜에 VAC를 배정할 경우, 관리자에게 확인 모달을 표시한다. 확인 시 덮어쓰기한다.
7. 근무표 확정 후 신청된 경우, 관리자가 승인하고 근무표를 수동으로 수정한다.

---

### 흐름 2. 근무표 작성 및 확정

1. 관리자가 이전 달 근무표를 좌측에 나란히 참고하며 직원별 월간 근무표를 배치 작성한다.
2. 시스템이 연속근무, 야간근무, 인원 부족, 팀 평균 연차 부족 여부를 자동 검증하여 경고를 표시한다.
3. 관리자가 근무표를 월 단위 일괄 확정한다. 검증 경고가 있는 경우 확인 후 강제 확정도 가능하다.
4. `schedule_periods` 테이블에 해당 월의 확정 레코드가 생성된다.

---

### 흐름 3. 확정 후 근무표 수정

1. 관리자가 확정된 근무표의 셀을 수정한다.
2. 저장 버튼을 클릭하면 배치 저장과 함께 `schedule_periods.status`가 `draft`로 자동 전환된다.
3. 수정 내용은 즉시 DB에 반영된다.
4. 관리자가 다시 근무표 확정 버튼을 눌러 재확정한다. `schedule_periods` 레코드는 생성하지 않고 기존 레코드의 `status`를 `confirmed`로 업데이트한다.

---

### 흐름 4. 2-Step 근무 교대 요청

1. 직원이 오늘 이후 날짜의 시프트에 Swap Request를 생성한다. (상태: `pending`)
   - 생성 시 `requester_years_at_request`(요청자 연차 스냅샷)가 자동 저장된다.
   - 해당 시프트에 이미 `pending` 상태의 요청이 있으면 생성이 차단된다.
   - `requester_schedule.is_locked = true`로 설정된다.
   - Phase 1 타이머 시작: `expires_at = created_at + 24h`
2. 연차 범위 조건에 맞는 직원이 교대 요청을 확인하고 제안할 수 있다.
3. 조건이 맞는 직원이 본인 시프트로 Swap Proposal을 생성한다.
   - 서버가 제안자의 현재 연차를 검증하며, `proposer_years_at_proposal`(제안 시점 연차)이 자동 저장된다.
   - `proposer_schedule.is_locked = true`로 설정된다.
4. 요청자가 여러 제안 중 하나를 선택하여 상호 합의 처리한다. (상태: `accepted`)
   - `accepted_at = now()` 기록. Phase 2 타이머 시작 (`accepted_at + 72h`).
   - 선택되지 않은 나머지 Proposal은 자동으로 `rejected` 처리된다.
5. 관리자가 최종 승인한다. (상태: `approved`)
6. 승인 시 단일 트랜잭션 내에서:
   - 두 직원의 `schedules.shift_type_id`가 교환된다.
   - 두 시프트의 `is_locked = false`로 해제된다.
7. 각 단계별 자동 만료 조건에 따라 처리된다. (Phase 1: 24시간, Phase 2: 72시간)

---

## 7. 주요 데이터 구조

### 사용자 정보 (users)

| 필드 | 타입 | 설명 |
|---|---|---|
| user_id | INTEGER PK | 사용자 고유 번호 |
| name | VARCHAR NOT NULL | 직원 이름 |
| employee_no | VARCHAR UNIQUE NOT NULL | 사번 (중복 불가) |
| role | ENUM('admin','employee') NOT NULL | 권한 |
| years_of_experience | INTEGER NOT NULL DEFAULT 0 | 연차 (정수, 관리자 직접 입력) |
| is_active | BOOLEAN NOT NULL DEFAULT true | 재직 여부 |
| password | VARCHAR NOT NULL | 로그인 비밀번호 (bcrypt 해시) |
| is_initial_password | BOOLEAN NOT NULL DEFAULT true | 초기 비밀번호 여부. true인 경우 로그인 후 강제 변경 |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | 계정 생성일 |

> `employee_no` UNIQUE 제약은 DB 레벨에서 적용한다.  
> `years_of_experience`는 정수 타입으로 소수점 연차는 지원하지 않는다.

---

### 근무 기간 정보 (schedule_periods) — 신규

| 필드 | 타입 | 설명 |
|---|---|---|
| period_id | INTEGER PK | 고유 번호 |
| year | INTEGER NOT NULL | 연도 |
| month | INTEGER NOT NULL | 월 |
| status | ENUM('draft','confirmed') NOT NULL DEFAULT 'draft' | 월 전체 확정 상태 |
| confirmed_at | TIMESTAMPTZ NULL | 확정 일시 |
| confirmed_by | INTEGER NULL REFERENCES users(user_id) | 확정 처리 관리자 |

> UNIQUE(year, month) 제약 적용.  
> 이 테이블이 월 단위 근무표 확정 상태의 단일 출처(Single Source of Truth)다.

---

### 근무표 정보 (schedules)

| 필드 | 타입 | 설명 |
|---|---|---|
| schedule_id | INTEGER PK | 근무표 고유 번호 |
| user_id | INTEGER NOT NULL REFERENCES users(user_id) | 직원 고유 번호 |
| work_date | DATE NOT NULL | 근무일 |
| shift_type_id | INTEGER NOT NULL REFERENCES shift_types(shift_type_id) | 근무 유형 ID. NOT NULL: 미배정 날짜는 레코드를 삽입하지 않음 |
| is_locked | BOOLEAN NOT NULL DEFAULT false | 교대 협의 중 잠금 여부 |
| version | INTEGER NOT NULL DEFAULT 0 | 낙관적 잠금용 버전 번호. 수정 시마다 +1 |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | 생성일 |
| updated_at | TIMESTAMPTZ NOT NULL DEFAULT now() | 수정일 |

> `status` 필드 제거: 개별 레코드의 확인 상태는 `schedule_periods`(월 확정)로 관리한다.  
> UNIQUE(user_id, work_date) 제약 적용.

---

### 근무 유형 정보 (shift_types)

| 필드 | 타입 | 설명 |
|---|---|---|
| shift_type_id | INTEGER PK | 근무 유형 고유 번호 |
| code | VARCHAR UNIQUE NOT NULL | 근무 코드 (D / E / N / OFF / VAC 등). 중복 불가 |
| label | VARCHAR NOT NULL | 표시 이름 (관리자 설정) |
| start_time | TIME NULL | 시작 시간 (관리자 설정, OFF·VAC는 NULL) |
| end_time | TIME NULL | 종료 시간 (관리자 설정, OFF·VAC는 NULL) |
| color | VARCHAR NOT NULL | 캘린더 표시 색상 (HEX 코드) |
| is_work_day | BOOLEAN NOT NULL | 근무일 여부 |
| is_system | BOOLEAN NOT NULL DEFAULT false | 예약 코드 여부 (OFF·VAC는 true, 수정·삭제 불가) |

---

### 교대 요청 정보 (swap_requests)

| 필드 | 타입 | 설명 |
|---|---|---|
| swap_request_id | INTEGER PK | 교대 요청 고유 번호 |
| requester_id | INTEGER NOT NULL REFERENCES users(user_id) | 요청자 |
| requester_schedule_id | INTEGER NOT NULL REFERENCES schedules(schedule_id) | 교대를 원하는 시프트 |
| requester_years_at_request | INTEGER NOT NULL | 요청 생성 시점의 요청자 연차 스냅샷 |
| required_years_min | INTEGER NOT NULL | 매칭 허용 연차 최솟값 (요청 시 system_settings 기반 계산 후 저장) |
| required_years_max | INTEGER NOT NULL | 매칭 허용 연차 최댓값 |
| status | ENUM('pending','accepted','approved','rejected','expired') NOT NULL DEFAULT 'pending' | 요청 상태 |
| accepted_proposal_id | INTEGER NULL REFERENCES swap_proposals(swap_proposal_id) | 최종 선택된 제안 ID |
| accepted_at | TIMESTAMPTZ NULL | 제안 선택(accepted) 일시. Phase 2 타이머 기산점 |
| expires_at | TIMESTAMPTZ NOT NULL | Phase 1 만료 시각 (created_at + 24h) |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | 요청일 |

---

### 교대 제안 정보 (swap_proposals)

| 필드 | 타입 | 설명 |
|---|---|---|
| swap_proposal_id | INTEGER PK | 교대 제안 고유 번호 |
| swap_request_id | INTEGER NOT NULL REFERENCES swap_requests(swap_request_id) | 연결된 교대 요청 |
| proposer_id | INTEGER NOT NULL REFERENCES users(user_id) | 제안자 |
| proposer_schedule_id | INTEGER NOT NULL REFERENCES schedules(schedule_id) | 제안하는 본인 시프트 |
| proposer_years_at_proposal | INTEGER NOT NULL | 제안 생성 시점의 제안자 연차 스냅샷 |
| status | ENUM('proposed','selected','rejected') NOT NULL DEFAULT 'proposed' | 제안 상태 |
| selected_at | TIMESTAMPTZ NULL | 선택된 일시 |
| rejected_at | TIMESTAMPTZ NULL | 거절된 일시 |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | 제안일 |

---

### 휴무·휴가 요청 정보 (time_off_requests)

| 필드 | 타입 | 설명 |
|---|---|---|
| request_id | INTEGER PK | 요청 고유 번호 |
| requester_id | INTEGER NOT NULL REFERENCES users(user_id) | 요청자 |
| type | ENUM('OFF','VAC') NOT NULL | 요청 유형. OFF: 휴무(단일일 또는 복수일), VAC: 휴가 |
| start_date | DATE NOT NULL | 시작일 |
| end_date | DATE NOT NULL | 종료일 (단일 휴무일 경우 start_date와 동일) |
| reason | TEXT NULL | 요청 사유 |
| status | ENUM('pending','approved','rejected','canceled') NOT NULL DEFAULT 'pending' | 처리 상태 |
| admin_comment | TEXT NULL | 관리자 의견 (승인/반려 시 입력) |
| canceled_by | INTEGER NULL REFERENCES users(user_id) | 취소 처리자 (직원 본인 또는 관리자) |
| cancel_reason | TEXT NULL | 취소 사유 |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | 요청일 |
| processed_at | TIMESTAMPTZ NULL | 승인/반려/취소 처리일 |

---

### 시스템 설정 정보 (system_settings)

| 필드 | 타입 | 설명 |
|---|---|---|
| id | INTEGER PK DEFAULT 1 | 항상 1 고정. 단일 행 테이블 |
| swap_years_range | INTEGER NOT NULL | 교대 매칭 허용 연차 범위 (±N년) |
| max_consecutive_night | INTEGER NOT NULL | 연속 야간근무 최대 횟수 |
| min_daily_staff | INTEGER NOT NULL | 날짜별 최소 인원 수. `is_work_day = true` 코드를 가진 레코드 수 기준 전체 합산 |
| min_avg_years | INTEGER NOT NULL | 팀 평균 연차 최솟값 |
| updated_at | TIMESTAMPTZ NOT NULL DEFAULT now() | 최종 수정일 |

> 이 테이블은 항상 단일 행(id=1)만 존재한다. INSERT 대신 항상 UPDATE만 사용한다.  
> 애플리케이션 기동 시 행이 없으면 기본값으로 자동 생성한다.

---

## 8. 상태 전이 정의

### schedules 관련 상태

`schedules` 개별 레코드에는 별도 status 필드가 없다. 월 단위 상태는 `schedule_periods`로 관리한다.

| 이벤트 | 변경 대상 | 부수 효과 |
|---|---|---|
| 관리자 월 확정 (최초) | `schedule_periods` 레코드 생성, `status` = `confirmed` | — |
| 관리자 월 확정 (재확정) | 기존 `schedule_periods.status` → `confirmed` | `confirmed_at`, `confirmed_by` 갱신 |
| 관리자 배치 저장 (confirmed 상태에서) | `schedules` 레코드 수정 | `schedule_periods.status` → `draft` 자동 전환 |
| 관리자 개별 수정(A3) | `schedules` 레코드 수정 | — |

---

### swap_requests 상태 전이

```
pending
  ├─ [직원이 제안 선택] → accepted
  │     └─ [관리자 승인] → approved
  │     └─ [관리자 반려] → rejected
  │     └─ [accepted_at + 72h 경과] → expired
  ├─ [관리자 반려] → rejected
  └─ [created_at + 24h 경과, 제안 없음] → expired
```

| 전이 | 조건 | 부수 효과 |
|---|---|---|
| `pending` → `accepted` | 요청자가 E7 실행 | `accepted_at` 기록, 미선택 Proposal → `rejected` |
| `accepted` → `approved` | 관리자 승인 | 두 schedules shift_type_id 교환 (단일 트랜잭션), 두 시프트 is_locked 해제 |
| `accepted` → `rejected` | 관리자 반려 | 두 시프트 is_locked 해제 |
| `pending` → `expired` | `created_at + 24h` 경과 | 모든 연관 Proposal → `rejected`, requester_schedule is_locked 해제 |
| `accepted` → `expired` | `accepted_at + 72h` 경과 | 두 시프트 is_locked 해제 |

---

### 직원 비활성화 시 처리 정책

1. 해당 직원의 `pending` 상태 `time_off_requests` → `canceled` (자동 취소)
2. 해당 직원이 requester인 `pending` `swap_requests` → `expired` (자동 만료)
3. 해당 직원이 proposer인 `proposed` `swap_proposals` → `rejected` (자동 거절)
4. 비활성화 직원은 로그인 시 HTTP 401 반환
5. 과거 이력 데이터(`swap_requests` 등)는 보존. `users` 테이블에서 물리 삭제(DELETE) 불가

---

## 9. 주요 화면 구성

| 화면 | 설명 |
|---|---|
| 로그인 화면 | 사용자 로그인. is_initial_password = true 시 비밀번호 변경 화면으로 강제 이동 |
| 비밀번호 변경 화면 | 최초 로그인 강제 변경 및 일반 변경 |
| 관리자 대시보드 | 전체 직원 수, 오늘 근무자(is_work_day=true 코드 기준, confirmed 상태 이상), 휴가자, 승인 대기 건수, 이번 주 근무 현황 차트 |
| 직원 대시보드 | 오늘 근무, 이번 주 근무, 요청 상태 요약 |
| 근무표 캘린더 화면 | 이번 달·과거 근무표 캘린더 조회. year/month 파라미터 필수. 특정 직원·근무 유형별·본인 근무만 보기 필터 제공 |
| 근무표 작성 화면 | 관리자가 직원별 근무를 입력·수정 (배치 저장). 이전 달 근무표를 좌측에 나란히 표시. 자동 검증 경고 표시 |
| 교대 요청 화면 | 교대 요청 생성, 제안 목록 확인, 제안 선택 |
| 요청 관리 화면 | 휴무·휴가·교대 요청 목록 및 처리. VAC 충돌 시 확인 모달 포함 |
| 직원 관리 화면 | 직원 등록·수정·비활성화, 연차 관리, 비밀번호 초기화 |
| 근무 유형 관리 화면 | 근무 코드 추가·수정, 표시 이름·시간·색상 설정. OFF·VAC 및 사용 중 코드는 삭제 불가 |

---

## 10. 메뉴 구조

### 관리자 메뉴

| 메뉴 | URL | 설명 |
|---|---|---|
| 대시보드 | /admin/dashboard | 전체 현황 |
| 근무 스케줄 | /admin/schedules | 월간 근무표 작성 및 조회 |
| 직원 관리 | /admin/employees | 직원 CRUD, 연차 관리, 비밀번호 초기화 |
| 근무 유형 관리 | /admin/shift-types | 근무 코드 관리 |
| 요청 관리 | /admin/requests | 휴무·휴가·교대 요청 처리 |

### 직원 메뉴

| 메뉴 | URL | 설명 |
|---|---|---|
| 대시보드 | /employee/dashboard | 오늘·이번 주 근무 요약 |
| 근무표 | /employee/schedules | 월간 근무표 캘린더 (필터 포함) |
| 교대 요청 | /employee/swap-requests | 교대 요청 생성 및 제안 |
| 휴무·휴가 신청 | /employee/requests | 신청 및 내역 확인 |

---

## 11. API 구성

### 인증 API

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| POST | /api/auth/login | 로그인. 응답에 `is_initial_password` 포함 | 공통 |
| POST | /api/auth/logout | 로그아웃 | 공통 |
| GET | /api/auth/me | 현재 사용자 조회 | 공통 |
| PUT | /api/auth/password | 비밀번호 변경. 요청 body: `current_password`, `new_password` | 공통 |

### 직원 관리 API

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| GET | /api/admin/employees | 직원 목록 조회 | 관리자 |
| POST | /api/admin/employees | 직원 등록. 응답에 임시 비밀번호 1회 포함 | 관리자 |
| PUT | /api/admin/employees/{id} | 직원 수정 | 관리자 |
| POST | /api/admin/employees/{id}/reset-password | 비밀번호 초기화. 응답에 임시 비밀번호 1회 포함 | 관리자 |

### 근무표 API

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| GET | /api/schedules | 근무표 조회. 필수 파라미터: `year`, `month`. 선택 파라미터: `user_id`, `shift_type_id`, `mine` | 공통 |
| GET | /api/schedules/me | 내 근무표 조회. 필수 파라미터: `year`, `month` | 직원 |
| POST | /api/admin/schedules/bulk | 근무표 배치 등록/수정. 요청 body: `[{user_id, work_date, shift_type_id}]` | 관리자 |
| PUT | /api/admin/schedules/{id} | 근무표 단건 수정. 요청 body에 `version` 필수 포함 (낙관적 잠금) | 관리자 |
| POST | /api/admin/schedules/{year}/{month}/confirm | 월 단위 일괄 확정. schedule_periods 생성 | 관리자 |
| GET | /api/admin/schedules/validate | 근무표 자동 검증. 필수 파라미터: `year`, `month` | 관리자 |

### 교대 요청 API

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| POST | /api/swap-requests | 교대 요청 생성. 서버에서 중복·날짜·잠금 검증 수행 | 직원 |
| GET | /api/swap-requests | 교대 요청 목록 조회 | 공통 |
| POST | /api/swap-requests/{id}/proposals | 교대 제안 생성. 서버에서 연차 범위 검증 수행 | 직원 |
| PATCH | /api/swap-requests/{id}/accept | 교대 제안 선택. 미선택 제안 자동 rejected 처리 | 직원 |
| PATCH | /api/admin/swap-requests/{id}/approve | 교대 최종 승인. 단일 트랜잭션 처리 | 관리자 |
| PATCH | /api/admin/swap-requests/{id}/reject | 교대 반려 | 관리자 |

### 휴무·휴가 요청 API

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| POST | /api/requests | 휴무·휴가 신청. 요청 body에 `type`(OFF/VAC) 필수 포함 | 직원 |
| GET | /api/requests/me | 내 요청 목록 조회 | 직원 |
| GET | /api/admin/requests | 전체 요청 목록 조회 | 관리자 |
| PATCH | /api/admin/requests/{id}/approve | 요청 승인. VAC 승인 시 schedules VAC 배정 (단일 트랜잭션). 기존 D/E/N 충돌 시 별도 확인 파라미터 필요 | 관리자 |
| PATCH | /api/admin/requests/{id}/reject | 요청 반려 | 관리자 |
| PATCH | /api/requests/{id}/cancel | 요청 취소. 요청 body에 `cancel_reason` 포함 가능 | 직원 |

### 대시보드 및 근무 유형 API

| Method | URL | 설명 | 권한 |
|---|---|---|---|
| GET | /api/admin/dashboard | 관리자 대시보드 | 관리자 |
| GET | /api/employee/dashboard | 직원 대시보드 | 직원 |
| GET | /api/admin/shift-types | 근무 유형 목록 | 공통 |
| POST | /api/admin/shift-types | 근무 유형 등록 | 관리자 |
| PUT | /api/admin/shift-types/{id} | 근무 유형 수정 | 관리자 |
| DELETE | /api/admin/shift-types/{id} | 근무 유형 삭제. 예약 코드 및 사용 중 코드 삭제 불가 | 관리자 |

---

## 12. 검증 기능

### 근무표 검증 기능

| 검증 항목 | 설명 |
|---|---|
| 연속 야간근무 확인 | 야간근무가 설정값 이상 연속되는 경우 경고 |
| 야간 후 주간근무 확인 | 야간근무 다음 날 주간근무가 배정된 경우 경고 |
| 날짜별 인원 부족 확인 | 특정 날짜에 `is_work_day = true` 코드를 가진 직원 수가 `min_daily_staff`보다 적은 경우 경고. OFF/VAC 직원은 제외 |
| 팀 평균 연차 부족 확인 | 같은 날 동일 근무 코드(D/E/N 각각)를 배정받은 직원들의 평균 연차가 `min_avg_years` 미만인 경우 경고. OFF/VAC 직원 제외 |
| 특정 직원 근무 편중 확인 | 한 직원에게 근무가 과도하게 몰린 경우 경고 |

> **팀 정의**: 같은 날 동일 shift_type_code 기준으로 팀을 구성한다. 예: D 코드 배정 직원들이 하나의 팀. OFF/VAC는 제외.

---

## 13. 기술 스택

### Frontend
- React (Vite)
- JavaScript
- React Router
- Axios
- Tailwind CSS
- **react-big-calendar** (캘린더 UI — MIT 라이선스, 별도 상용 라이선스 불필요)

### Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT (인증)
- Passlib + bcrypt (비밀번호 해시)

### Database
- MySQL
- 개발 초기에는 SQLite 사용 가능
- 최종 구조는 MySQL 기준 설계

### Deployment
- Docker
- Docker Compose (FastAPI + MySQL 컨테이너 구성)
- 초기 관리자 계정은 `.env` 파일의 환경변수로 관리
- AWS EC2 + RDS 확장 가능

> **참고**: 기본 배포는 FastAPI 단일 인스턴스를 권장한다.

---

## 14. 개발 우선순위

### 1단계: 기본 구조
- React + FastAPI 프로젝트 생성
- MySQL 연결 및 테이블 생성 (신규 테이블: `schedule_periods` 포함)
- DB 레벨 제약 조건 적용 (`employee_no UNIQUE`, `shift_types.code UNIQUE`)
- 로그인 및 JWT 인증 구현
- 권한 분리 구현
- 환경변수 기반 초기 관리자 계정 Seed 구현
- 비밀번호 정책 구현 (`is_initial_password` 강제 변경 흐름)

### 2단계: 핵심 기능
- 관리자 대시보드
- 직원 관리 (등록·수정·비활성화·비밀번호 초기화, 비활성화 연쇄 처리 포함)
- 근무 유형 관리 (코드·표시 이름·시간·색상, 삭제 보호 로직 포함)
- 월간 근무표 작성·조회 (배치 저장, 이전 달 좌우 분할 참고, 빈 상태 처리)
- 월 단위 근무표 확정 (`schedule_periods`)
- 근무표 자동 검증 (팀 정의 및 집계 기준 명시)

### 3단계: 직원 기능
- 직원 대시보드
- 캘린더 기반 근무표 조회 (필터 포함, year/month 파라미터 필수)
- 휴무·휴가 신청 (type 필드 포함) 및 내역 확인

### 4단계: 교대 요청 시스템
- Swap Request / Proposal 생성 (중복 체크, 날짜 검증, 연차 스냅샷)
- 연차 범위 기반 매칭
- 상호 합의 처리 (미선택 제안 자동 rejected)
- 동시성 제어 (IS_LOCKED 두 시프트 원자적 잠금, 낙관적 잠금)
- 자동 만료 처리 (Phase 1/2 분리)
- Swap 승인 단일 트랜잭션 처리 (shift_type_id 교환)

### 5단계: 부가 기능
- VAC 승인 시 schedules 배정 (단일 트랜잭션, 충돌 확인 모달)

### 6단계: UI 고도화 및 배포
- 반응형 레이아웃 (PC 중심, 태블릿·모바일 지원)
- 색상 기반 근무 코드 UI
- Dockerfile + docker-compose.yml 작성 (.env 파일 분리)
- 환경변수 분리 및 README 작성 (초기 관리자 계정 생성 절차 포함)

---

## 15. 비기능 요구사항

| 항목 | 요구사항 |
|---|---|
| 성능 | 주요 API 응답 500ms 이내. `GET /api/schedules`는 year/month 필터 필수로 무제한 조회 방지 |
| 권한 관리 | 관리자와 직원의 접근 가능 기능을 FastAPI Dependency 레이어에서 명확히 분리 |
| 보안 | 비밀번호 bcrypt 해시 저장. 초기 비밀번호 응답에 1회만 포함. 관리자 기능은 인증 후 접근. `is_initial_password = true` 계정은 비밀번호 변경 API 외 접근 차단 |
| 동시성 | 낙관적 잠금(version 필드)으로 단일 레코드 Race Condition 방지. Swap 시 두 시프트 순서 고정 원자적 잠금. Swap 승인은 단일 DB 트랜잭션 |
| 사용성 | 월별 근무표를 캘린더·표 형태로 직관적으로 제공 |
| 정확성 | 근무표 데이터는 낙관적 잠금(version)으로 Race Condition 방지 |
| 확장성 | 근무 유형을 DB 기반으로 자유롭게 확장 가능 |
| 유지보수성 | API·DB·화면 기능을 역할별 파일로 분리 |
| 예외 처리 | 잘못된 요청·권한 없음·존재하지 않는 데이터에 대한 오류 메시지 제공. 낙관적 잠금 충돌 시 HTTP 409 반환 |
| 반응형 | PC 화면 중심, 태블릿·모바일에서도 주요 화면 조회 가능 |
| 데이터 무결성 | `employee_no` UNIQUE, `shift_types.code` UNIQUE, `schedules` UNIQUE(user_id, work_date), `schedule_periods` UNIQUE(year, month) |
| 표준 시간대 | 모든 TIMESTAMP 필드는 TIMESTAMPTZ(UTC) 사용. 서버 및 DB timezone은 UTC로 고정 |

---

## 16. 향후 확장 기능

| 기능 | 설명 |
|---|---|
| 자동 근무표 생성 | 제약 조건 기반 근무표 자동 추천 |
| 실시간 알림 | WebSocket 또는 SSE 기반 실시간 알림 |
| 캘린더 연동 | 개인 캘린더(Google Calendar 등)에 근무표 반영 |
| 모바일 최적화 | 직원용 모바일 전용 화면 강화 |
| 법정 근로시간 검증 | 근로기준법 기준에 따른 근무시간 검증 |
| 이메일 발송 | 임시 비밀번호, 알림 등 이메일 전송 기능 추가 |

---

## 부록. v2 → v3 주요 변경 요약

| 분류 | 변경 항목 |
|---|---|
| **데이터 모델** | `users.is_initial_password` 추가 |
| **데이터 모델** | `users.employee_no` UNIQUE 제약 추가 |
| **데이터 모델** | `schedules.status` 필드 제거 → `schedule_periods`로 분리 |
| **데이터 모델** | `schedules.shift_type_id` NOT NULL 명시. 미배정 날짜 레코드 미삽입 정책 |
| **데이터 모델** | `shift_types.code` UNIQUE 제약 추가 |
| **데이터 모델** | `swap_requests.requester_years_at_request`, `accepted_at` 추가 |
| **데이터 모델** | `swap_requests.expires_at` Phase 1 전용으로 명확화 |
| **데이터 모델** | `swap_proposals.proposer_years_at_proposal`, `selected_at`, `rejected_at` 추가 |
| **데이터 모델** | `time_off_requests.type`(OFF/VAC), `canceled_by`, `cancel_reason` 추가 |
| **데이터 모델** | `system_settings` 단일 행 구조 명확화 |
| **신규 테이블** | `schedule_periods` (월 단위 확정 상태 추적) |
| **동시성** | 유향 그래프 데드락 방지 알고리즘 제거 (구조적으로 발생 불가) |
| **동시성** | Proposal 생성 시 proposer_schedule 잠금 추가 |
| **동시성** | 두 시프트 잠금 순서 고정 (낮은 schedule_id 우선) |
| **동시성** | Swap 승인 단일 트랜잭션 명시 |
| **타이머** | Phase 1(24h, pending) / Phase 2(72h, accepted) 분리 |
| **기능** | 관리자 초기 계정 생성 방법 명시 (환경변수 Seed) |
| **기능** | 비밀번호 정책 전면 정의 (초기 비밀번호, 강제 변경, 초기화) |
| **기능** | 근무표 확정 단위 명확화 (월 단위 일괄) |
| **기능** | VAC 승인 충돌 처리 정책 명시 |
| **기능** | 교대 요청 가능 범위 명시 (오늘 이후 날짜만) |
| **기능** | 동일 시프트 Swap 중복 요청 차단 |
| **기능** | 직원 비활성화 연쇄 처리 정책 명시 |
| **API** | `PUT /api/auth/password` 추가 |
| **API** | `POST /api/admin/employees/{id}/reset-password` 추가 |
| **API** | `POST /api/admin/schedules/bulk` 추가 (배치 등록) |
| **API** | `POST /api/admin/schedules/{year}/{month}/confirm` 추가 |
| **API** | `GET /api/schedules`, `GET /api/schedules/me`에 `year`, `month` 필수 파라미터 추가 |
| **검증** | 팀 정의 명확화 (동일 날짜 동일 shift_type_code 기준) |
| **검증** | 인원 집계 기준 명확화 (is_work_day=true, OFF/VAC 제외) |
| **기술 스택** | FullCalendar → react-big-calendar로 확정 (라이선스 문제 해소) |
| **기술 스택** | TIMESTAMPTZ(UTC) 사용 표준화 |
