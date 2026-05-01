# [사용자1] PRD_11·12·13 — Swap Request / Proposal / Admin Approval 프롬프트

> 실행 순서: 3번째 | 전제: PRD_01~03 완료
> PRD_11 → PRD_12 → PRD_13 순서로 실행

---

## PRD_11 프롬프트 (먼저 실행)

```
너는 ShiftMate 프로젝트의 팀장이야.
PRD_01~03이 완료된 상태야.

지금 PRD_11 Swap Request 를 구현해.

## 백엔드 (backend/app/api/swap_requests.py)

POST /api/swap-requests
  권한: get_current_user
  요청: { requester_schedule_id: int, required_years_min: int, required_years_max: int }
  검증 순서:
    1. current_user.role != 'employee' → 403 "직원만 교대 요청을 생성할 수 있습니다"
    2. schedule = db.query(Schedule).get(requester_schedule_id) → None이면 404
    3. schedule.user_id != current_user.user_id → 400 "본인의 시프트만 교대 요청할 수 있습니다"
    4. schedule.work_date <= date.today() → 400 "오늘 이후 날짜의 시프트만 교대 요청할 수 있습니다"
    5. pending 중복 확인 → 400 "이미 대기 중인 교대 요청이 있습니다"
    6. schedule.is_locked → 400 "교대 협의 중인 시프트는 요청할 수 없습니다"
    7. required_years_min > required_years_max → 400 "연차 최솟값은 최댓값보다 클 수 없습니다"
  단일 트랜잭션:
    swap_requests INSERT (
      requester_years_at_request = current_user.years_of_experience,
      expires_at = datetime.now() + timedelta(hours=24),
      status = 'pending'
    )
    schedules UPDATE is_locked=True WHERE schedule_id=requester_schedule_id
  응답 201: {
    swap_request_id, requester_id, requester_schedule_id,
    requester_years_at_request, required_years_min, required_years_max,
    status, expires_at, created_at
  }

GET /api/swap-requests
  권한: get_current_user
  쿼리 파라미터: status(선택), role('requester'|'proposer', 선택)
  처리:
    schedules, shift_types, users JOIN
    proposal_count: SELECT COUNT(*) FROM swap_proposals WHERE swap_request_id = ...
    만료 감지:
      status='pending' AND expires_at < datetime.now()
      → db UPDATE status='expired'
    관리자: 전체 조회
    직원 role='requester': WHERE requester_id = current_user.user_id
    직원 role='proposer': swap_proposals 서브쿼리로 본인이 제안한 요청
    직원 파라미터 없음: 위 두 경우 합산
    정렬: created_at DESC
  응답 200: [{
    swap_request_id, requester_id, requester_name,
    requester_schedule_id, work_date, shift_code, shift_color, shift_label,
    requester_years_at_request, required_years_min, required_years_max,
    status, proposal_count, expires_at, created_at
  }]

PATCH /api/swap-requests/{id}/cancel
  권한: get_current_user
  검증:
    404: swap_request 없음
    403: requester_id != current_user.user_id
    400: status != 'pending' → "대기 중인 요청만 취소할 수 있습니다"
  단일 트랜잭션:
    swap_requests UPDATE status='rejected'
    requester_schedule UPDATE is_locked=False
    연결된 proposals 전체:
      status='rejected'
      각 proposer_schedule UPDATE is_locked=False
  응답 200: { swap_request_id, status: "rejected" }

main.py 라우터 등록:
  from app.api.swap_requests import router as swap_router
  app.include_router(swap_router, prefix="/api", tags=["swap"])

## 프론트엔드 (frontend/src/pages/employee/SwapRequestsPage.jsx)
라우트: /employee/swap-requests

PageHeader "교대 요청" + [교대 요청하기] primary 버튼

상태 탭: [진행 중] [승인됨] [만료됨] [전체]
  진행 중 = pending + accepted 합산

역할 탭: [내가 보낸 요청] [내 시프트 제안 요청]

탭 필터: FE에서 처리 (마운트 시 전체 1회 로드)

요청 아이템 컴포넌트:
  헤더: 🔄 + "{work_date} {shift_code}({shift_label}) 근무 교대 요청" + status Badge
    status Badge:
      pending  → "진행 중" #FEF3C7/#D97706
      accepted → "제안 선택 완료" #EFF6FF/#3B82F6
      approved → "승인됨" #ECFDF5/#059669
      rejected → "반려됨" #FEF2F2/#DC2626
      expired  → "만료됨" 회색
  내용: 사유, 경과 시간(date-fns formatDistanceToNow), 조건({min}~{max}년차)
  만료 표시 (pending만):
    24h 이상: "만료: YYYY-MM-DD HH:mm"
    6~24h: "N시간 후 만료"
    6h 미만: "N시간 후 만료" text-red-600
  제안자 요약: proposal_count > 0이면 "제안자 ({count}명)" + 최대 3명 미리보기
  버튼:
    pending: [취소] ghost + [상세 보기 →] ghost
    accepted: [상세 보기 →] primary
    기타: [상세 보기 →] ghost

교대 요청서 작성 모달 (Modal size="md"):
  제목: "교대 요청하기"
  교대 희망 날짜:
    Select → GET /api/schedules/me?year={년}&month={월} 호출
    오늘 이후 + is_locked=false 필터
    표시: "YYYY-MM-DD ({shift_code} {label})"
  교대 희망 근무: 선택 날짜의 shift_code 자동 표시 (readOnly)
  경력 조건:
    SWAP_YEARS_RANGE_DEFAULT = 2 (FE 상수)
    min: Math.max(0, user.years_of_experience - 2)
    max: user.years_of_experience + 2
    두 개 number Input (min ≤ max 검증)
  만료 시간: number Input (기본 24, 범위 1~72시간)
  사유: textarea (선택, maxLength 200)
  [요청하기] primary → POST /api/swap-requests

취소 확인 모달 (Modal size="sm"):
  내용: "교대 요청을 취소하시겠습니까? 들어온 제안도 모두 거절 처리됩니다."
  [취소하기] danger → PATCH /api/swap-requests/{id}/cancel

만료 시간 re-render: setInterval 60000ms

## 완료 조건
- POST 생성 is_locked=true 확인
- 날짜/중복/잠금/연차범위 차단 확인
- GET 만료 감지 status='expired' DB 업데이트 확인
- PATCH 취소: requester+proposer is_locked=false 확인
- 목록 탭 필터 동작 확인
- 요청서 모달 날짜 드롭다운 동작 확인
```

---

## PRD_12 프롬프트 (PRD_11 완료 후 실행)

```
너는 ShiftMate 프로젝트의 팀장이야.
PRD_11이 완료된 상태야.

지금 PRD_12 Swap Proposal 을 구현해.

## 백엔드 (backend/app/api/swap_requests.py 에 추가)

POST /api/swap-requests/{id}/proposals
  권한: get_current_user
  요청: { proposer_schedule_id: int }
  검증 순서:
    1. role != 'employee' → 403
    2. swap_request 조회 → 404
    3. requester_id == current_user.user_id → 400 "본인 요청에 제안 불가"
    4. status != 'pending' → 400 "대기 중인 요청에만 제안할 수 있습니다"
    5. 만료 이중 체크:
       a. status == 'expired' → 400
       b. expires_at < datetime.now() → DB status='expired' 후 400 "만료된 요청입니다"
    6. proposer_schedule 조회 → 404
    7. proposer_schedule.user_id != current_user.user_id → 400 "본인 시프트만 제안 가능"
    8. proposer_schedule.work_date <= date.today() → 400
    9. proposer_schedule.is_locked → 400 "교대 협의 중인 시프트는 제안할 수 없습니다"
    10. 중복 제안 확인 → 400 "이미 이 요청에 제안하셨습니다"
    11. 연차 검증:
        years = current_user.years_of_experience
        if not (swap_request.required_years_min <= years <= swap_request.required_years_max):
            400 f"연차 조건을 충족하지 않습니다 (요청 조건: {min}~{max}년차, 현재 연차: {years}년차)"
  단일 트랜잭션:
    swap_proposals INSERT (proposer_years_at_proposal = current_user.years_of_experience)
    proposer_schedule UPDATE is_locked=True
  응답 201: {
    swap_proposal_id, swap_request_id, proposer_id,
    proposer_schedule_id, proposer_years_at_proposal, status, created_at
  }

PATCH /api/swap-requests/{id}/accept
  권한: get_current_user
  요청: { proposal_id: int }
  검증:
    404: swap_request 없음
    403: requester_id != current_user.user_id
    400: status != 'pending' → "대기 중인 요청만 제안을 선택할 수 있습니다"
    404: proposal 없음
    400: proposal.swap_request_id != id → "이 요청의 제안이 아닙니다"
  단일 트랜잭션:
    선택된 proposal: status='selected', selected_at=now()
    나머지 proposals (동일 swap_request_id, 선택된 것 제외):
      status='rejected', rejected_at=now()
      각 proposer_schedule: is_locked=False
    선택된 proposer_schedule: is_locked 유지 (변경 없음)
    swap_requests: status='accepted', accepted_proposal_id=proposal_id, accepted_at=now()
  응답 200: { swap_request_id, status, accepted_proposal_id, accepted_at }

GET /api/swap-requests/{id}
  권한: get_current_user
  접근 제어:
    관리자: 모든 요청 조회 가능
    직원: requester_id=current_user.user_id OR 본인이 제안한 요청 → 아니면 403
  처리: swap_requests + swap_proposals + schedules + shift_types + users 다중 JOIN
  응답 200: {
    swap_request_id, requester_id, requester_name,
    requester_schedule_id, work_date, shift_code, shift_color, shift_label,
    requester_years_at_request, required_years_min, required_years_max,
    status, accepted_proposal_id, expires_at, created_at,
    proposals: [{
      swap_proposal_id, proposer_id, proposer_name,
      proposer_schedule_id, proposer_work_date,
      proposer_shift_code, proposer_shift_color, proposer_shift_label,
      proposer_years_at_proposal, status, created_at
    }]
  }

## 프론트엔드 (frontend/src/pages/employee/SwapRequestDetailPage.jsx)
라우트: /employee/swap-requests/:id

← 뒤로가기 링크 + PageHeader "교대 요청 상세"

요청 정보 카드:
  {work_date} {shift_code}({shift_label}) 근무
  상태 Badge, 만료 시각, 연차 조건

화면 분기 (current_user.user_id === requester_id):

요청자 뷰:
  status=pending + proposals 없음:
    "들어온 제안이 없습니다" 안내
  status=pending + proposals 있음:
    제안 아이템 목록 + [선택] primary 버튼
  status=accepted:
    선택된 제안: border-2 border-blue-500 + "✓ 선택됨" Badge(초록)
    나머지: opacity-50 + "거절됨" Badge(회색)
    "관리자 승인 대기 중" 안내
  status=approved: "교대가 완료되었습니다" 성공 표시
  status=rejected: "관리자가 반려했습니다" 안내
  status=expired:  "요청이 만료되었습니다" 안내

제안자 뷰:
  요청 정보 표시 (읽기 전용)
  본인 제안 없음 + status=pending: [제안하기] primary 버튼
  본인 제안 있음: 본인 제안 상태 표시
  status=accepted:
    본인 제안 selected: "선택되었습니다. 관리자 승인 대기 중"
    본인 제안 rejected: "선택되지 않았습니다"

제안 아이템:
  👤 {proposer_name} ({proposer_years_at_proposal}년차)
  {proposer_work_date} {색상칩} {proposer_shift_code} {proposer_shift_label}
  상태에 따른 [선택] / "✓ 선택됨" / "거절됨" 표시

제안 선택 확인 모달 (Modal size="sm"):
  "{proposer_name}님의 제안을 선택하시겠습니까?
   선택 후 나머지 제안은 자동으로 거절 처리됩니다."
  [선택 확정] → PATCH /api/swap-requests/{id}/accept
  성공: GET 재호출 → 화면 갱신

제안 생성 모달 (Modal size="md"):
  요청 정보 읽기 전용 (requester_name, work_date, shift_code, 연차 조건)
  내 시프트 Select → GET /api/schedules/me (오늘 이후 + is_locked=false)
  연차 확인:
    "내 연차: {years}년차 | 요청 조건: {min}~{max}년차"
    충족: text-green-600 ✅ / 미충족: text-red-600 ❌ + [제안하기] disabled
  [제안하기] → POST /api/swap-requests/{id}/proposals

## 완료 조건
- 연차 검증 구체적 메시지 확인
- 제안 생성 proposer is_locked=true 확인
- accept: selected + 나머지 rejected + 잠금 해제 확인
- accept: 선택된 proposer_schedule is_locked 유지 확인
- 상세 화면 요청자/제안자 뷰 분기 확인
```

---

## PRD_13 프롬프트 (PRD_12 완료 후 실행)

```
너는 ShiftMate 프로젝트의 팀장이야.
PRD_12가 완료된 상태야.

지금 PRD_13 Swap Admin Approval BE 를 구현해.

## 백엔드 (backend/app/api/swap_requests.py 에 추가)

PATCH /api/admin/swap-requests/{id}/approve
  권한: require_admin
  검증:
    404: swap_request 없음
    400: status='pending' → "제안이 선택된 요청만 승인할 수 있습니다"
    400: status in ('approved','rejected','expired') → "이미 처리된 요청입니다"
    (status='accepted' 만 통과)
  처리:
    1. accepted_proposal = swap_proposals WHERE swap_proposal_id=accepted_proposal_id
    2. requester_schedule_id, proposer_schedule_id 추출
    3. 두 schedule의 현재 shift_type_id, version 조회
    4. 낮은 schedule_id 순서로 처리 (데드락 방지):
       if req_id < prop_id: 먼저 req 처리
       else: 먼저 prop 처리
    5. 단일 트랜잭션:
       낮은 id schedule:
         UPDATE schedules
         SET shift_type_id={상대방 값}, is_locked=False,
             version=version+1, updated_at=now()
         WHERE schedule_id={id} AND version={expected_version}
         → rowcount=0: ROLLBACK → 409 "동시성 충돌이 발생했습니다. 다시 시도해 주세요"
       높은 id schedule: 동일 처리
       swap_requests UPDATE status='approved', updated_at=now()
  응답 200: {
    swap_request_id, status: "approved",
    requester_schedule_id, proposer_schedule_id,
    approved_at  (= updated_at 값)
  }

PATCH /api/admin/swap-requests/{id}/reject
  권한: require_admin
  요청: { admin_comment: str (선택) }
  검증:
    404: 없음
    400: status not in ('pending','accepted') → "이미 처리된 요청입니다"
  단일 트랜잭션:
    swap_requests UPDATE status='rejected', updated_at=now()
    requester_schedule UPDATE is_locked=False
    status='accepted' 분기:
      accepted_proposal의 proposer_schedule UPDATE is_locked=False
      전체 proposals UPDATE status='rejected', rejected_at=now()
    status='pending' 분기:
      전체 proposals:
        각 proposer_schedule UPDATE is_locked=False
        proposals UPDATE status='rejected', rejected_at=now()
  응답 200: { swap_request_id, status: "rejected", admin_comment }

## 완료 조건
- 승인: 두 shift_type_id 교환 DB 직접 확인
- 승인: 두 is_locked=False, version+1 확인
- 승인: swap_requests status='approved' 확인
- 409: 동시성 충돌 시뮬레이션 동작 확인
  (version 강제 변경 후 재시도)
- 반려(accepted): 선택 proposer+requester 잠금 해제 확인
- 반려(pending): 전체 proposer+requester 잠금 해제 확인
- 이미 처리된 요청 재처리 → 400 확인
- 완료 후 사용자4(멤버3)에게 알림:
  PATCH /api/admin/swap-requests/{id}/approve 완성
  PATCH /api/admin/swap-requests/{id}/reject 완성
```
