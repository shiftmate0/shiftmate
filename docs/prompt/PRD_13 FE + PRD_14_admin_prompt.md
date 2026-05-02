너는 ShiftMate 프로젝트의 멤버3이야.
PRD_10이 완료되었고, 팀장이 PRD_13 BE API를 완성하여 알림을 보낸 상태야.

현재 아래의 내용이 구현되어 있는 상태야. 완료 조건과 함께 제대로 구현되어 있는지 확인해.

## 구현 범위 A — PRD_13 FE (frontend/src/pages/admin/RequestsPage.jsx 수정)

교대 요청 행 상태별 표시:
  pending:
    내용: "{requester_name} — {work_date} {shift_code} 교대 원함"
    [승인] disabled (accepted만 승인 가능)
    [반려] danger 활성
  accepted:
    GET /api/swap-requests/{id} 호출 → proposer 정보 로드
    내용: "{requester_name} {shift_code} ↕ {proposer_name} {proposer_shift_code}"
    [승인] primary 활성
    [반려] danger 활성
  approved: Badge "승인 완료" (초록), 버튼 없음
  rejected: Badge "반려됨" (빨강), 버튼 없음
  expired:  Badge "만료됨" (회색), 버튼 없음

교대 승인 확인 모달 (Modal size="sm"):
  내용: "{requester_name} {shift_code} ↕ {proposer_name} {proposer_shift_code}"
        "이 교대를 최종 승인하시겠습니까?"
  [승인 확정] →
    PATCH /api/admin/swap-requests/{id}/approve
    성공: Toast "{requester_name}↔{proposer_name} 교대가 승인되었습니다"
    409: Toast "처리 중 충돌이 발생했습니다. 다시 시도해 주세요"

교대 반려 사유 모달 (Modal size="sm"):
  textarea + [반려 확정] →
    PATCH /api/admin/swap-requests/{id}/reject  { admin_comment: <입력값> }
    성공: Toast "교대 요청이 반려되었습니다"

"준비 중입니다" Toast 코드 제거 (실제 API로 교체)
완료 후: 요청 목록 새로고침

## 구현 범위 B — PRD_14 관리자 대시보드 FE
(frontend/src/pages/admin/DashboardPage.jsx)
라우트: /admin/dashboard
사용 API: GET /api/admin/dashboard (PRD_10 완성)

완성 전: mocks/dashboard.js 의 mockAdminDashboard 사용

PageHeader:
  제목: "관리자 대시보드"
  서브타이틀: "{year}년 {m}월 {d}일 ({요일}) · 오늘의 근무 현황"

KPI 카드 4개 (KPICard 컴포넌트):
  👥 total_employees  — "전체 직원 수", sub: "활성 직원 기준"
                         icon: Users, color: #3B82F6, bg: #EFF6FF
  💼 today_working    — "오늘 근무자",  sub: "is_work_day 기준"
                         icon: Briefcase, color: #8B5CF6, bg: #F5F3FF
  📅 today_on_leave   — "오늘 휴무·휴가", sub: "VAC 코드 기준"
                         icon: Calendar, color: #10B981, bg: #ECFDF5
  ⏰ pending_requests — "승인 대기",    sub: "휴무+교대 합산"
                         icon: Clock, color: #F59E0B, bg: #FEF3C7
  반응형: 4→2→1 columns (Tailwind grid-cols)

이번 주 근무 현황 차트:
  Recharts BarChart
  데이터: this_week_schedule (7개)
  X축: day(월~일), Y축: count
  기본 막대: #3B82F6
  오늘 날짜 막대: #8B5CF6
  툴팁: "{day}요일: {count}명 근무"
  컨테이너: 60% 너비 (Tablet/Mobile: 100%)

최근 요청 목록:
  GET /api/admin/requests?status=pending 호출
  최대 5건 표시
  아이템: 아바타(이름 첫 글자, #EFF6FF/#3B82F6) + 유형 + 경과 시간
  [승인][반려] quick action (ghost sm)
    OFF/VAC: PATCH /api/admin/requests/{id}/approve·reject 직접 호출
    교대: PATCH /api/admin/swap-requests/{id}/approve·reject 호출
  성공: 대시보드 API 재호출 + 목록 재호출
  [전체 보기 →] → /admin/requests

근무표 상태 알림:
  GET /api/schedules?year=&month= 응답의 period_status 참조
  draft:
    배경 #FEF3C7, 텍스트 #D97706
    "⚠ {year}년 {month}월 근무표가 아직 확정되지 않았습니다"
    "[근무표 작성 →]" → /admin/schedules
  confirmed:
    배경 #ECFDF5, 텍스트 #059669
    "✅ {year}년 {month}월 근무표가 확정되었습니다"

## 완료 조건

PRD_13 FE:
  - 교대 행 상태별 버튼 분기 확인
  - 승인 확인 모달 두 직원 정보 표시 확인
  - 409 충돌 Toast 처리 확인
  - "준비 중" 코드 제거 확인

PRD_14 관리자 FE:
  - KPI 4개 실제 API 데이터 표시 확인
  - Recharts 주간 차트 + 오늘 강조 확인
  - quick action 승인 후 pending 카운트 갱신 확인
  - 근무표 상태 알림 Draft/Confirmed 분기 확인
  - 반응형 4→2→1 columns 확인