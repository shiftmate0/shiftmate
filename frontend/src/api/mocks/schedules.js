// frontend/src/api/mocks/schedules.js
export const MOCK_DASHBOARD = null  // 사용자3 DashboardPage 호환용 — dashboard.js의 mockEmployeeDashboard 사용 권장

export const mockSchedulesMeta = {
  period_status: 'draft',
  schedules: [
    { schedule_id: 1, user_id: 2, work_date: '2026-05-01', shift_type_id: 1, shift_code: 'D',   shift_color: '#3B82F6', shift_label: '주간', is_locked: false },
    { schedule_id: 2, user_id: 2, work_date: '2026-05-02', shift_type_id: 2, shift_code: 'E',   shift_color: '#8B5CF6', shift_label: '오후', is_locked: false },
    { schedule_id: 3, user_id: 3, work_date: '2026-05-01', shift_type_id: 3, shift_code: 'N',   shift_color: '#1D4ED8', shift_label: '야간', is_locked: false },
  ],
}
