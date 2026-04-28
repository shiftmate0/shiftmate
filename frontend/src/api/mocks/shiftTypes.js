// Mock: 근무 유형 목록
export const mockShiftTypes = [
  { shift_type_id: 1, code: 'D', label: 'Day', color: '#3B82F6', is_work_day: true, is_system: false },
  { shift_type_id: 2, code: 'E', label: 'Evening', color: '#F59E0B', is_work_day: true, is_system: false },
  { shift_type_id: 3, code: 'N', label: 'Night', color: '#6366F1', is_work_day: true, is_system: false },
  { shift_type_id: 4, code: 'OFF', label: 'Off', color: '#9CA3AF', is_work_day: false, is_system: true },
  { shift_type_id: 5, code: 'VAC', label: 'Vacation', color: '#10B981', is_work_day: false, is_system: true },
]

export async function getShiftTypes() {
  return mockShiftTypes
}
