너는 ShiftMate 프로젝트의 멤버3이야.
PRD_09가 완료되었고,
멤버2(사용자3)가 schedule_service.py의 upsert_schedule 함수를
공유한 상태야.

지금 PRD_10 TimeOff Request Admin + Dashboard API 를 구현해.

## 구현 범위

### 백엔드 (backend/app/api/requests.py 에 추가)

GET /api/admin/requests
권한: require_admin
파라미터: status(선택), type(선택)
처리: users JOIN (requester_name), created_at DESC
응답 200: [{ request_id, requester_id, requester_name, type,
              start_date, end_date, reason, status,
              admin_comment, created_at, processed_at }]

PATCH /api/admin/requests/{id}/approve
권한: require_admin
요청: { admin_comment(선택) }
검증: 404, status!='pending' → 400 "이미 처리된 요청입니다"
처리 — 단일 트랜잭션:
  time_off_requests: status='approved', admin_comment, processed_at=now()
  type='VAC' 인 경우:
    VAC shift_type_id 조회:
      SELECT shift_type_id FROM shift_types WHERE code='VAC'
    start_date ~ end_date 각 날짜:
      from app.services.schedule_service import upsert_schedule
      upsert_schedule(db, requester_id, date, vac_shift_type_id)
  db.commit()  ← 트랜잭션 한 번에 커밋
응답 200: { request_id, status, admin_comment, processed_at }

PATCH /api/admin/requests/{id}/reject
권한: require_admin
요청: { admin_comment(선택) }
검증: 404, status!='pending' → 400
처리: status='rejected', admin_comment, processed_at=now()
응답 200: { request_id, status, admin_comment, processed_at }

GET /api/admin/dashboard
권한: require_admin

total_employees:
  SELECT COUNT(*) FROM users
  WHERE role='employee' AND is_active=true

today_working:
  SELECT COUNT(DISTINCT s.user_id) FROM schedules s
  JOIN shift_types st ON s.shift_type_id=st.shift_type_id
  WHERE s.work_date=today AND st.is_work_day=true

today_on_leave:
  SELECT COUNT(DISTINCT s.user_id) FROM schedules s
  JOIN shift_types st ON s.shift_type_id=st.shift_type_id
  WHERE s.work_date=today AND st.code='VAC'

pending_requests:
  (SELECT COUNT(*) FROM time_off_requests WHERE status='pending')
  + (SELECT COUNT(*) FROM swap_requests
     WHERE status IN ('pending','accepted'))

this_week_schedule (INTEGRATION.md 섹션 6 계산식 준수):
  from datetime import date, timedelta
  today = date.today()
  monday = today - timedelta(days=today.weekday())
  week_dates = [monday + timedelta(days=i) for i in range(7)]
  각 날짜별 is_work_day=true 직원 수 + 요일 레이블

응답 200:
  { total_employees, today_working, today_on_leave,
    pending_requests,
    this_week_schedule: [{ date, day(월~일), count }] }

### 프론트엔드 (frontend/src/pages/admin/RequestsPage.jsx)
라우트: /admin/requests

화면 구성:
  PageHeader "요청 관리"
  상태 탭: [대기 중(N)] [승인됨(N)] [반려됨(N)] [전체]
  유형 필터: [전체 ▼] (OFF/VAC/교대)
  요청 목록

휴무·휴가 아이템:
  👤 아이콘 + requester_name + status Badge + 유형 Badge(OFF/VAC)
  날짜 (M/D 또는 M/D~M/D) + 사유 + 경과 시간
  status='pending' 시: [승인] primary sm + [반려] danger sm

교대 요청 아이템:
  🔄 아이콘 + 교대요청 Badge (파랑)
  Day 3 AM 이전: [승인][반려] 클릭 시 Toast info "준비 중입니다"
  Day 3 PM (팀장 알림 수신 후): 실제 API 연결

요청 상세 모달 (Modal size="md"):
  요청 정보 전체 표시
  status='pending': admin_comment textarea + [반려][승인] 버튼
  처리된 요청: 읽기 전용 표시 + [닫기]만

승인 흐름:
  PATCH /api/admin/requests/{id}/approve
  성공 Toast:
    OFF: "휴무 신청이 승인되었습니다"
    VAC: "휴가 신청이 승인되었습니다 (근무표에 VAC가 자동 배정되었습니다)"
  완료: 목록 새로고침

반려 흐름:
  반려 사유 모달 (Modal size="sm") → PATCH reject
  성공 Toast + 목록 새로고침

## 인터페이스 규칙
- schedule_service.upsert_schedule 사용 (직접 Schedule 모델 조작 금지)
- 이번 주 계산: INTEGRATION.md 섹션 6 준수

## 완료 조건
- OFF 승인: schedules 변화 없음 확인
- VAC 승인: schedules VAC 배정 확인 (날짜 범위 전체)
- VAC 트랜잭션 롤백 동작 확인
- 대시보드 API 5개 항목 정확 확인
- 요청 관리 화면 탭/필터 동작 확인