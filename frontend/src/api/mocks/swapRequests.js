// Mock: 교대 요청 목록
export const mockSwapRequests = [
  {
    swap_request_id: 1,
    requester_id: 1,
    requester_schedule_id: 1,
    status: 'pending',
    required_years_min: 1,
    required_years_max: 5,
    expires_at: '2025-05-02T09:00:00Z',
    created_at: '2025-05-01T09:00:00Z',
  },
]

export async function getSwapRequests() {
  return mockSwapRequests
}
