import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../api/client'
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../../components/Modal'
import Button from '../../components/Button'
import Input from '../../components/Input'

const STATUS_CONFIG = {
  pending:  { label: '진행 중',       bg: '#FEF3C7', color: '#D97706' },
  accepted: { label: '제안 선택 완료', bg: '#EFF6FF', color: '#3B82F6' },
  approved: { label: '승인됨',         bg: '#ECFDF5', color: '#059669' },
  rejected: { label: '반려됨',         bg: '#FEF2F2', color: '#DC2626' },
  expired:  { label: '만료됨',         bg: '#F1F5F9', color: '#94A3B8' },
}

function StatusBadge({ status }) {
  const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.expired
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: sc.bg, color: sc.color }}
    >
      {sc.label}
    </span>
  )
}

function ShiftChip({ color, code, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: color }} />
      <span className="text-sm font-medium text-slate-700">{code} {label}</span>
    </span>
  )
}

// ── 제안 아이템 컴포넌트 ────────────────────────────────────────────────────
function ProposalItem({ proposal, isSelected, isRequester, onSelect }) {
  const isRejected = proposal.status === 'rejected'

  return (
    <div
      className={`rounded-2xl p-4 border transition-all ${
        isSelected
          ? 'border-2 border-blue-500 bg-blue-50'
          : isRejected
          ? 'border-slate-200 bg-white opacity-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span>👤</span>
            <span className="text-sm font-semibold text-slate-800">
              {proposal.proposer_name} ({proposal.proposer_years_at_proposal}년차)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{proposal.proposer_work_date}</span>
            <ShiftChip
              color={proposal.proposer_shift_color}
              code={proposal.proposer_shift_code}
              label={proposal.proposer_shift_label}
            />
          </div>
        </div>

        <div className="shrink-0 ml-4">
          {isSelected ? (
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{ background: '#ECFDF5', color: '#059669' }}
            >
              ✓ 선택됨
            </span>
          ) : isRejected ? (
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{ background: '#F1F5F9', color: '#94A3B8' }}
            >
              거절됨
            </span>
          ) : isRequester ? (
            <Button variant="primary" size="sm" onClick={() => onSelect(proposal)}>
              선택
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ── 요청자 뷰 ──────────────────────────────────────────────────────────────
function RequesterView({ detail, onSelectProposal }) {
  const { status, proposals, accepted_proposal_id, admin_comment } = detail

  if (status === 'approved') {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: '#ECFDF5' }}
      >
        <p className="text-2xl mb-2">✅</p>
        <p className="font-semibold text-green-800">교대가 완료되었습니다</p>
        <p className="text-sm text-green-600 mt-1">관리자가 교대를 최종 승인했습니다.</p>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: '#FEF2F2' }}
      >
        <p className="text-2xl mb-2">❌</p>
        <p className="font-semibold text-red-700">관리자가 반려했습니다</p>
        {admin_comment && (
          <p className="text-sm text-red-600 mt-1">사유: {admin_comment}</p>
        )}
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: '#F1F5F9' }}
      >
        <p className="text-2xl mb-2">⏰</p>
        <p className="font-semibold text-slate-600">요청이 만료되었습니다</p>
      </div>
    )
  }

  if (status === 'accepted') {
    return (
      <div className="space-y-3">
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium text-blue-700"
          style={{ background: '#EFF6FF' }}
        >
          관리자 승인 대기 중입니다.
        </div>
        {proposals.map(p => (
          <ProposalItem
            key={p.swap_proposal_id}
            proposal={p}
            isSelected={p.swap_proposal_id === accepted_proposal_id}
            isRequester={false}
            onSelect={null}
          />
        ))}
      </div>
    )
  }

  // status === 'pending'
  if (proposals.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm">
        들어온 제안이 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {proposals.map(p => (
        <ProposalItem
          key={p.swap_proposal_id}
          proposal={p}
          isSelected={false}
          isRequester
          onSelect={onSelectProposal}
        />
      ))}
    </div>
  )
}

// ── 제안자 뷰 ──────────────────────────────────────────────────────────────
function ProposerView({ detail, currentUserId, onOpenPropose }) {
  const { status, proposals, accepted_proposal_id, required_years_min, required_years_max } = detail
  const myProposal = proposals.find(p => p.proposer_id === currentUserId)

  if (!myProposal) {
    if (status === 'pending') {
      return (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm text-slate-500">아직 제안하지 않았습니다.</p>
          <Button variant="primary" onClick={onOpenPropose}>제안하기</Button>
        </div>
      )
    }
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        제안 가능한 상태가 아닙니다.
      </div>
    )
  }

  // 본인 제안 있음
  if (status === 'accepted') {
    const isMySelected = myProposal.swap_proposal_id === accepted_proposal_id
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: isMySelected ? '#EFF6FF' : '#F8FAFC' }}
      >
        <ProposalItem
          proposal={myProposal}
          isSelected={isMySelected}
          isRequester={false}
          onSelect={null}
        />
        <p
          className="text-sm font-medium mt-3"
          style={{ color: isMySelected ? '#1D4ED8' : '#94A3B8' }}
        >
          {isMySelected
            ? '선택되었습니다. 관리자 승인 대기 중'
            : '선택되지 않았습니다'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500 mb-2">내 제안</p>
      <ProposalItem
        proposal={myProposal}
        isSelected={false}
        isRequester={false}
        onSelect={null}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════
// 메인 페이지
// ════════════════════════════════════════════════════════
export default function SwapRequestDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  // 제안 선택 확인 모달
  const [acceptTarget, setAcceptTarget] = useState(null)
  const [accepting, setAccepting] = useState(false)

  // 제안 생성 모달
  const [proposeOpen, setProposeOpen] = useState(false)
  const [proposeScheduleId, setProposeScheduleId] = useState('')
  const [proposeShiftDisplay, setProposeShiftDisplay] = useState('')
  const [proposeScheduleOptions, setProposeScheduleOptions] = useState([])
  const [proposing, setProposing] = useState(false)
  const [proposeError, setProposeError] = useState('')

  const loadDetail = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/swap-requests/${id}`)
      setDetail(data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  // 제안 선택 확정
  const handleAccept = async () => {
    if (!acceptTarget) return
    setAccepting(true)
    try {
      await apiClient.patch(`/swap-requests/${id}/accept`, {
        proposal_id: acceptTarget.swap_proposal_id,
      })
      setAcceptTarget(null)
      await loadDetail()
    } catch (err) {
      alert(err.response?.data?.detail ?? '선택에 실패했습니다.')
    } finally {
      setAccepting(false)
    }
  }

  // 제안 생성 모달 열기
  const openProposeModal = async () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const today = now.toISOString().slice(0, 10)

    try {
      const [r1, r2] = await Promise.all([
        apiClient.get('/schedules/me', { params: { year, month } }),
        apiClient.get('/schedules/me', { params: { year: nextYear, month: nextMonth } }),
      ])
      const all = [...r1.data.schedules, ...r2.data.schedules]
      const filtered = all.filter(s => s.work_date > today && !s.is_locked)
      setProposeScheduleOptions(filtered)
      if (filtered.length > 0) {
        setProposeScheduleId(String(filtered[0].schedule_id))
        setProposeShiftDisplay(`${filtered[0].shift_code} ${filtered[0].shift_label}`)
      } else {
        setProposeScheduleId('')
        setProposeShiftDisplay('')
      }
    } catch {
      setProposeScheduleOptions([])
    }
    setProposeError('')
    setProposeOpen(true)
  }

  const handleProposeScheduleSelect = e => {
    const sid = e.target.value
    setProposeScheduleId(sid)
    const found = proposeScheduleOptions.find(s => String(s.schedule_id) === sid)
    if (found) setProposeShiftDisplay(`${found.shift_code} ${found.shift_label}`)
  }

  const handlePropose = async () => {
    if (!proposeScheduleId) {
      setProposeError('제안할 날짜를 선택해주세요.')
      return
    }
    setProposing(true)
    setProposeError('')
    try {
      await apiClient.post(`/swap-requests/${id}/proposals`, {
        proposer_schedule_id: Number(proposeScheduleId),
      })
      setProposeOpen(false)
      await loadDetail()
    } catch (err) {
      setProposeError(err.response?.data?.detail ?? '제안 생성에 실패했습니다.')
    } finally {
      setProposing(false)
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-slate-400 text-sm">불러오는 중...</div>
  }

  if (!detail) {
    return <div className="text-center py-20 text-slate-400 text-sm">요청을 찾을 수 없습니다.</div>
  }

  const isRequester = detail.requester_id === user?.user_id
  const sc = STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.expired
  const yearsOk =
    user &&
    user.years_of_experience >= detail.required_years_min &&
    user.years_of_experience <= detail.required_years_max

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 뒤로가기 + 헤더 */}
      <div>
        <button
          onClick={() => navigate('/employee/swap-requests')}
          className="text-sm text-slate-400 hover:text-slate-600 mb-3 flex items-center gap-1"
        >
          ← 뒤로가기
        </button>
        <h1 className="font-bold text-slate-800" style={{ fontSize: 24 }}>교대 요청 상세</h1>
      </div>

      {/* 요청 정보 카드 */}
      <div
        className="bg-white rounded-2xl p-6 border border-slate-200 space-y-3"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🔄</span>
            <span className="font-semibold text-slate-800">
              {detail.work_date}{' '}
              <ShiftChip
                color={detail.shift_color}
                code={detail.shift_code}
                label={detail.shift_label}
              />{' '}
              근무
            </span>
          </div>
          <StatusBadge status={detail.status} />
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
          <span>요청자: {detail.requester_name} ({detail.requester_years_at_request}년차)</span>
          <span>경력 조건: {detail.required_years_min}~{detail.required_years_max}년차</span>
          {detail.status === 'pending' && (
            <span>만료: {format(new Date(detail.expires_at), 'yyyy-MM-dd HH:mm')}</span>
          )}
        </div>
      </div>

      {/* 제안자 뷰 전용: 연차 조건 확인 */}
      {!isRequester && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium"
          style={{
            background: yearsOk ? '#ECFDF5' : '#FEF2F2',
            color: yearsOk ? '#059669' : '#DC2626',
          }}
        >
          내 연차: {user?.years_of_experience}년차 &nbsp;|&nbsp; 요청 조건:{' '}
          {detail.required_years_min}~{detail.required_years_max}년차&nbsp;
          {yearsOk ? '✅' : '❌ 조건 미충족'}
        </div>
      )}

      {/* 뷰 분기 */}
      <div
        className="bg-white rounded-2xl p-6 border border-slate-200"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <h2 className="font-semibold text-slate-700 text-sm mb-4">
          {isRequester ? '들어온 제안' : '제안 현황'}
        </h2>
        {isRequester ? (
          <RequesterView detail={detail} onSelectProposal={setAcceptTarget} />
        ) : (
          <ProposerView
            detail={detail}
            currentUserId={user?.user_id}
            onOpenPropose={openProposeModal}
          />
        )}
      </div>

      {/* 제안 선택 확인 모달 */}
      <Modal size="sm" open={!!acceptTarget} onClose={() => setAcceptTarget(null)}>
        <ModalHeader onClose={() => setAcceptTarget(null)}>제안 선택</ModalHeader>
        <ModalBody>
          <p className="text-sm text-slate-600">
            {acceptTarget?.proposer_name}님의 제안을 선택하시겠습니까?
            <br />
            선택 후 나머지 제안은 자동으로 거절 처리됩니다.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setAcceptTarget(null)}>닫기</Button>
          <Button variant="primary" loading={accepting} onClick={handleAccept}>
            선택 확정
          </Button>
        </ModalFooter>
      </Modal>

      {/* 제안 생성 모달 */}
      <Modal size="md" open={proposeOpen} onClose={() => setProposeOpen(false)}>
        <ModalHeader onClose={() => setProposeOpen(false)}>제안하기</ModalHeader>
        <ModalBody className="space-y-4">
          {/* 요청 정보 읽기 전용 */}
          <div
            className="rounded-xl p-4 text-sm space-y-1"
            style={{ background: '#F8FAFC' }}
          >
            <p className="text-slate-500 text-xs font-medium mb-2">교대 요청 정보</p>
            <p className="text-slate-700">
              요청자: <strong>{detail.requester_name}</strong>
            </p>
            <p className="text-slate-700">
              날짜: <strong>{detail.work_date}</strong> &nbsp;
              근무: <strong>{detail.shift_code} {detail.shift_label}</strong>
            </p>
            <p className="text-slate-700">
              경력 조건: <strong>{detail.required_years_min}~{detail.required_years_max}년차</strong>
            </p>
          </div>

          {/* 연차 조건 확인 */}
          <div
            className="rounded-xl px-4 py-2 text-sm font-medium"
            style={{
              background: yearsOk ? '#ECFDF5' : '#FEF2F2',
              color: yearsOk ? '#059669' : '#DC2626',
            }}
          >
            내 연차: {user?.years_of_experience}년차 &nbsp;|&nbsp; 요청 조건:{' '}
            {detail.required_years_min}~{detail.required_years_max}년차{' '}
            {yearsOk ? '✅' : '❌'}
          </div>

          <Input
            label="내 시프트 선택"
            type="select"
            value={proposeScheduleId}
            onChange={handleProposeScheduleSelect}
            options={[
              {
                value: '',
                label:
                  proposeScheduleOptions.length === 0
                    ? '선택 가능한 시프트가 없습니다'
                    : '날짜를 선택해주세요',
              },
              ...proposeScheduleOptions.map(s => ({
                value: String(s.schedule_id),
                label: `${s.work_date} (${s.shift_code} ${s.shift_label})`,
              })),
            ]}
          />
          <Input label="근무 유형" value={proposeShiftDisplay} disabled />

          {proposeError && <p className="text-sm text-red-500">{proposeError}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setProposeOpen(false)}>닫기</Button>
          <Button
            variant="primary"
            loading={proposing}
            disabled={!proposeScheduleId || !yearsOk}
            onClick={handlePropose}
          >
            제안하기
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
