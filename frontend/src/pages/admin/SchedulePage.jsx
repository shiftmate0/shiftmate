import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import apiClient from '../../api/client'
import ShiftCell from '../../components/ShiftCell'
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../../components/Modal'
import Badge from '../../components/Badge'
import Button from '../../components/Button'
import { useToast } from '../../components/Toast'

// ── 검증 API 준비 플래그 — Day 3 AM 이후 true로 변경 ──────────────
const VALIDATE_API_READY = false

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getDayOfWeek(year, month, day) {
  return WEEKDAYS[new Date(year, month - 1, day).getDay()]
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function padDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const PERSON_WARNING_TYPES = new Set(['consecutive_night', 'night_to_day', 'workload_bias'])

function formatWarning(w) {
  return PERSON_WARNING_TYPES.has(w.type)
    ? `${w.name}: ${w.message}`
    : `${w.date}: ${w.message}`
}

export default function SchedulePage() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const year  = parseInt(searchParams.get('year'))  || new Date().getFullYear()
  const month = parseInt(searchParams.get('month')) || new Date().getMonth() + 1
  const view  = searchParams.get('view') || 'grid'

  // ── State ──────────────────────────────────────────────────
  const [employees, setEmployees]             = useState([])
  const [shiftTypes, setShiftTypes]           = useState([])
  const [schedulesData, setSchedulesData]     = useState({ period_status: null, schedules: [] })
  const [selectedCell, setSelectedCell]       = useState(null)
  const [selectedStId, setSelectedStId]       = useState(null)
  const [validationResult, setValidationResult] = useState(null)
  const [saving, setSaving]                   = useState(false)
  const [confirming, setConfirming]           = useState(false)
  const [showValModal, setShowValModal]       = useState(false)
  const [pendingWarnings, setPendingWarnings] = useState([])

  // ── 월 네비게이션 ────────────────────────────────────────────
  const goMonth = (delta) => {
    let y = year, m = month + delta
    if (m < 1)  { m = 12; y-- }
    if (m > 12) { m = 1;  y++ }
    setSearchParams({ year: y, month: m, view })
  }

  const setView = (v) => setSearchParams({ year, month, view: v })

  // ── 데이터 로드 ──────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      apiClient.get('/admin/employees'),
      apiClient.get('/admin/shift-types'),
    ]).then(([empRes, stRes]) => {
      setEmployees(empRes.data.filter(e => e.is_active))
      setShiftTypes(stRes.data)
    }).catch(() => toast.error('직원·근무 유형 로드 실패'))
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    apiClient.get('/schedules', { params: { year, month } })
      .then(res => setSchedulesData(res.data))
      .catch(() => toast.error('근무표 로드 실패'))
  }, [year, month])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── 스케줄 조회 맵 (O(1)) ────────────────────────────────────
  const scheduleMap = {}
  for (const s of schedulesData.schedules) {
    scheduleMap[`${s.user_id}_${s.work_date}`] = s
  }

  const daysInMonth = getDaysInMonth(year, month)
  const isConfirmed = schedulesData.period_status === 'confirmed'

  // ── 셀 클릭 ─────────────────────────────────────────────────
  const handleCellClick = (employee, day) => {
    const workDate = padDate(year, month, day)
    const sched = scheduleMap[`${employee.user_id}_${workDate}`] ?? null
    setSelectedCell({ employee, day, workDate, schedule: sched })
    setSelectedStId(sched?.shift_type_id ?? null)
  }

  // ── 저장 ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedStId) return
    setSaving(true)
    try {
      const { employee, workDate, schedule } = selectedCell
      if (schedule?.schedule_id) {
        await apiClient.put(`/admin/schedules/${schedule.schedule_id}`, {
          shift_type_id: selectedStId,
        })
      } else {
        await apiClient.post('/admin/schedules/bulk', [
          { user_id: employee.user_id, work_date: workDate, shift_type_id: selectedStId },
        ])
      }
      const st = shiftTypes.find(t => t.shift_type_id === selectedStId)
      setSchedulesData(prev => ({
        ...prev,
        schedules: [
          ...prev.schedules.filter(
            s => !(s.user_id === employee.user_id && s.work_date === workDate)
          ),
          {
            schedule_id:   schedule?.schedule_id ?? Date.now(),
            user_id:       employee.user_id,
            work_date:     workDate,
            shift_type_id: selectedStId,
            shift_code:    st.code,
            shift_color:   st.color,
            shift_label:   st.label,
            is_locked:     false,
          },
        ],
      }))
      setSelectedCell(null)
    } catch (err) {
      if (err?.response?.status === 400) {
        toast.error('교대 협의 중인 시프트는 수정할 수 없습니다')
      } else {
        toast.error('저장에 실패했습니다')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── 검증 ────────────────────────────────────────────────────
  const handleValidate = async () => {
    if (!VALIDATE_API_READY) {
      toast.info('검증 기능은 준비 중입니다')
      setValidationResult(null)
      return
    }
    try {
      const res = await apiClient.get('/admin/schedules/validate', { params: { year, month } })
      setValidationResult(res.data)
    } catch {
      toast.error('검증에 실패했습니다')
    }
  }

  // ── 확정 ────────────────────────────────────────────────────
  const handleConfirm = async () => {
    let warnings = []
    if (VALIDATE_API_READY) {
      try {
        const res = await apiClient.get('/admin/schedules/validate', { params: { year, month } })
        warnings = res.data.warnings ?? []
      } catch {
        toast.error('검증에 실패했습니다')
        return
      }
    }
    if (warnings.length > 0) {
      setPendingWarnings(warnings)
      setShowValModal(true)
      return
    }
    await doConfirm()
  }

  const doConfirm = async () => {
    setConfirming(true)
    setShowValModal(false)
    try {
      await apiClient.post(`/admin/schedules/${year}/${month}/confirm`)
      setSchedulesData(prev => ({ ...prev, period_status: 'confirmed' }))
      toast.success(`${year}년 ${month}월 근무표가 확정되었습니다`)
    } catch (err) {
      const detail = err?.response?.data?.detail ?? ''
      toast.error(detail.includes('이미 확정된')
        ? '이미 확정된 근무표입니다'
        : '확정에 실패했습니다')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── 셀 편집 모달 ────────────────────────────────────────── */}
      <Modal size="sm" open={!!selectedCell} onClose={() => setSelectedCell(null)}>
        {selectedCell && (
          <>
            <ModalHeader onClose={() => setSelectedCell(null)}>
              {selectedCell.workDate} / {selectedCell.employee.name}
            </ModalHeader>
            <ModalBody>
              <div className="space-y-1">
                {shiftTypes.map(st => (
                  <label
                    key={st.shift_type_id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="shift_type"
                      checked={selectedStId === st.shift_type_id}
                      onChange={() => setSelectedStId(st.shift_type_id)}
                      className="shrink-0"
                    />
                    <span
                      className="w-4 h-4 rounded shrink-0"
                      style={{ background: st.color }}
                    />
                    <span className="text-sm text-slate-700">{st.code} {st.label}</span>
                  </label>
                ))}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setSelectedCell(null)}>취소</Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!selectedStId || saving}
                loading={saving}
              >
                저장
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      {/* ── 검증 경고 모달 ──────────────────────────────────────── */}
      <Modal size="md" open={showValModal} onClose={() => setShowValModal(false)}>
        <ModalHeader onClose={() => setShowValModal(false)}>⚠ 검증 경고</ModalHeader>
        <ModalBody>
          <ul
            className="space-y-1.5 p-4 rounded-xl"
            style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}
          >
            {pendingWarnings.map((w, i) => (
              <li key={i} className="text-sm" style={{ color: '#D97706' }}>
                • {formatWarning(w)}
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-500 mt-3">경고가 있어도 확정할 수 있습니다.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowValModal(false)}>취소</Button>
          <Button variant="primary" onClick={doConfirm} loading={confirming}>강제 확정</Button>
        </ModalFooter>
      </Modal>

      {/* ── 페이지 타이틀 + 월 네비게이션 ──────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-slate-800" style={{ fontSize: 24 }}>
            근무표 작성 — {year}년 {month}월
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            직원별 근무 유형을 배정하고 확정합니다.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => goMonth(-1)}>
            ◀ {month === 1 ? 12 : month - 1}월
          </Button>
          <Button variant="ghost" size="sm" onClick={() => goMonth(1)}>
            {month === 12 ? 1 : month + 1}월 ▶
          </Button>
        </div>
      </div>

      {/* ── 뷰 전환 탭 ───────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-slate-200">
        {[
          { key: 'grid',     label: '그리드 작성' },
          { key: 'calendar', label: '캘린더 조회' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className="px-5 py-3 text-sm font-medium border-b-2 transition-colors"
            style={{
              borderColor: view === tab.key ? '#3B82F6' : 'transparent',
              color:       view === tab.key ? '#3B82F6' : '#94A3B8',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 그리드 뷰 ────────────────────────────────────────────── */}
      {view === 'grid' && (
        <div className="space-y-4">

          {/* 액션 바 */}
          <div className="flex items-center justify-between">
            <Badge variant={isConfirmed ? 'status-approved' : 'default'}>
              {isConfirmed ? 'Confirmed' : 'Draft'}
            </Badge>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleValidate}>
                검증 실행
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirm}
                disabled={isConfirmed || confirming}
                loading={confirming}
              >
                확정하기
              </Button>
            </div>
          </div>

          {/* 그리드 테이블 */}
          <div
            className="bg-white rounded-2xl border border-slate-200 overflow-auto"
            style={{
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              maxHeight: 'calc(100vh - 320px)',
            }}
          >
            <table className="border-collapse" style={{ minWidth: 'max-content' }}>
              <thead>
                <tr className="border-b border-slate-100">
                  {/* 코너 셀 — top+left 모두 sticky */}
                  <th
                    className="bg-white text-left px-4 py-3 text-xs font-semibold text-slate-500 border-r border-slate-100"
                    style={{ position: 'sticky', top: 0, left: 0, zIndex: 30, minWidth: 100 }}
                  >
                    직원명
                  </th>
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dow = getDayOfWeek(year, month, day)
                    return (
                      <th
                        key={day}
                        className="bg-white px-2 py-3 text-xs font-medium text-center"
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 20,
                          color: dow === '일' ? '#EF4444' : dow === '토' ? '#3B82F6' : '#64748B',
                          minWidth: 52,
                        }}
                      >
                        <div>{day}</div>
                        <div>({dow})</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.user_id} className="border-b border-slate-50 hover:bg-slate-50/40">
                    <td
                      className="bg-white px-4 py-2 text-sm font-medium text-slate-700 border-r border-slate-100 whitespace-nowrap"
                      style={{ position: 'sticky', left: 0, zIndex: 10 }}
                    >
                      {emp.name}
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const workDate = padDate(year, month, day)
                      const sched = scheduleMap[`${emp.user_id}_${workDate}`]
                      return (
                        <td key={day} className="px-1 py-1.5">
                          <ShiftCell
                            shift={sched?.shift_code ?? null}
                            bg={sched?.shift_color ?? undefined}
                            color={sched ? '#ffffff' : undefined}
                            locked={sched?.is_locked ?? false}
                            editable={!sched?.is_locked}
                            onClick={() => handleCellClick(emp, day)}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td
                      colSpan={daysInMonth + 1}
                      className="text-center py-12 text-sm text-slate-400"
                    >
                      불러오는 중...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 검증 결과 */}
          {validationResult && (
            <div
              className="p-4 rounded-2xl"
              style={{
                background: validationResult.is_valid ? '#ECFDF5' : '#FEF3C7',
                border:     `1px solid ${validationResult.is_valid ? '#A7F3D0' : '#FDE68A'}`,
              }}
            >
              {validationResult.is_valid ? (
                <p className="text-sm font-medium text-green-600">✅ 검증 통과</p>
              ) : (
                <ul className="space-y-1">
                  {validationResult.warnings.map((w, i) => (
                    <li key={i} className="text-sm" style={{ color: '#D97706' }}>
                      • {formatWarning(w)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 캘린더 뷰 — 멤버2(사용자3) 추가 예정 ───────────────────── */}
      {view === 'calendar' && (
        <div
          className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
        >
          캘린더 뷰는 멤버2(사용자3)가 구현 예정입니다
        </div>
      )}
    </div>
  )
}
