// Mock: 직원 목록
export const mockEmployees = [
  { user_id: 1, name: '김철수', employee_no: 'EMP001', role: 'employee', years_of_experience: 3, is_active: true },
  { user_id: 2, name: '이영희', employee_no: 'EMP002', role: 'employee', years_of_experience: 1, is_active: true },
  { user_id: 3, name: '박민준', employee_no: 'EMP003', role: 'employee', years_of_experience: 5, is_active: true },
]

export async function getEmployees() {
  return mockEmployees
}
