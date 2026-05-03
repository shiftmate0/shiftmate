import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow, format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../api/client'
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../../components/Modal'
import Button from '../../components/Button'
import Input from '../../components/Input'

const SWAP_YEARS_RANGE_DEFAULT = 2

const STATUS_CONFIG = {
  pending:  { label: '진행 중',       bg: '#FEF3C7', color: '#D97706' },
  accepted: { label: '제안 선택 완료', bg: '#EFF6FF', color: '#3B82F6' },
  approved: { label: '승인됨',         bg: '#ECFDF5', color: '#059669' },
  rejected: { label: '반려됨',         bg: '#FEF2F2', color: '#DC2626' },
  expired:  { label: '만료됨',         bg: '#F1F5F9', color: '#94A3B8' },
}

const STATUS_TABS = [
  { key: 'active',   label: '진행 중' },
  { key: 'approved', label: '승인됨' },
  { key: 'expired',  label: '만료됨' },
  { key: 'all',      label: '전체' },
]

const ROLE_TABS = [
  { key: 'requester', label: '내가 보낸 요청' },
  { key: 'proposer',  label: '내 시프트 제안 요청' },
]

function ExpiryLabel({ expiresAt }) {
  const expires = new Date(expiresAt)
  const diffHours = (expires - Date.now()) / (1000 * 60 * 60)

  if (diffHours >= 24) {
    return (
      <span className="text-xs text-slate-400">
        만료: {format(expires, 'yyyy-MM-dd HH:mm')}
      </span>
    )
  }
  if (diffHours >= 6) {
    return (
      <span className="text-xs text-slate-500">
        {Math.ceil(diffHours)}시간 후 만료
      </span>
    )
  }
  return (
    <span className="text-xs text-red-600">
      {Math.max(1, Math.ceil(diffHours))}시간 후 만료
    </span>
  )
}

function SwapRequestItem({ req, onCancel, onDetail }) {
  const sc = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.expired

  return (
    <div
      className="bg-white rounded-2xl p-5 border border-slate-200"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span>🔄</span>
          <span className="text-sm font-semibold text-slate-800 truncate">
            {req.work_date} {req.shift_code}({req.shift_label}) 근무 교대 요청
          </span>
        </div>
        <span
          className="ml-2 shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={{ background: sc.bg, color: sc.color }}
        >
          {sc.label}
        </span>
      </div>

      {/* 내용 */}
      <div className="space-y-1 mb-3">
        <p className="text-xs text-slate-400">
          {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: ko })}
        </p>
        <p className="text-xs text-slate-500">
          경력 조건: {req.required_years_min}~{req.required_years_max}년차
        </p>
        {req.status === 'pending' && <ExpiryLabel expiresAt={req.expires_at} />}
      </div>

      {/* 제안자 요약 */}
      {req.proposal_count > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium text-slate-600">
            제안자 ({req.proposal_count}명)
          </span>
          <div className="flex -space-x-1">
            {Array.from({ length: Math.min(req.proposal_count, 3) }).map((_, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full bg-slate-300 border-2 border-white"
              />
            ))}
          </div>
        </div>
      )}

      {/* 버튼 */}
      <div className="flex justify-end gap-2">
        {req.status === 'pending' && (
          <Button variant="ghost" size="sm" onClick={() => onCancel(req)}>
            취소
          </Button>
        )}
        <Button
          variant={req.status === 'accepted' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => onDetail(req.swap_request_id)}
        >
          상세 보기 →
        </Button>
      </div>
    </div>
  )
}

export default function SwapRequestsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)

  const [statusTab, setStatusTab] = useState('active')
  const [roleTab, setRoleTab] = useState('requester')

  const [createOpen, setCreateOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)

  const [scheduleOptions, setScheduleOptions] = useState([])
  const [selectedScheduleId, setSelectedScheduleId] = useState('')
  const [selectedShiftCode, setSelectedShiftCode] = useState('')
  const [yearsMin, setYearsMin] = useState(
    Math.max(0, (user?.years_of_experience ?? 0) - SWAP_YEARS_RANGE_DEFAULT)
  )
  const [yearsMax, setYearsMax] = useState(
    (user?.years_of_experience ?? 0) + SWAP_YEARS_RANGE_DEFAULT
  )
  const [expiresHours, setExpiresHours] = useState(24)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const loadRequests = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/swap-requests')
      setRequests(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  // 60초마다 re-render (만료 카운트다운 갱신)
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(timer)
  }, [])

  const openCreateModal = async () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const today = now.toISOString().slice(0, 10)

    try {
      const [res1, res2] = await Promise.all([
        apiClient.get('/schedules/me', { params: { year, month } }),
        apiClient.get('/schedules/me', { params: { year: nextYear, month: nextMonth } }),
      ])
      const all = [...res1.data.schedules, ...res2.data.schedules]
      const filtered = all.filter(s => s.work_date > today && !s.is_locked)
      setScheduleOptions(filtered)
      if (filtered.length > 0) {
        setSelectedScheduleId(String(filtered[0].schedule_id))
        setSelectedShiftCode(`${filtered[0].shift_code} ${filtered[0].shift_label}`)
      } else {
        setSelectedScheduleId('')
        setSelectedShiftCode('')
      }
    } catch {
      setScheduleOptions([])
      setSelectedScheduleId('')
      setSelectedShiftCode('')
    }

    setYearsMin(Math.max(0, (user?.years_of_experience ?? 0) - SWAP_YEARS_RANGE_DEFAULT))
    setYearsMax((user?.years_of_experience ?? 0) + SWAP_YEARS_RANGE_DEFAULT)
    setExpiresHours(24)
    setReason('')
    setFormError('')
    setCreateOpen(true)
  }

  const handleScheduleSelect = e => {
    const id = e.target.value
    setSelectedScheduleId(id)
    const found = scheduleOptions.find(s => String(s.schedule_id) === id)
    if (found) setSelectedShiftCode(`${found.shift_code} ${found.shift_label}`)
  }

  const handleCreate = async () => {
    if (!selectedScheduleId) {
      setFormError('교대 희망 날짜를 선택해주세요.')
      return
    }
    if (yearsMin > yearsMax) {
      setFormError('연차 최솟값은 최댓값보다 클 수 없습니다.')
      return
    }
    setFormError('')
    setSubmitting(true)
    try {
      await apiClient.post('/swap-requests', {
        requester_schedule_id: Number(selectedScheduleId),
        required_years_min: yearsMin,
        required_years_max: yearsMax,
        expires_hours: expiresHours,
      })
      setCreateOpen(false)
      setLoading(true)
      await loadRequests()
    } catch (err) {
      setFormError(err.response?.data?.detail ?? '요청 생성에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      await apiClient.patch(`/swap-requests/${cancelTarget.swap_request_id}/cancel`)
      setCancelTarget(null)
      await loadRequests()
    } catch (err) {
      alert(err.response?.data?.detail ?? '취소에 실패했습니다.')
    }
  }

  // 클라이언트 탭 필터 (마운트 시 전체 1회 로드 후 FE 처리)
  const filtered = requests.filter(req => {
    if (roleTab === 'requester' && req.requester_id !== user?.user_id) return false
    if (roleTab === 'proposer' && req.requester_id === user?.user_id) return false
    if (statusTab === 'active') return req.status === 'pending' || req.status === 'accepted'
    if (statusTab === 'approved') return req.status === 'approved'
    if (statusTab === 'expired') return req.status === 'expired'
    return true
  })

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-slate-800" style={{ fontSize: 24 }}>교대 요청</h1>
          <p className="text-slate-500 text-sm mt-0.5">교대 요청 목록을 확인하고 관리합니다.</p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>교대 요청하기</Button>
      </div>

      {/* 상태 탭 */}
      <div className="space-y-2">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: statusTab === tab.key ? 'white' : 'transparent',
                color: statusTab === tab.key ? '#1E293B' : '#64748B',
                boxShadow: statusTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 역할 탭 */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {ROLE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setRoleTab(tab.key)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: roleTab === tab.key ? 'white' : 'transparent',
                color: roleTab === tab.key ? '#1E293B' : '#64748B',
                boxShadow: roleTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">교대 요청이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <SwapRequestItem
              key={req.swap_request_id}
              req={req}
              onCancel={setCancelTarget}
              onDetail={id => navigate(`/employee/swap-requests/${id}`)}
            />
          ))}
        </div>
      )}

      {/* 교대 요청서 작성 모달 */}
      <Modal size="md" open={createOpen} onClose={() => setCreateOpen(false)}>
        <ModalHeader onClose={() => setCreateOpen(false)}>교대 요청하기</ModalHeader>
        <ModalBody className="space-y-4">
          <Input
            label="교대 희망 날짜"
            type="select"
            value={selectedScheduleId}
            onChange={handleScheduleSelect}
            options={[
              { value: '', label: scheduleOptions.length === 0 ? '선택 가능한 시프트가 없습니다' : '날짜를 선택해주세요' },
              ...scheduleOptions.map(s => ({
                value: String(s.schedule_id),
                label: `${s.work_date} (${s.shift_code} ${s.shift_label})`,
              })),
            ]}
          />
          <Input
            label="교대 희망 근무"
            value={selectedShiftCode}
            disabled
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="최소 연차"
              type="number"
              value={yearsMin}
              onChange={e => setYearsMin(Math.max(0, Number(e.target.value)))}
            />
            <Input
              label="최대 연차"
              type="number"
              value={yearsMax}
              onChange={e => setYearsMax(Number(e.target.value))}
            />
          </div>
          <Input
            label="만료 시간 (시간)"
            type="number"
            value={expiresHours}
            onChange={e => setExpiresHours(Math.min(72, Math.max(1, Number(e.target.value))))}
            helper="1~72시간 (기본 24시간)"
          />
          <Input
            label="사유 (선택)"
            type="textarea"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="교대를 요청하는 사유를 입력해주세요"
          />
          {formError && <p className="text-sm text-red-500">{formError}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setCreateOpen(false)}>닫기</Button>
          <Button
            variant="primary"
            loading={submitting}
            disabled={!selectedScheduleId}
            onClick={handleCreate}
          >
            요청하기
          </Button>
        </ModalFooter>
      </Modal>

      {/* 취소 확인 모달 */}
      <Modal size="sm" open={!!cancelTarget} onClose={() => setCancelTarget(null)}>
        <ModalHeader onClose={() => setCancelTarget(null)}>교대 요청 취소</ModalHeader>
        <ModalBody>
          <p className="text-sm text-slate-600">
            교대 요청을 취소하시겠습니까? 들어온 제안도 모두 거절 처리됩니다.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setCancelTarget(null)}>닫기</Button>
          <Button variant="danger" onClick={handleCancel}>취소하기</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
