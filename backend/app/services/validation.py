from collections import Counter, defaultdict
from datetime import date, timedelta
from typing import Any, Dict, List

from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.models.schedule import Schedule
from app.models.shift_type import ShiftType
from app.models.system_settings import SystemSettings
from app.models.user import User

WORKLOAD_BIAS_THRESHOLD = 5


def validate_schedule(db: Session, year: int, month: int) -> Dict[str, Any]:
    """
    5가지 검증 실행.
    반환: { "is_valid": bool, "warnings": list }
    """
    settings = db.query(SystemSettings).filter_by(id=1).first()
    if not settings:
        return {"is_valid": True, "warnings": []}

    rows: List = (
        db.query(Schedule, ShiftType)
        .join(ShiftType, Schedule.shift_type_id == ShiftType.shift_type_id)
        .filter(
            extract("year", Schedule.work_date) == year,
            extract("month", Schedule.work_date) == month,
        )
        .all()
    )

    user_ids = list({s.user_id for s, _ in rows})
    users: Dict[int, User] = {
        u.user_id: u
        for u in db.query(User).filter(User.user_id.in_(user_ids)).all()
    }

    warnings: List[Dict] = []
    warnings.extend(_check_consecutive_night(rows, users, settings))
    warnings.extend(_check_night_to_day(rows, users))
    warnings.extend(_check_min_staff(rows, settings))
    warnings.extend(_check_avg_years(rows, users, settings))
    warnings.extend(_check_workload_bias(rows, users))

    return {"is_valid": len(warnings) == 0, "warnings": warnings}


def _check_consecutive_night(rows, users, settings) -> List[Dict]:
    """VAL-01: 연속 야간근무 초과"""
    warnings = []
    user_schedules: Dict[int, List] = defaultdict(list)
    for s, st in rows:
        user_schedules[s.user_id].append((s.work_date, st.code))

    for user_id, entries in user_schedules.items():
        entries.sort(key=lambda x: x[0])
        count = 0
        start_date: date = None
        end_date: date = None

        for work_date, code in entries:
            if code == "N":
                if count == 0:
                    start_date = work_date
                count += 1
                end_date = work_date
            else:
                if count > settings.max_consecutive_night:
                    name = users[user_id].name if user_id in users else str(user_id)
                    warnings.append({
                        "type": "consecutive_night",
                        "message": (
                            f"{name}: {start_date}~{end_date} 야간근무 {count}일 연속 "
                            f"(최대 {settings.max_consecutive_night}일)"
                        ),
                        "affected_date": start_date,
                        "affected_user_id": user_id,
                        "affected_user_name": name,
                    })
                count = 0
                start_date = None
                end_date = None

        # 월말까지 야간 연속인 경우
        if count > settings.max_consecutive_night:
            name = users[user_id].name if user_id in users else str(user_id)
            warnings.append({
                "type": "consecutive_night",
                "message": (
                    f"{name}: {start_date}~{end_date} 야간근무 {count}일 연속 "
                    f"(최대 {settings.max_consecutive_night}일)"
                ),
                "affected_date": start_date,
                "affected_user_id": user_id,
                "affected_user_name": name,
            })

    return warnings


def _check_night_to_day(rows, users) -> List[Dict]:
    """VAL-02: 야간 후 주간 배정 (월 경계 제외)"""
    warnings = []
    schedule_map: Dict = {}
    for s, st in rows:
        schedule_map[(s.user_id, s.work_date)] = st.code

    for (user_id, work_date), code in schedule_map.items():
        if code == "N":
            next_date = work_date + timedelta(days=1)
            next_code = schedule_map.get((user_id, next_date))
            if next_code == "D":
                name = users[user_id].name if user_id in users else str(user_id)
                warnings.append({
                    "type": "night_to_day",
                    "message": f"{name}: {work_date} 야간 후 {next_date} 주간 배정",
                    "affected_date": next_date,
                    "affected_user_id": user_id,
                    "affected_user_name": name,
                })

    return warnings


def _check_min_staff(rows, settings) -> List[Dict]:
    """VAL-03: 날짜별 최소 인원 미달"""
    warnings = []
    date_counts: Counter = Counter()
    for s, st in rows:
        if st.is_work_day:
            date_counts[s.work_date] += 1

    for work_date, count in sorted(date_counts.items()):
        if count < settings.min_daily_staff:
            warnings.append({
                "type": "min_staff",
                "message": (
                    f"{work_date}: 근무 인원 {count}명 "
                    f"(최소 {settings.min_daily_staff}명 필요)"
                ),
                "affected_date": work_date,
                "affected_user_id": None,
                "affected_user_name": None,
            })

    return warnings


def _check_avg_years(rows, users, settings) -> List[Dict]:
    """VAL-04: 팀 평균 연차 미달 (같은 날 + 같은 shift_type, OFF/VAC 제외)"""
    warnings = []
    team_map: Dict = defaultdict(list)
    shift_codes: Dict[int, str] = {}

    for s, st in rows:
        if st.is_work_day:
            team_map[(s.work_date, s.shift_type_id)].append(s.user_id)
            shift_codes[s.shift_type_id] = st.code

    for (work_date, shift_type_id), uid_list in sorted(team_map.items()):
        years_list = [
            users[uid].years_of_experience
            for uid in uid_list
            if uid in users
        ]
        if not years_list:
            continue
        avg = sum(years_list) / len(years_list)
        if avg < settings.min_avg_years:
            code = shift_codes.get(shift_type_id, "?")
            warnings.append({
                "type": "avg_years",
                "message": (
                    f"{work_date} {code} 팀: 평균 연차 {avg:.1f}년 "
                    f"(최소 {settings.min_avg_years}년 필요)"
                ),
                "affected_date": work_date,
                "affected_user_id": None,
                "affected_user_name": None,
            })

    return warnings


def _check_workload_bias(rows, users) -> List[Dict]:
    """VAL-05: 특정 직원 근무 편중 (임계값: WORKLOAD_BIAS_THRESHOLD)"""
    warnings = []
    work_counts: Counter = Counter()
    for s, st in rows:
        if st.is_work_day:
            work_counts[s.user_id] += 1

    if len(work_counts) < 2:
        return warnings

    avg = sum(work_counts.values()) / len(work_counts)
    for user_id, count in work_counts.items():
        diff = count - avg
        if diff > WORKLOAD_BIAS_THRESHOLD:
            name = users[user_id].name if user_id in users else str(user_id)
            warnings.append({
                "type": "workload_bias",
                "message": (
                    f"{name}: 이번 달 근무 {count}일 "
                    f"(팀 평균 {avg:.1f}일 대비 {diff:.0f}일 초과)"
                ),
                "affected_date": None,
                "affected_user_id": user_id,
                "affected_user_name": name,
            })

    return warnings
