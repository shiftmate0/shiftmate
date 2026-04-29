import { useState } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'
import { timeOffRequests as mockTimeOffRequests, swapRequests as mockSwapRequests } from '../../api/mocks/mockData'

// ── 실제 API로 교체할 때 ────────────────────────────────────
// import apiClient from '../../api/client'
// GET  /admin/requests          → 휴무·휴가 전체 목록
// PATCH /admin/requests/:id/approve → 승인
// PATCH /admin/requests/:id/reject  → 반려
// GET  /api/swap-requests       → 교대 요청 목록 (팀장 API)
// PATCH /admin/swap-requests/:id/approve → 교대 최종 승인 (팀장 API)
// PATCH /admin/swap-requests/:id/reject  → 교대 반려 (팀장 API)
// ──────────────────────────────────────────────────────────

// ── 상태 배지 스타일 ──────────────────────────────────────
const statusConfig = {
  pending:  { label: '대기',   bg: '#FEF3C7', text: '#D97706' },
  approved: { label: '승인',   bg: '#ECFDF5', text: '#059669' },
  rejected: { label: '반려',   bg: '#FEF2F2', text: '#DC2626' },
  accepted: { label: '합의됨', bg: '#EFF6FF', text: '#3B82F6' },
  expired:  { label: '만료',   bg: '#F8FAFC', text: '#94A3B8' },
}

// ── 유형 배지 스타일 ──────────────────────────────────────
const typeConfig = {
  OFF: { label: '휴무', bg: '#EFF6FF', text: '#3B82F6' },
  VAC: { label: '휴가', bg: '#ECFDF5', text: '#059669' },
}

// ── 상태 배지 컴포넌트 ────────────────────────────────────
const StatusBadge = ({ status }) => {
  const sc = statusConfig[status] ?? statusConfig.pending
  return (
    <span
      className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: sc.bg, color: sc.text }}
    >
      {sc.label}
    </span>
  )
}

export default function AdminRequestsPage() {
  const [activeTab, setActiveTab] = useState('timeoff') // 'timeoff' | 'swap'
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  // Mock 데이터를 state로 관리 (승인/반려 시 즉시 반영)
  const [timeOffList, setTimeOffList] = useState(mockTimeOffRequests)
  const [swapList, setSwapList] = useState(mockSwapRequests)

  // ── 휴무·휴가 승인 ────────────────────────────────────
  const handleApproveTimeOff = (id) => {
    // ── 실제 API 연결 시 교체 ──────────────────────────
    // await apiClient.patch(`/admin/requests/${id}/approve`, { admin_comment: '승인합니다.' })
    // ──────────────────────────────────────────────────
    setTimeOffList((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'approved', adminComment: '승인합니다.' } : r
      )
    )
  }

  // ── 휴무·휴가 반려 ────────────────────────────────────
  const handleRejectTimeOff = (id) => {
    // ── 실제 API 연결 시 교체 ──────────────────────────
    // await apiClient.patch(`/admin/requests/${id}/reject`, { admin_comment: '반려합니다.' })
    // ──────────────────────────────────────────────────
    setTimeOffList((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'rejected', adminComment: '반려합니다.' } : r
      )
    )
  }

  // ── 교대 승인 (팀장 API 연결 전 준비 중) ───────────────
  const handleApproveSwap = (id) => {
    // ⚠️ 팀장 API 완성 후 교체 예정
    // await apiClient.patch(`/admin/swap-requests/${id}/approve`, { change_reason: '승인' })
    alert('팀장 API 연결 후 동작합니다.')
  }

  // ── 교대 반려 (팀장 API 연결 전 준비 중) ───────────────
  const handleRejectSwap = (id) => {
    // ⚠️ 팀장 API 완성 후 교체 예정
    alert('팀장 API 연결 후 동작합니다.')
  }

  // ── 필터링 ────────────────────────────────────────────
  const filteredTimeOff = timeOffList.filter((r) => {
    const matchSearch = r.requesterName.includes(search)
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const filteredSwap = swapList.filter((r) => {
    const matchSearch = r.requesterName.includes(search)
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  // ── 탭별 대기 건수 ────────────────────────────────────
  const timeOffPending = timeOffList.filter((r) => r.status === 'pending').length
  const swapPending = swapList.filter((r) =>
    r.status === 'pending' || r.status === 'accepted'
  ).length

  const statusOptions = [
    { value: 'all', label: '전체 상태' },
    { value: 'pending', label: '대기' },
    { value: 'approved', label: '승인' },
    { value: 'rejected', label: '반려' },
  ]

  return (
    <div className="space-y-6">

      {/* ── 페이지 타이틀 ───────────────────────────────────── */}
      <div>
        <h1 className="font-bold text-slate-800" style={{ fontSize: 24 }}>
          요청 관리
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          휴무·휴가·교대 요청을 검토하고 승인 또는 반려합니다.
        </p>
      </div>

      {/* ── 탭 ──────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('timeoff')}
          className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: activeTab === 'timeoff' ? '#3B82F6' : 'transparent',
            color: activeTab === 'timeoff' ? '#3B82F6' : '#94A3B8',
          }}
        >
          휴무·휴가 요청
          {timeOffPending > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
              {timeOffPending}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('swap')}
          className="flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors"
          style={{
            borderColor: activeTab === 'swap' ? '#3B82F6' : 'transparent',
            color: activeTab === 'swap' ? '#3B82F6' : '#94A3B8',
          }}
        >
          교대 요청
          {swapPending > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
              {swapPending}
            </span>
          )}
        </button>
      </div>

      {/* ── 검색 + 필터 ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* 검색 */}
        <div className="relative flex-1 max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="이름으로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* 상태 필터 드롭다운 */}
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 bg-white hover:bg-slate-50"
          >
            {statusOptions.find((o) => o.value === statusFilter)?.label}
            <ChevronDown size={14} />
          </button>
          {showStatusDropdown && (
            <div className="absolute right-0 top-11 w-36 bg-white rounded-xl border border-slate-200 shadow-lg z-10 overflow-hidden">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value)
                    setShowStatusDropdown(false)
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  style={{
                    fontWeight: statusFilter === opt.value ? 600 : 400,
                    color: statusFilter === opt.value ? '#3B82F6' : undefined,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          휴무·휴가 요청 탭
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'timeoff' && (
        <div
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['신청자', '유형', '기간', '사유', '상태', '신청일', '작업'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-4 text-xs font-semibold text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTimeOff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-slate-400">
                    요청 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredTimeOff.map((req) => {
                  const tc = typeConfig[req.type] ?? typeConfig.OFF
                  const dateStr =
                    req.startDate === req.endDate
                      ? req.startDate
                      : `${req.startDate} ~ ${req.endDate}`

                  return (
                    <tr
                      key={req.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      {/* 신청자 */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: '#3B82F6' }}
                          >
                            {req.requesterName.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {req.requesterName}
                          </span>
                        </div>
                      </td>

                      {/* 유형 */}
                      <td className="px-5 py-4">
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ background: tc.bg, color: tc.text }}
                        >
                          {tc.label}
                        </span>
                      </td>

                      {/* 기간 */}
                      <td className="px-5 py-4 text-sm text-slate-600">{dateStr}</td>

                      {/* 사유 */}
                      <td className="px-5 py-4 text-sm text-slate-500 max-w-xs">
                        <div className="truncate">{req.reason || '-'}</div>
                      </td>

                      {/* 상태 + 관리자 코멘트 */}
                      <td className="px-5 py-4">
                        <StatusBadge status={req.status} />
                        {req.adminComment && (
                          <p className="text-xs text-slate-400 mt-1 max-w-xs truncate">
                            {req.adminComment}
                          </p>
                        )}
                      </td>

                      {/* 신청일 */}
                      <td className="px-5 py-4 text-sm text-slate-400">
                        {req.createdAt?.slice(0, 10)}
                      </td>

                      {/* 작업 버튼 — pending 상태일 때만 표시 */}
                      <td className="px-5 py-4">
                        {req.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleApproveTimeOff(req.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90"
                              style={{ background: '#059669' }}
                            >
                              <Check size={12} />
                              승인
                            </button>
                            <button
                              onClick={() => handleRejectTimeOff(req.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                              style={{
                                background: '#F8FAFC',
                                color: '#64748B',
                                border: '1px solid #E2E8F0',
                              }}
                            >
                              <X size={12} />
                              반려
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          교대 요청 탭
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'swap' && (
        <div
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
        >
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['요청자', '교대 시프트', '연차 조건', '상태', '제안 수', '신청일', '작업'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-4 text-xs font-semibold text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSwap.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-slate-400">
                    교대 요청이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredSwap.map((req) => (
                  <tr
                    key={req.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    {/* 요청자 */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ background: '#8B5CF6' }}
                        >
                          {req.requesterName.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {req.requesterName}
                        </span>
                      </div>
                    </td>

                    {/* 교대 시프트 */}
                    <td className="px-5 py-4">
                      <div className="text-sm text-slate-600">{req.requesterDate}</div>
                      <span
                        className="inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded"
                        style={{ background: '#EFF6FF', color: '#3B82F6' }}
                      >
                        {req.requesterShift}
                      </span>
                    </td>

                    {/* 연차 조건 */}
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {req.requiredYearsMin}년 ~ {req.requiredYearsMax}년차
                    </td>

                    {/* 상태 */}
                    <td className="px-5 py-4">
                      <StatusBadge status={req.status} />
                    </td>

                    {/* 제안 수 */}
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {req.proposals?.length ?? 0}건
                    </td>

                    {/* 신청일 */}
                    <td className="px-5 py-4 text-sm text-slate-400">
                      {req.createdAt?.slice(0, 10)}
                    </td>

                    {/* 작업 버튼 — accepted 상태(합의 완료)일 때만 최종 승인 가능 */}
                    <td className="px-5 py-4">
                      {req.status === 'accepted' ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveSwap(req.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                            style={{ background: '#059669' }}
                          >
                            <Check size={12} />
                            최종 승인
                          </button>
                          <button
                            onClick={() => handleRejectSwap(req.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{
                              background: '#F8FAFC',
                              color: '#64748B',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            <X size={12} />
                            반려
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
