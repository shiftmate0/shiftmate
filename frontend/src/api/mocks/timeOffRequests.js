// frontend/src/api/mocks/timeOffRequests.js
export const mockTimeOffRequests = [
  {
    request_id: 1, requester_id: 2, requester_name: '이서윤',
    type: 'OFF', start_date: '2026-05-10', end_date: '2026-05-10',
    reason: '개인 사정', status: 'pending',
    admin_comment: null, created_at: '2026-05-01T10:00:00Z', processed_at: null,
  },
  {
    request_id: 2, requester_id: 3, requester_name: '박지호',
    type: 'VAC', start_date: '2026-05-20', end_date: '2026-05-22',
    reason: '여행', status: 'approved',
    admin_comment: '승인합니다', created_at: '2026-04-28T09:00:00Z',
    processed_at: '2026-04-29T10:00:00Z',
  },
]

export function getMyTimeOffRequests() {
  return Promise.resolve(mockTimeOffRequests)
}
