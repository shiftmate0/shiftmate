// Mock: 근무표 조회 (연도·월 기준)
export const mockSchedules = [
  { schedule_id: 1, user_id: 1, work_date: '2025-05-01', shift_type_id: 1, shift_code: 'D', is_locked: false },
  { schedule_id: 2, user_id: 1, work_date: '2025-05-02', shift_type_id: 3, shift_code: 'N', is_locked: false },
  { schedule_id: 3, user_id: 2, work_date: '2025-05-01', shift_type_id: 2, shift_code: 'E', is_locked: false },
]

export async function getSchedules({ year, month }) {
  return mockSchedules
}
