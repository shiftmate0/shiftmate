/**
 * Mock 데이터 — 근무 유형 색상
 * ⚠ 멤버 1의 GET /api/admin/shift-types API 완성 전 임시 사용
 * 완성 후 → src/api/schedules.js의 fetchShiftTypes()로 교체
 */
export const MOCK_SHIFT_TYPES = [
  { id: 1, code: "D",   label: "Day",      color: "#3B82F6", is_work_day: true  },
  { id: 2, code: "E",   label: "Evening",  color: "#F59E0B", is_work_day: true  },
  { id: 3, code: "N",   label: "Night",    color: "#8B5CF6", is_work_day: true  },
  { id: 4, code: "OFF", label: "Off",      color: "#9CA3AF", is_work_day: false },
  { id: 5, code: "VAC", label: "Vacation", color: "#10B981", is_work_day: false },
];

// shift_code → color 빠른 조회용 Map
export const SHIFT_COLOR_MAP = Object.fromEntries(
  MOCK_SHIFT_TYPES.map((s) => [s.code, s.color])
);
// 예: SHIFT_COLOR_MAP["D"] === "#3B82F6"
