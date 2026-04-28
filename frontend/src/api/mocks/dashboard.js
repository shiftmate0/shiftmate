// Mock: 관리자 대시보드
export const mockAdminDashboard = {
  total_employees: 10,
  today_working: 6,
  today_on_leave: 1,
  pending_requests: 3,
  this_week_schedule: [
    { date: '2025-05-19', working_count: 6 },
    { date: '2025-05-20', working_count: 5 },
    { date: '2025-05-21', working_count: 7 },
    { date: '2025-05-22', working_count: 6 },
    { date: '2025-05-23', working_count: 4 },
    { date: '2025-05-24', working_count: 3 },
    { date: '2025-05-25', working_count: 5 },
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
