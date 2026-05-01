너는 ShiftMate 프로젝트의 멤버3이야.
팀장이 PRD_01~03을 완료했고 공용 컴포넌트가 준비된 상태야.

지금 PRD_09 TimeOff Request Employee 를 구현해.

## 구현 범위

### 백엔드 (backend/app/api/requests.py)

POST /api/requests
권한: get_current_user
요청: { type("OFF"|"VAC"), start_date, end_date, reason(선택) }
검증:
  type: OFF 또는 VAC 만 → 400 "유효하지 않은 요청 유형입니다"
  end_date >= start_date → 400 "종료일은 시작일 이후여야 합니다"
  중복 체크 (status='pending' + 날짜 범위 겹침):
    기존.start_date <= 신규.end_date AND 기존.end_date >= 신규.start_date
    canceled·rejected·approved 상태는 체크하지 않음 (허용)
    → 400 "해당 날짜 범위에 이미 대기 중인 신청이 있습니다"
처리: INSERT status='pending'
응답 201: { request_id, requester_id, type, start_date, end_date,
             reason, status, created_at }

GET /api/requests/me
권한: get_current_user
파라미터: status(선택)
처리: current_user.user_id 필터, created_at DESC
응답 200: [{ request_id, type, start_date, end_date, reason,
              status, admin_comment, created_at, processed_at }]

PATCH /api/requests/{id}/cancel
권한: get_current_user
검증:
  404: 없음
  403: requester_id != current_user.user_id
  400: status != 'pending' → "대기 중인 요청만 취소할 수 있습니다"
처리: status='canceled', canceled_by=current_user.user_id,
      processed_at=now()
응답 200: { request_id, status }

### 프론트엔드 (frontend/src/pages/employee/RequestsPage.jsx)
라우트: /employee/requests

화면 구성 (상단 신청 폼 + 하단 내역 목록):

신청 폼 Card:
  유형: OFF/VAC 라디오 (기본 OFF)
  시작일: date Input (기본 오늘)
  종료일: date Input (기본 오늘, min=시작일)
  종료 < 시작: 인라인 에러
  사유: textarea (선택, maxLength 200)
  [신청하기] primary: 날짜 미입력 시 disabled
  POST /api/requests 호출
  성공: Toast success "신청이 접수되었습니다" + 폼 초기화 + 목록 갱신
  400 중복: Toast error "해당 기간에 이미 신청이 있습니다"

내역 목록:
  탭: [전체][대기 중][승인됨][반려됨]
  탭 전환: GET /api/requests/me?status= 재호출

아이템 구성:
  {type Badge} {날짜} {status Badge}
    날짜: start=end → "M/D" / start≠end → "M/D~M/D"
    status Badge:
      pending  → Badge "대기 중" #D97706/#FEF3C7
      approved → Badge "승인됨" #059669/#ECFDF5
      rejected → Badge "반려됨" #DC2626/#FEF2F2
      canceled → Badge "취소됨" 회색
    경과 시간: date-fns formatDistanceToNow
    반려 사유: status='rejected' + admin_comment 있을 때만 표시 (#DC2626)
    [취소] ghost sm: status='pending' 시만 표시

취소 확인 모달 (Modal size="sm"):
  내용: "이 신청을 취소하시겠습니까? {type} {날짜}"
  [취소하기] danger → PATCH /api/requests/{id}/cancel
  성공: Toast success + 목록 갱신

빈 상태: "신청 내역이 없습니다" / "{status} 상태의 신청이 없습니다"

## 완료 조건
- POST 성공 + 중복 차단 + 날짜 검증 확인
- GET status 필터 확인
- PATCH 취소 (pending만) 확인
- canceled·rejected 상태 재신청 허용 확인
- 반려 사유 조건부 표시 확인
- [취소] pending만 표시 확인