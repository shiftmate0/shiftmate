/**
 * Mock 데이터 — 근무표
 * Day 1 오후에 팀 레포에 커밋 후 슬랙 공유
 * API 완성 후 src/api/client.js 호출로 교체
 */

export const MOCK_SCHEDULES = {
  data: [
    {
      schedule_id: 101,
      user_id: 1,
      user_name: "홍길동",
      work_date: "2025-07-01",
      shift_type: { id: 1, code: "D", label: "Day",     color: "#3B82F6", is_work_day: true },
      is_locked: false,
      version: 0,
    },
    {
      schedule_id: 102,
      user_id: 2,
      user_name: "이영희",
      work_date: "2025-07-01",
      shift_type: { id: 2, code: "E", label: "Evening", color: "#F59E0B", is_work_day: true },
      is_locked: false,
      version: 0,
    },
    {
      schedule_id: 103,
      user_id: 3,
      user_name: "박민준",
      work_date: "2025-07-01",
      shift_type: { id: 3, code: "N", label: "Night",   color: "#8B5CF6", is_work_day: true },
      is_locked: false,
      version: 0,
    },
    {
      schedule_id: 104,
      user_id: 1,
      user_name: "홍길동",
      work_date: "2025-07-02",
      shift_type: { id: 4, code: "OFF", label: "Off",   color: "#9CA3AF", is_work_day: false },
      is_locked: false,
      version: 0,
    },
    {
      schedule_id: 105,
      user_id: 2,
      user_name: "이영희",
      work_date: "2025-07-02",
      shift_type: { id: 1, code: "D", label: "Day",     color: "#3B82F6", is_work_day: true },
      is_locked: true,   // 교대 협의 중 예시
      version: 1,
    },
  ],
};

// 현재 월 확정 상태 Mock
export const MOCK_PERIOD_STATUS = {
  year: 2025,
  month: 7,
  is_confirmed: false,
  confirmed_at: null,
};

// 직원 대시보드 Mock
export const MOCK_DASHBOARD = {
  today_shift_code: "D",
  today_shift_label: "Day",
  today_shift_color: "#3B82F6",
  this_week: [
    { date: "2025-07-07", shift_code: "D",   shift_label: "Day",     shift_color: "#3B82F6" },
    { date: "2025-07-08", shift_code: "D",   shift_label: "Day",     shift_color: "#3B82F6" },
    { date: "2025-07-09", shift_code: "E",   shift_label: "Evening", shift_color: "#F59E0B" },
    { date: "2025-07-10", shift_code: "N",   shift_label: "Night",   shift_color: "#8B5CF6" },
    { date: "2025-07-11", shift_code: "OFF", shift_label: "Off",     shift_color: "#9CA3AF" },
    { date: "2025-07-12", shift_code: null,  shift_label: null,      shift_color: null },
    { date: "2025-07-13", shift_code: null,  shift_label: null,      shift_color: null },
  ],
};

// 검증 경고 Mock
export const MOCK_VALIDATE = {
  year: 2025,
  month: 7,
  has_warnings: true,
  warnings: [
    {
      type: "consecutive_night",
      message: "홍길동: 2025-07-10 기준 야간 근무 3일 연속",
      affected_date: "2025-07-10",
      affected_user_id: 1,
      affected_user_name: "홍길동",
    },
    {
      type: "understaffed",
      message: "2025-07-15: 근무 인원 2명 (최소 3명 필요)",
      affected_date: "2025-07-15",
      affected_user_id: null,
      affected_user_name: null,
    },
  ],
};
