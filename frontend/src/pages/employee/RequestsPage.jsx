import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { FileText, Calendar, CheckCircle, Clock, XCircle, X, AlertCircle } from 'lucide-react'
import { mockTimeOffRequests } from '../../api/mocks/timeOffRequests'

// ── 실제 API로 교체할 때 ────────────────────────────────────
// import apiClient from '../../api/client'
// POST:  await apiClient.post('/requests', { type, start_date, end_date, reason })
// GET:   await apiClient.get('/requests/me', { params: { status } })
// PATCH: await apiClient.patch(`/requests/${id}/cancel`)
// ──────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

const STATUS_CONFIG = {
  pending:  { label: '대기 중', bg: '#FEF3C7', text: '#D97706', icon: Clock },
  approved: { label: '승인됨',  bg: '#ECFDF5', text: '#059669', icon: CheckCircle },
  rejected: { label: '반려됨',  bg: '#FEF2F2', text: '#DC2626', icon: XCircle },
  canceled: { label: '취소됨',  bg: '#F8FAFC', text: '#94A3B8', icon: XCircle },
}

const TYPE_CONFIG = {
  OFF: { label: '휴무', bg: '#EFF6FF', text: '#3B82F6' },
  VAC: { label: '휴가', bg: '#ECFDF5', text: '#059669' },
}

const TABS = [
  { key: '',         label: '전체' },
  { key: 'pending',  label: '대기 중' },
  { key: 'approved', label: '승인됨' },
  { key: 'rejected', label: '반려됨' },
]

// M/D 형식으로 변환 (예: "2026-05-10" → "5/10")
function formatMD(dateStr) {
  const [, m, d] = dateStr.split('-')
  return `${parseInt(m)}/${parseInt(d)}`
}

function formatDateRange(start, end) {
  if (start === end) return formatMD(start)
  return `${formatMD(start)}~${formatMD(end)}`
}

export default function RequestsPage() {
  const [allRequests, setAllRequests] = useState([])
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState('')

  // 신청 폼
  const [type, setType]           = useState('OFF')
  const [startDate, setStartDate] = useState(TODAY)
  const [endDate, setEndDate]     = useState(TODAY)
  const [reason, setReason]       = useState('')
  const [dateError, setDateError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Toast
  const [toast, setToast] = useState(null) // { msg, ok }

  // 취소 모달
  const [cancelTarget, setCancelTarget] = useState(null) // request 객체

  // ── 목록 불러오기 ────────────────────────────────────────
  const fetchRequests = async (status = '') => {
    setLoading(true)
    try {
      // ── 실제 API 교체 시 ──────────────────────────────
      // const { data } = await apiClient.get('/requests/me', {
      //   params: status ? { status } : {}
      // })
      // setAllRequests(data)
      // ─────────────────────────────────────────────────

      // Mock: status 파라미터로 인-메모리 필터
      const filtered = status
        ? mockTimeOffRequests.filter((r) => r.status === status)
        : [...mockTimeOffRequests]

      setAllRequests(filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests(activeTab)
  }, [activeTab])

  // ── Toast 헬퍼 ──────────────────────────────────────────
  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // ── 신청하기 ────────────────────────────────────────────
  const handleSubmit = async () => {
    setDateError('')
    if (endDate < startDate) {
      setDateError('종료일은 시작일 이후여야 합니다')
      return
    }

    setSubmitting(true)
    try {
      // ── 실제 API 교체 시 ──────────────────────────────
      // try {
      //   await apiClient.post('/requests', {
      //     type, start_date: startDate,
      //     end_date: endDate, reason,
      //   })
      //   showToast('신청이 접수되었습니다')
      //   setType('OFF'); setStartDate(TODAY); setEndDate(TODAY); setReason('')
      //   fetchRequests(activeTab)
      // } catch (err) {
      //   if (err.response?.status === 400) {
      //     showToast('해당 기간에 이미 신청이 있습니다', false)
      //   }
      // }
      // ─────────────────────────────────────────────────

      const newItem = {
        request_id:    Date.now(),
        type,
        start_date:    startDate,
        end_date:      endDate,
        reason,
        status:        'pending',
        admin_comment: null,
        created_at:    new Date().toISOString(),
        processed_at:  null,
      }

      // 전체 mock 리스트에 추가 (탭 전환 시에도 유지)
      mockTimeOffRequests.unshift(newItem)

      showToast('신청이 접수되었습니다')
      setType('OFF')
      setStartDate(TODAY)
      setEndDate(TODAY)
      setReason('')
      fetchRequests(activeTab)
    } finally {
      setSubmitting(false)
    }
  }

  // ── 취소 모달 열기 / 닫기 ──────────────────────────────
  const openCancelModal  = (req) => setCancelTarget(req)
  const closeCancelModal = ()    => setCancelTarget(null)

  // ── 취소 확정 ───────────────────────────────────────────
  const confirmCancel = async () => {
    if (!cancelTarget) return
    try {
      // ── 실제 API 교체 시 ──────────────────────────────
      // await apiClient.patch(`/requests/${cancelTarget.request_id}/cancel`)
      // ─────────────────────────────────────────────────

      const idx = mockTimeOffRequests.findIndex(
        (r) => r.request_id === cancelTarget.request_id
      )
      if (idx !== -1) mockTimeOffRequests[idx].status = 'canceled'

      closeCancelModal()
      showToast('신청이 취소되었습니다')
      fetchRequests(activeTab)
    } catch {
      showToast('취소에 실패했습니다', false)
    }
  }

  // ── 렌더링할 목록 ────────────────────────────────────────
  const displayed = allRequests

  return (
    <div className="space-y-6">

      {/* ── Toast ─────────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={{
            background: toast.ok ? '#ECFDF5' : '#FEF2F2',
            color:      toast.ok ? '#059669' : '#DC2626',
            border:     `1px solid ${toast.ok ? '#A7F3D0' : '#FECACA'}`,
          }}
        >
          {toast.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── 취소 확인 모달 ────────────────────────────────────── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div
            className="bg-white rounded-2xl p-6 w-80 shadow-xl"
          >
            <h3 className="font-semibold text-slate-800 mb-2">신청 취소</h3>
            <p className="text-sm text-slate-600 mb-5">
              이 신청을 취소하시겠습니까?<br />
              <span className="font-medium text-slate-800">
                {TYPE_CONFIG[cancelTarget.type]?.label ?? cancelTarget.type}{' '}
                {formatDateRange(cancelTarget.start_date, cancelTarget.end_date)}
              </span>
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={closeCancelModal}
                className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={confirmCancel}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity"
                style={{ background: '#EF4444' }}
              >
                취소하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 페이지 타이틀 ─────────────────────────────────────── */}
      <div>
        <h1 className="font-bold text-slate-800" style={{ fontSize: 24 }}>
          휴무·휴가 신청
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          희망 휴무일 또는 휴가 기간을 신청합니다.
        </p>
      </div>

      {/* ── 메인 레이아웃 ────────────────────────────────────── */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1.2fr' }}>

        {/* ── 신청 폼 ──────────────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl p-6 border border-slate-200"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-2 mb-6">
            <FileText size={18} className="text-slate-500" />
            <h2 className="font-semibold text-slate-800" style={{ fontSize: 16 }}>
              신청서 작성
            </h2>
          </div>

          {/* 신청 유형 */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-2">신청 유형</label>
            <div className="grid grid-cols-2 gap-2">
              {['OFF', 'VAC'].map((t) => {
                const active = type === t
                const color  = t === 'OFF' ? '#3B82F6' : '#059669'
                const bg     = t === 'OFF' ? '#EFF6FF' : '#ECFDF5'
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all text-sm font-medium"
                    style={{
                      borderColor: active ? color : '#E2E8F0',
                      background:  active ? bg    : 'white',
                      color:       active ? color : '#64748B',
                    }}
                  >
                    <Calendar size={16} />
                    {t === 'OFF' ? '휴무 (OFF)' : '휴가 (VAC)'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 시작일 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              시작일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setDateError('')
                if (endDate < e.target.value) setEndDate(e.target.value)
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* 종료일 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              종료일 <span className="text-slate-400 text-xs">(생략 시 시작일과 동일)</span>
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setDateError('')
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            {dateError && (
              <p className="text-xs text-red-500 mt-1">{dateError}</p>
            )}
          </div>

          {/* 사유 */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              신청 사유 (선택)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={200}
              placeholder="예: 개인 사정, 가족 행사, 병원 방문 등"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          {/* 신청하기 버튼 */}
          <button
            onClick={handleSubmit}
            disabled={!startDate || submitting}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-opacity"
            style={{
              background: '#3B82F6',
              opacity: (!startDate || submitting) ? 0.5 : 1,
              cursor: (!startDate || submitting) ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? '신청 중...' : '신청하기'}
          </button>

          {/* 안내 */}
          <div
            className="mt-5 p-4 rounded-xl text-xs space-y-1.5"
            style={{ background: '#EFF6FF' }}
          >
            <p className="font-medium text-slate-700 mb-2">신청 안내</p>
            {[
              '근무표 작성 전 신청을 권장합니다',
              'VAC 승인 시 해당 날짜에 휴가가 자동 배정됩니다',
              '승인 대기 중인 요청은 취소 가능합니다',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-1.5 text-blue-700">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── 내역 목록 ────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800" style={{ fontSize: 16 }}>신청 내역</h2>
          </div>

          {/* 탭 */}
          <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: activeTab === tab.key ? 'white' : 'transparent',
                  color:      activeTab === tab.key ? '#1E293B' : '#64748B',
                  boxShadow:  activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 목록 */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">불러오는 중...</div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              {activeTab
                ? `${TABS.find((t) => t.key === activeTab)?.label} 상태의 신청이 없습니다`
                : '신청 내역이 없습니다'}
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map((req) => {
                const sc = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending
                const tc = TYPE_CONFIG[req.type]    ?? TYPE_CONFIG.OFF
                const StatusIcon = sc.icon
                const dateStr    = formatDateRange(req.start_date, req.end_date)
                const elapsed    = formatDistanceToNow(new Date(req.created_at), {
                  addSuffix: true, locale: ko,
                })

                return (
                  <div
                    key={req.request_id}
                    className="bg-white rounded-2xl p-5 border border-slate-200"
                    style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                  >
                    {/* 상단: 유형 + 상태 + 취소 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ background: tc.bg, color: tc.text }}
                        >
                          {tc.label}
                        </span>
                        <span
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          <StatusIcon size={11} />
                          {sc.label}
                        </span>
                      </div>
                      {req.status === 'pending' && (
                        <button
                          onClick={() => openCancelModal(req)}
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <X size={13} />
                          취소
                        </button>
                      )}
                    </div>

                    {/* 날짜 */}
                    <p className="text-sm font-medium text-slate-800 mb-0.5">{dateStr}</p>

                    {/* 사유 */}
                    {req.reason && (
                      <p className="text-xs text-slate-500 mb-1">{req.reason}</p>
                    )}

                    {/* 반려 사유 — rejected + admin_comment 있을 때만 */}
                    {req.status === 'rejected' && req.admin_comment && (
                      <div
                        className="mt-2 px-3 py-2 rounded-lg text-xs"
                        style={{ background: '#FEF2F2', color: '#DC2626' }}
                      >
                        반려 사유: {req.admin_comment}
                      </div>
                    )}

                    {/* 경과 시간 */}
                    <p className="text-xs text-slate-400 mt-2">{elapsed}</p>
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
