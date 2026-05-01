// frontend/src/api/mocks/shiftTypes.js
export const mockShiftTypes = [
  { shift_type_id: 1, code: 'D',   label: '주간', start_time: '08:00', end_time: '16:00', color: '#3B82F6', is_work_day: true,  is_system: false },
  { shift_type_id: 2, code: 'E',   label: '오후', start_time: '16:00', end_time: '00:00', color: '#8B5CF6', is_work_day: true,  is_system: false },
  { shift_type_id: 3, code: 'N',   label: '야간', start_time: '00:00', end_time: '08:00', color: '#1D4ED8', is_work_day: true,  is_system: false },
  { shift_type_id: 4, code: 'OFF', label: '휴무', start_time: null,    end_time: null,    color: '#94A3B8', is_work_day: false, is_system: true  },
  { shift_type_id: 5, code: 'VAC', label: '휴가', start_time: null,    end_time: null,    color: '#10B981', is_work_day: false, is_system: true  },
]
