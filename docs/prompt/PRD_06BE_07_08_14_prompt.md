# [사용자3] PRD_06(BE)·07·08·14(직원) 프롬프트

> 실행 순서: PRD_06(BE) → PRD_08 → PRD_07 → PRD_14
> 전제: 사용자1 PRD_01~03 완료

---

## PRD_06 BE 프롬프트 (첫 번째 실행)

```
너는 ShiftMate 프로젝트의 멤버2야.
사용자1(팀장)이 PRD_01~03을 완료했고 DB 마이그레이션이 완료된 상태야.

지금 PRD_06 Schedule Write BE + schedule_service.py 를 구현해.

## backend/app/services/schedule_service.py (신규 파일)

from sqlalchemy.orm import Session
from datetime import date, datetime
from app.models.schedule import Schedule

def upsert_schedule(
    db: Session,
    user_id: int,
    work_date: date,
    shift_type_id: int
) -> None:
    """
    schedules 테이블 upsert.
    commit은 호출자 트랜잭션에서 처리.
    """
    existing = db.query(Schedule).filter_by(
        user_id=user_id, work_date=work_date
    ).first()
    if existing:
        existing.shift_type_id = shift_type_id
        existing.updated_at = datetime.now()
    else:
        new_schedule = Schedule(
            user_id=user_id,
            work_date=work_date,
            shift_type_id=shift_type_id
        )
        db.add(new_schedule)
    # commit은 호출자에서 처리

완성 후 사용자4(멤버3)에게 사용법 공유:
  "from app.services.schedule_service import upsert_schedule
   upsert_schedule(db, user_id, work_date, shift_type_id)
   db.commit()  # 호출자가 직접 커밋"

## backend/app/api/schedules.py

GET /api/schedules
  권한: get_current_user
  파라미터: year(필수, int), month(필수, int), user_id(선택, int)
  처리:
    year/month 누락 → 400 "year, month 파라미터는 필수입니다"
    schedules + shift_types JOIN:
      WHERE YEAR(work_date)=year AND MONTH(work_date)=month
    user_id 파라미터 있으면 추가 필터
    role='employee' + user_id 파라미터 없음 → current_user.user_id 자동 필터
    period_status 조회:
      period = db.query(SchedulePeriod).filter_by(year=year, month=month).first()
      period_status = period.status if period else "draft"
    정렬: work_date ASC, user_id ASC
  응답 200:
    {
      "period_status": "draft" | "confirmed",
      "schedules": [
        {
          "schedule_id": int,
          "user_id": int,
          "work_date": "YYYY-MM-DD",
          "shift_type_id": int,
          "shift_code": str,     # shift_types.code
          "shift_color": str,    # shift_types.color
          "shift_label": str,    # shift_types.label
          "is_locked": bool
        }
      ]
    }

GET /api/schedules/me
  권한: get_current_user
  role='admin' → 403 "직원 전용 엔드포인트입니다"
  파라미터: year(필수), month(필수)
  처리: current_user.user_id 자동 필터, GET /api/schedules와 동일 로직
  응답: 동일 구조 (period_status 래퍼)

POST /api/admin/schedules/bulk
  권한: require_admin
  요청 body: [{ user_id: int, work_date: str, shift_type_id: int }]
  처리:
    빈 배열 → 400 "요청 데이터가 비어 있습니다"
    각 user_id, shift_type_id 존재 확인 → 없으면 400
    is_locked=True 레코드 수정 차단 → 400 "교대 협의 중인 시프트는 수정할 수 없습니다: {work_date}"
    MySQL upsert:
      INSERT INTO schedules (user_id, work_date, shift_type_id)
      VALUES (...)
      ON DUPLICATE KEY UPDATE shift_type_id=VALUES(shift_type_id)
    단일 트랜잭션
    저장 후 해당 월 schedule_periods.status가 'confirmed'이면 'draft'로 자동 전환
      (수정 후 재확정 유도 — 확정 상태를 실제 근무표와 일치하게 유지)
  응답 200: { "saved": int }

PUT /api/admin/schedules/{id}
  권한: require_admin
  요청: { shift_type_id: int }
  처리:
    404
    is_locked → 400 "교대 협의 중인 시프트는 수정할 수 없습니다"
    shift_type_id 유효성 확인
    UPDATE + version+1 + updated_at=now()
  응답 200: {
    schedule_id, user_id, work_date, shift_type_id,
    shift_code, shift_label, is_locked
  }

POST /api/admin/schedules/{year}/{month}/confirm
  권한: require_admin
  처리:
    UPSERT (재확정 허용):
      기존 레코드 있음: status='confirmed', confirmed_at=now(), confirmed_by=current_user.user_id 업데이트
      기존 레코드 없음: schedule_periods INSERT
        year, month, status='confirmed',
        confirmed_at=now(), confirmed_by=current_user.user_id
  응답 200: { period_id, year, month, status, confirmed_at, confirmed_by }

GET /api/admin/schedules/validate
  권한: require_admin
  파라미터: year(필수), month(필수)
  처리: validation.py 의 validate_schedule 호출 (PRD_07에서 구현)
  응답 200: { year, month, is_valid, has_warnings, warnings: [...] }
  (Day 3 AM 전까지 빈 warnings 반환하는 placeholder로 구현)

라우터 등록 요청: 사용자1에게
  "from app.api.schedules import router as schedules_router
   app.include_router(schedules_router, prefix='/api', tags=['schedules'])"

## 완료 조건
- schedule_service.py 완성 후 사용자4에게 공유
- GET /api/schedules period_status 래퍼 응답 확인
- bulk upsert (ON DUPLICATE KEY UPDATE) 동작 확인
- is_locked 차단 확인
- confirm UPSERT 동작 확인 (최초 확정 + 재확정 모두 200 응답)
- bulk 저장 후 confirmed → draft 자동 전환 확인
- 완료 후 사용자2(멤버1)에게 알림 → PRD_06 FE 착수 가능
```

---

## PRD_07 프롬프트 (Day 3 AM 실행)

```
너는 ShiftMate 프로젝트의 멤버2야.
PRD_06 BE가 완료된 상태야.

지금 PRD_07 Schedule Validation 을 구현해. (타임라인: Day 3 AM)

## backend/app/services/validation.py (신규 파일)

상수:
  WORKLOAD_BIAS_THRESHOLD = 5  # 편중 임계값 (고정, system_settings에 없음)

def validate_schedule(db: Session, year: int, month: int) -> dict:
  """
  5가지 검증 실행.
  반환: { "is_valid": bool, "warnings": list }
  """
  # 1. system_settings 조회 (하드코딩 금지)
  settings = db.query(SystemSettings).filter_by(id=1).first()
  if not settings:
      return { "is_valid": True, "warnings": [] }

  # 2. 해당 월 schedules 조회 (shift_types JOIN)
  from sqlalchemy import extract
  schedules = db.query(Schedule, ShiftType).join(
      ShiftType, Schedule.shift_type_id == ShiftType.shift_type_id
  ).filter(
      extract('year', Schedule.work_date) == year,
      extract('month', Schedule.work_date) == month
  ).all()

  # 3. 관련 users 조회
  user_ids = list({s.user_id for s, _ in schedules})
  users = {u.user_id: u for u in db.query(User).filter(User.user_id.in_(user_ids)).all()}

  # 4. 검증 실행
  warnings = []
  warnings.extend(_check_consecutive_night(schedules, settings))
  warnings.extend(_check_night_to_day(schedules))
  warnings.extend(_check_min_staff(schedules, settings))
  warnings.extend(_check_avg_years(schedules, users, settings))
  warnings.extend(_check_workload_bias(schedules, users))

  return { "is_valid": len(warnings) == 0, "warnings": warnings }

def _check_consecutive_night(schedules, settings):
  """
  VAL-01: 연속 야간근무 초과
  참조: settings.max_consecutive_night
  로직: 직원별 날짜 정렬 → N 코드 연속 횟수 카운트
  """
  warnings = []
  # user_id별 그룹화
  from itertools import groupby
  user_schedules = {}
  for s, st in schedules:
      if s.user_id not in user_schedules:
          user_schedules[s.user_id] = []
      user_schedules[s.user_id].append((s.work_date, st.code))

  for user_id, entries in user_schedules.items():
      entries.sort(key=lambda x: x[0])
      count = 0
      start_date = None
      for work_date, code in entries:
          if code == 'N':
              if count == 0:
                  start_date = work_date
              count += 1
              if count >= settings.max_consecutive_night:
                  end_date = work_date
                  # 정확히 임계값 초과 시점에 경고
          else:
              if count >= settings.max_consecutive_night:
                  warnings.append({
                      "type": "consecutive_night",
                      "message": f"{name}: {start_date}~{end_date} 야간근무 {count}일 연속 (최대 {settings.max_consecutive_night}일)",
                      "affected_date": str(start_date),
                      "affected_user_id": user_id,
                      "affected_user_name": name,
                  })
              count = 0
              start_date = None
      if count >= settings.max_consecutive_night:
          warnings.append({...})  # 월 말 처리
  return warnings

  # 주의: 위는 로직 예시. 실제로는 users dict를 받아 name을 채울 것.
  # validate_schedule에서 users를 _check 함수에 전달하도록 수정.

def _check_night_to_day(schedules):
  """
  VAL-02: 야간 후 주간 배정
  로직: N 다음 날 D 패턴 감지 (월 경계 제외)
  """
  warnings = []
  from datetime import timedelta
  schedule_map = {}  # (user_id, work_date) → shift_code
  for s, st in schedules:
      schedule_map[(s.user_id, s.work_date)] = st.code

  for (user_id, work_date), code in schedule_map.items():
      if code == 'N':
          next_date = work_date + timedelta(days=1)
          next_code = schedule_map.get((user_id, next_date))
          if next_code == 'D':
              warnings.append({
                  "type": "night_to_day",
                  "message": f"{name}: {work_date} 야간 후 {next_date} 주간 배정",
                  "affected_date": str(next_date),
                  "affected_user_id": user_id,
                  "affected_user_name": name,
              })
  return warnings

def _check_min_staff(schedules, settings):
  """
  VAL-03: 날짜별 최소 인원 미달
  참조: settings.min_daily_staff
  로직: 날짜별 is_work_day=true 직원 수 < min_daily_staff
  """
  warnings = []
  from collections import Counter
  date_counts = Counter()
  for s, st in schedules:
      if st.is_work_day:
          date_counts[s.work_date] += 1

  for work_date, count in date_counts.items():
      if count < settings.min_daily_staff:
          warnings.append({
              "type": "min_staff",
              "message": f"{work_date}: 근무 인원 {count}명 (최소 {settings.min_daily_staff}명 필요)",
              "affected_date": str(work_date),
              "affected_user_id": None,
              "affected_user_name": None,
          })
  return warnings

def _check_avg_years(schedules, users, settings):
  """
  VAL-04: 팀 평균 연차 미달
  팀 정의: 같은 날 + 같은 shift_type_id (OFF/VAC 제외)
  참조: settings.min_avg_years
  """
  warnings = []
  from collections import defaultdict
  team_map = defaultdict(list)  # (work_date, shift_type_id) → [user_id]
  shift_codes = {}  # shift_type_id → code

  for s, st in schedules:
      if st.is_work_day:  # OFF/VAC 제외
          team_map[(s.work_date, s.shift_type_id)].append(s.user_id)
          shift_codes[s.shift_type_id] = st.code

  for (work_date, shift_type_id), user_ids in team_map.items():
      if len(user_ids) == 0:
          continue
      years_list = [users[uid].years_of_experience for uid in user_ids if uid in users]
      if not years_list:
          continue
      avg = sum(years_list) / len(years_list)
      if avg < settings.min_avg_years:
          code = shift_codes.get(shift_type_id, "?")
          warnings.append({
              "type": "avg_years",
              "message": f"{work_date} {code} 팀: 평균 연차 {avg:.1f}년 (최소 {settings.min_avg_years}년 필요)",
              "affected_date": str(work_date),
              "affected_user_id": None,
              "affected_user_name": None,
          })
  return warnings

def _check_workload_bias(schedules, users):
  """
  VAL-05: 특정 직원 근무 편중
  근무일 정의: is_work_day=True 코드 배정 날짜 수 (OFF/VAC/미배정 제외)
  임계값: WORKLOAD_BIAS_THRESHOLD = 5 (고정)
  """
  warnings = []
  from collections import Counter
  work_counts = Counter()
  for s, st in schedules:
      if st.is_work_day:
          work_counts[s.user_id] += 1

  if len(work_counts) < 2:
      return warnings

  avg = sum(work_counts.values()) / len(work_counts)
  for user_id, count in work_counts.items():
      diff = count - avg
      if diff > WORKLOAD_BIAS_THRESHOLD:
          name = users.get(user_id, {})
          if hasattr(name, 'name'):
              name = name.name
          warnings.append({
              "type": "workload_bias",
              "message": f"{name}: 이번 달 근무 {count}일 (팀 평균 {avg:.1f}일 대비 {diff:.0f}일 초과)",
              "affected_date": None,
              "affected_user_id": user_id,
              "affected_user_name": name,
          })
  return warnings

위 함수들을 실제 동작하는 코드로 완성하고,
validate_schedule이 users dict를 각 _check 함수에 전달하도록 구성.
모든 경고 객체의 name 필드는 users dict에서 실제 이름으로 채울 것.

GET /api/admin/schedules/validate 에서 호출:
  from app.services.validation import validate_schedule
  result = validate_schedule(db, year, month)
  return { "year": year, "month": month, **result }

## 완료 조건
- 5가지 경고 유형 각각 테스트 데이터 세팅 후 확인
- is_valid=true (경고 없는 정상 데이터) 확인
- settings.max_consecutive_night 값 변경 시 경고 기준 변동 확인 (하드코딩 없음)
- 완성 후 사용자2(멤버1)에게 알림 → PRD_06 FE Day 3 AM 검증 연결
```

---

## PRD_08 프롬프트 (PRD_06 BE 완료 후)

```
너는 ShiftMate 프로젝트의 멤버2야.
PRD_06 BE 완료, 사용자1이 CalendarBase.jsx를 제공한 상태야.
(frontend/src/components/CalendarBase.jsx 사용 가능)

지금 PRD_08 Schedule Calendar FE 를 구현해.

## frontend/src/pages/admin/SchedulePage.jsx — 캘린더 탭 추가

사용자2(멤버1)의 그리드 탭 코드에 캘린더 탭 추가:
  {view === 'grid' && <GridView />}
  {view === 'calendar' && <CalendarView />}

CalendarView 컴포넌트:

미확정 배너 (period_status='draft' 시):
  배경 #FEF3C7, 좌측 border #D97706, 텍스트 #D97706
  "⚠ {year}년 {month}월 근무표는 아직 미확정입니다."
  "[근무표 작성으로 이동 →]" 버튼:
    onClick: setSearchParams({ year, month, view: 'grid' })
    (확정 플로우 자동 시작 없음 — 그리드 탭의 확정 버튼 위치 안내 목적)

필터 행 (관리자만):
  직원 필터 Select: GET /api/admin/employees 옵션 (전체 + 각 직원)
  유형 필터 Select: GET /api/admin/shift-types 옵션 (전체 + 각 코드)
  FE 필터링 (events useMemo로 처리)

react-big-calendar 월간 뷰 (CalendarBase.jsx 확장):
  CalendarBase 컴포넌트를 import하여 확장
  또는 CalendarBase의 설정을 참조하여 직접 구현

  이벤트 변환 (schedules → events):
    관리자: title = `{직원명} {shift_code}`
    직원:   title = `{shift_code} {shift_label}`
    start = new Date(work_date)
    end   = new Date(work_date)
    color = shift_color

  eventPropGetter:
    return {
      style: {
        backgroundColor: event.color,
        borderColor: event.color,
        color: '#ffffff',
        borderRadius: '4px',
        fontSize: '11px',
        padding: '1px 4px'
      }
    }

  dayPropGetter:
    오늘: { style: { backgroundColor: '#EFF6FF', border: '1px solid #3B82F6' } }
    토요일: { style: { backgroundColor: '#F8FAFC' } }
    일요일: { style: { backgroundColor: '#FFF5F5' } }

필터 적용 (useMemo):
  filteredEvents = events
    .filter(e => !selectedUser || e.userId === selectedUser)
    .filter(e => !selectedShift || e.shiftCode === selectedShift)

날짜 클릭 팝오버 (onSelectSlot 또는 onSelectEvent):
  관리자:
    날짜: "YYYY년 M월 D일 (요일)"
    근무자 목록: {직원명} {색상칩 16px} {shift_code} {shift_label}
    "근무 인원: N명"
  직원:
    날짜, 내 근무 ({shift_code} {shift_label})
    시간: "{start_time} ~ {end_time}" (OFF/VAC는 미표시)
  외부 클릭 닫힘 (useRef + 이벤트 리스너)

빈 상태:
  관리자: "이번 달 근무표가 아직 작성되지 않았습니다"
  직원:   "이번 달 근무표가 아직 배정되지 않았습니다"

## frontend/src/pages/employee/SchedulePage.jsx (신규 파일)
라우트: /employee/schedules?year={년}&month={월}

AppLayout role="employee" 사용

PageHeader title="근무표 조회" + 월 네비게이션

react-big-calendar 월간 뷰:
  GET /api/schedules/me?year={year}&month={month} 호출
  이벤트 변환: title = `{shift_code} {shift_label}`
  eventPropGetter, dayPropGetter: 관리자 캘린더와 동일
  필터 없음, 확정 버튼 없음, 미확정 배너 없음

## 완료 조건
- 색상 표시 (eventPropGetter shift_color) 확인
- 오늘/토요일/일요일 하이라이트 확인
- 관리자: 전체 직원 이벤트 + 필터 동작 확인
- 직원: 본인 이벤트만 표시 확인
- 미확정 배너: draft 시 표시, confirmed 시 숨김 확인
- "[근무표 작성으로 이동 →]": view=grid 탭 전환 확인
- 날짜 클릭 팝오버 동작 확인
- 확정 버튼 없음 확인 (캘린더 탭)
```

---

## PRD_14 직원 대시보드 프롬프트 (Day 3 PM 실행)

```
너는 ShiftMate 프로젝트의 멤버2야.
PRD_06·07·08이 완료된 상태야.

지금 PRD_14 직원 대시보드 BE + FE 를 구현해.

## 백엔드 (backend/app/api/schedules.py 에 추가)

GET /api/employee/dashboard
  권한: get_current_user
  role='admin' → 403 "직원 전용 엔드포인트입니다"

  today_schedule:
    today = date.today()
    row = db.query(Schedule, ShiftType).join(...).filter(
      Schedule.user_id == current_user.user_id,
      Schedule.work_date == today
    ).first()
    → None이면 null 반환

  this_week (이번 주 계산 — INTEGRATION.md 섹션 6):
    from datetime import date, timedelta
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    week_dates = [monday + timedelta(days=i) for i in range(7)]
    DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"]

    result = []
    for i, work_date in enumerate(week_dates):
        row = db.query(Schedule, ShiftType).join(...).filter(
            Schedule.user_id == current_user.user_id,
            Schedule.work_date == work_date
        ).first()
        result.append({
            "work_date": str(work_date),
            "day_label": DAY_LABELS[i],
            "shift_code":  row[1].code  if row else None,
            "shift_label": row[1].label if row else None,
            "shift_color": row[1].color if row else None,
            "is_today": work_date == today
        })

  my_requests (최근 3건):
    time_off = db.query(TimeOffRequest).filter_by(
        requester_id=current_user.user_id
    ).order_by(desc(created_at)).limit(3).all()

    swap = db.query(SwapRequest).filter_by(
        requester_id=current_user.user_id
    ).order_by(desc(created_at)).limit(3).all()

    combined = []
    for r in time_off:
        date_display = str(r.start_date)[5:] if r.start_date == r.end_date \
                       else f"{str(r.start_date)[5:]}~{str(r.end_date)[5:]}"
        combined.append({
            "request_id": r.request_id,
            "type": r.type,  # "OFF" 또는 "VAC"
            "date_display": date_display,
            "status": r.status,
            "created_at": r.created_at.isoformat()
        })
    for r in swap:
        combined.append({
            "request_id": r.swap_request_id,
            "type": "SWAP",
            "date_display": str(r.created_at)[:10][5:],  # 요청일 기준
            "status": r.status,
            "created_at": r.created_at.isoformat()
        })
    combined.sort(key=lambda x: x["created_at"], reverse=True)
    my_requests = combined[:3]

  응답 200:
    {
      "today_schedule": {
        "work_date": str, "shift_code": str, "shift_label": str,
        "shift_color": str, "start_time": str|null, "end_time": str|null,
        "is_work_day": bool
      } | null,
      "this_week": [7개 항목],
      "my_requests": [최대 3건]
    }

라우터 등록 요청: 사용자1에게

## 프론트엔드 (frontend/src/pages/employee/DashboardPage.jsx)
라우트: /employee/dashboard

AppLayout role="employee" 사용

PageHeader:
  title="직원 대시보드"
  subtitle=`${year}년 ${month}월 ${day}일 (${dayOfWeek}) · 안녕하세요, ${user.name}님`

오늘의 근무 Card:
  today_schedule 있음:
    style={{ borderLeft: `4px solid ${today_schedule.shift_color}` }}
    🕐 아이콘 (Lucide) + `${shift_label} 근무`
    Badge: shift_code (backgroundColor=shift_color, color=white)
    시간:
      is_work_day=true: `${start_time} - ${end_time}`
      is_work_day=false: shift_code=OFF → "휴무일" / shift_code=VAC → "휴가일"
  today_schedule null:
    text-slate-400 "오늘 배정된 근무가 없습니다"

이번 주 근무표 Card:
  title="📅 이번 주 근무표"
  overflow-x-auto (모바일 스크롤)
  7개 셀 가로 배열 (flex):
    각 셀: min-w-[60px]
      상단: `${day_label}(${work_date의 일})` 텍스트
            is_today: text-blue-600 font-semibold + border-bottom 2px solid #3B82F6
      하단: ShiftCell 컴포넌트
            shift_code null: text-slate-300 text-xs "미배정"

나의 요청 Card:
  title="📋 나의 요청"
  최대 3건 목록:
    • {type Badge} {date_display}  {status Badge}
    type Badge:
      OFF  → variant="default" 회색 "휴무"
      VAC  → variant="status-approved" 초록 "휴가"
      SWAP → className blue "교대"
    status Badge: PRD_09 기준 동일
  [전체 보기 →] ghost 버튼:
    OFF/VAC 있거나 타입 혼재: navigate('/employee/requests')
    SWAP만: navigate('/employee/swap-requests')
  빈 상태: "최근 요청 내역이 없습니다" text-slate-400

데이터:
  마운트: GET /api/employee/dashboard

## 완료 조건
- today_schedule null 처리 확인
- this_week 7개 항목, 미배정 null 처리 확인
- my_requests 최대 3건 + SWAP 구분 확인
- 오늘 셀 강조 (text-blue-600 + border) 확인
- 오늘 근무 카드 좌측 border 색상 확인
- 모바일 이번 주 카드 가로 스크롤 확인
```
