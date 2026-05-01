// Mock: 관리자 대시보드 (API 응답 형식 — snake_case, { date, day, count })
export const mockAdminDashboard = {
  total_employees: 7,
  today_working: 5,
  today_on_leave: 1,
  pending_requests: 4,
  this_week_schedule: [
    { date: '2026-04-27', day: '월', count: 5 },
    { date: '2026-04-28', day: '화', count: 4 },
    { date: '2026-04-29', day: '수', count: 6 },
    { date: '2026-04-30', day: '목', count: 5 },
    { date: '2026-05-01', day: '금', count: 4 },
    { date: '2026-05-02', day: '토', count: 2 },
    { date: '2026-05-03', day: '일', count: 1 },
  ],
}

// Mock: 직원 대시보드
export const mockEmployeeDashboard = {
  today_schedule: { shift_code: 'D', label: 'Day', color: '#3B82F6' },
  this_week_schedule: [
    { date: '2025-05-19', shift_code: 'D', label: 'Day', color: '#3B82F6' },
    { date: '2025-05-20', shift_code: 'N', label: 'Night', color: '#6366F1' },
    { date: '2025-05-21', shift_code: 'OFF', label: 'Off', color: '#9CA3AF' },
    { date: '2025-05-22', shift_code: 'D', label: 'Day', color: '#3B82F6' },
    { date: '2025-05-23', shift_code: 'E', label: 'Evening', color: '#F59E0B' },
    { date: '2025-05-24', shift_code: 'OFF', label: 'Off', color: '#9CA3AF' },
    { date: '2025-05-25', shift_code: 'OFF', label: 'Off', color: '#9CA3AF' },
  ],
}

export async function getAdminDashboard() {
  return mockAdminDashboard
}

export async function getEmployeeDashboard() {
  return mockEmployeeDashboard
}
