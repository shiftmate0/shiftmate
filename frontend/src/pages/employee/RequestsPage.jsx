import { useState, useEffect } from 'react'
import { FileText, Calendar, Palmtree, CheckCircle, Clock, XCircle, X } from 'lucide-react'
import { getMyTimeOffRequests } from '../../api/mocks/timeOffRequests'
import { timeOffRequests as allTimeOffRequests } from '../../api/mocks/mockData'

// ── 실제 API로 교체할 때 ────────────────────────────────────
// import apiClient from '../../api/client'
// const res = await apiClient.get('/requests/me')
// POST: await apiClient.post('/requests', { type, start_date, end_date, reason })
// PATCH: await apiClient.patch(`/requests/${id}/cancel`)
// ──────────────────────────────────────────────────────────

// ── 상태별 스타일 정의 ─────────────────────────────────────
const statusConfig = {
  approved: {
    label: '승인됨',
    bg: '#ECFDF5',
    text: '#059669',
    border: '#A7F3D0',
    icon: CheckCircle,
  },
  pending: {
    label: '검토 중',
    bg: '#FFFBEB',
    text: '#D97706',
    border: '#FDE68A',
    icon: Clock,
  },
  rejected: {
    label: '반려됨',
    bg: '#FEF2F2',
    text: '#DC2626',
    border: '#FECACA',
    icon: XCircle,
  },
  canceled: {
    label: '취소됨',
    bg: '#F8FAFC',
    text: '#94A3B8',
    border: '#E2E8F0',
    icon: XCircle,
  },
}

// ── 유형별 스타일 정의 ─────────────────────────────────────
const typeConfig = {
  OFF: { label: '휴무', bg: '#EFF6FF', text: '#3B82F6' },
  VAC: { label: '휴가', bg: '#ECFDF5', text: '#059669' },
}

export default function RequestsPage() {
  const [requests, setRequests] = useState([])       // 내 신청 내역
  const [loading, setLoading] = useState(true)       // 로딩 상태
  const [type, setType] = useState('OFF')            // 신청 유형: OFF / VAC
  const [startDate, setStartDate] = useState('')     // 시작일
  const [endDate, setEndDate] = useState('')         // 종료일
  const [reason, setReason] = useState('')           // 신청 사유
  const [submitting, setSubmitting] = useState(false) // 제출 중 여부
  const [error, setError] = useState('')             // 에러 메시지

  // ── 내 신청 내역 불러오기 ───────────────────────────────
  useEffect(() => {
    async function fetchRequests() {
      try {
        // mockData.js의 timeOffRequests에서 이서윤(id:2) 데이터 사용
        // (mock에 이름/adminComment 등 더 많은 데이터가 있어서)
        const myRequests = allTimeOffRequests
          .filter((r) => r.requesterId === 2)  // 현재 로그인 유저 기준
          .map((r) => ({
            request_id: r.id,
            type: r.type,
            start_date: r.startDate,
            end_date: r.endDate,
            reason: r.reason,
            status: r.status,
            admin_comment: r.adminComment ?? null,
            created_at: r.createdAt,
          }))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

        setRequests(myRequests)
      } finally {
        setLoading(false)
      }
    }
    fetchRequests()
  }, [])

  // ── 신청하기 ────────────────────────────────────────────
  const handleSubmit = async () => {
    // 필수 입력 확인
    if (!startDate) {
      setError('시작일을 입력해주세요.')
      return
    }
    // 종료일이 시작일보다 앞인지 확인
    if (endDate && endDate < startDate) {
      setError('종료일은 시작일보다 이전일 수 없습니다.')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      // ── 실제 API 연결 시 아래로 교체 ──────────────────
      // await apiClient.post('/requests', {
      //   type,
      //   start_date: startDate,
      //   end_date: endDate || startDate,
      //   reason,
      // })
      // ───────────────────────────────────────────────

      // Mock: 새 신청 항목 추가
      const newRequest = {
        request_id: Date.now(),
        type,
        start_date: startDate,
        end_date: endDate || startDate,  // 종료일 없으면 시작일과 동일
        reason,
        status: 'pending',
        admin_comment: null,
        created_at: new Date().toISOString(),
      }
      setRequests((prev) => [newRequest, ...prev])

      // 폼 초기화
      setType('OFF')
      setStartDate('')
      setEndDate('')
      setReason('')
    } finally {
      setSubmitting(false)
    }
  }

  // ── 취소하기 ────────────────────────────────────────────
  const handleCancel = async (requestId) => {
    // ── 실제 API 연결 시 아래로 교체 ──────────────────
    // await apiClient.patch(`/requests/${requestId}/cancel`)
    // ───────────────────────────────────────────────

    // Mock: 상태를 canceled로 변경
    setRequests((prev) =>
      prev.map((r) =>
        r.request_id === requestId ? { ...r, status: 'canceled' } : r
      )
    )
  }

  return (
    <div className="space-y-6">

      {/* ── 페이지 타이틀 ───────────────────────────────────── */}
      <div>
        <h1 className="font-bold text-slate-800" style={{ fontSize: 24 }}>
          휴무·휴가 신청
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          희망 휴무일 또는 휴가 기간을 신청합니다.
        </p>
      </div>

      {/* ── 메인 레이아웃: 신청 폼(좌) + 내역(우) ───────────── */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1.2fr' }}>

        {/* ── 신청서 작성 폼 ─────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl p-6 border border-slate-200"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
        >
          {/* 폼 헤더 */}
          <div className="flex items-center gap-2 mb-6">
            <FileText size={18} className="text-slate-500" />
            <h2 className="font-semibold text-slate-800" style={{ fontSize: 16 }}>
              신청서 작성
            </h2>
          </div>

          {/* 신청 유형 토글 */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              신청 유형
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setType('OFF')}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium"
                style={{
                  borderColor: type === 'OFF' ? '#3B82F6' : '#E2E8F0',
                  background: type === 'OFF' ? '#EFF6FF' : 'white',
                  color: type === 'OFF' ? '#3B82F6' : '#64748B',
                }}
              >
                <Calendar size={16} />
                휴무 (OFF)
              </button>
              <button
                onClick={() => setType('VAC')}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium"
                style={{
                  borderColor: type === 'VAC' ? '#059669' : '#E2E8F0',
                  background: type === 'VAC' ? '#ECFDF5' : 'white',
                  color: type === 'VAC' ? '#059669' : '#64748B',
                }}
              >
                🌴 휴가 (VAC)
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              {type === 'OFF'
                ? '단일일 또는 복수일 휴무를 신청합니다.'
                : '연속 휴가 기간을 신청합니다. 승인 시 자동 배정됩니다.'}
            </p>
          </div>

          {/* 시작일 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <span className="flex items-center gap-1">
                <Calendar size={14} className="text-slate-400" />
                시작일 <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 종료일 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              <span className="flex items-center gap-1">
                <Calendar size={14} className="text-slate-400" />
                종료일 (생략 시 시작일과 동일)
              </span>
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 신청 사유 */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              신청 사유 (선택)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 개인 사정, 가족 행사, 병원 방문 등"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          )}

          {/* 신청하기 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-opacity"
            style={{
              background: '#3B82F6',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? '신청 중...' : '신청하기'}
          </button>

          {/* 신청 안내 */}
          <div
            className="mt-5 p-4 rounded-xl text-xs space-y-1.5"
            style={{ background: '#EFF6FF', color: '#3B82F6' }}
          >
            <p className="font-medium text-slate-700 mb-2">신청 안내</p>
            {[
              '근무표 작성 전 신청을 권장합니다',
              '근무표 확정 후에도 신청 가능하나, 관리자가 수동 처리합니다',
              'VAC 승인 시 해당 날짜에 휴가(VAC)가 자동 배정됩니다',
              '승인 대기 중인 요청은 취소 가능합니다',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0">•</span>
                <span style={{ color: '#1D4ED8' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 신청 내역 ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800" style={{ fontSize: 16 }}>
              신청 내역
            </h2>
            <span className="text-xs text-slate-400">{requests.length}건</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">불러오는 중...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">신청 내역이 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const sc = statusConfig[req.status] ?? statusConfig.pending
                const tc = typeConfig[req.type] ?? typeConfig.OFF
                const StatusIcon = sc.icon
                const dateStr =
                  req.start_date === req.end_date
                    ? req.start_date
                    : `${req.start_date} ~ ${req.end_date}`

                return (
                  <div
                    key={req.request_id}
                    className="bg-white rounded-2xl p-5 border"
                    style={{
                      borderColor: sc.border,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    }}
                  >
                    {/* 상단: 유형 + 상태 + 취소 버튼 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {/* 유형 배지 */}
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ background: tc.bg, color: tc.text }}
                        >
                          {tc.label} ({req.type})
                        </span>
                        {/* 상태 배지 */}
                        <span
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          <StatusIcon size={11} />
                          {sc.label}
                        </span>
                      </div>
                      {/* 취소 버튼 — pending 상태일 때만 표시 */}
                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(req.request_id)}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <X size={13} />
                          취소
                        </button>
                      )}
                    </div>

                    {/* 날짜 */}
                    <p className="text-sm font-medium text-slate-700 mb-1">{dateStr}</p>

                    {/* 사유 */}
                    {req.reason && (
                      <p className="text-xs text-slate-500 mb-1">{req.reason}</p>
                    )}

                    {/* 관리자 코멘트 */}
                    {req.admin_comment && (
                      <div
                        className="mt-2 px-3 py-2 rounded-lg text-xs"
                        style={{ background: sc.bg, color: sc.text }}
                      >
                        관리자: {req.admin_comment}
                      </div>
                    )}

                    {/* 신청일 */}
                    <p className="text-xs text-slate-400 mt-2">{req.created_at?.slice(0, 10)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
