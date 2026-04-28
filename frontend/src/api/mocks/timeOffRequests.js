// Mock: 내 휴무·휴가 요청 목록
export const mockTimeOffRequests = [
  {
    request_id: 1,
    type: 'OFF',
    start_date: '2025-05-10',
    end_date: '2025-05-10',
    reason: '개인 사유',
    status: 'pending',
    created_at: '2025-05-01T09:00:00Z',
  },
  {
    request_id: 2,
    type: 'VAC',
    start_date: '2025-04-22',
    end_date: '2025-04-22',
    reason: '',
    status: 'approved',
    created_at: '2025-04-15T09:00:00Z',
  },
]

export async function getMyTimeOffRequests() {
  return mockTimeOffRequests
}
