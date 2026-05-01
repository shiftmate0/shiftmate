import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import apiClient from '../../api/client'
import { mockShiftTypes } from '../../api/mocks/shiftTypes'
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../../components/Modal'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Table, { TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/Table'
import { useToast } from '../../components/Toast'

const COLOR_RE = /^#[0-9A-Fa-f]{6}$/
const defaultForm = { code: '', label: '', start_time: '', end_time: '', color: '#3B82F6', is_work_day: true }

function isValidColor(v) {
  return COLOR_RE.test(v)
}

function ColorField({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">색상</label>
      <div className="flex items-center gap-3">
        <div
          className="w-6 h-6 rounded-full shrink-0 border border-slate-200"
          style={{ backgroundColor: isValidColor(value) ? value : '#94A3B8' }}
        />
        <Input
          placeholder="#3B82F6"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

function TimeFields({ start, end, onStartChange, onEndChange }) {
  const cls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">시작 시간</label>
        <input type="time" value={start} onChange={e => onStartChange(e.target.value)} className={cls} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">종료 시간</label>
        <input type="time" value={end} onChange={e => onEndChange(e.target.value)} className={cls} />
      </div>
    </div>
  )
}

function WorkDayToggle({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">근무일 여부</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-blue-500' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
        </button>
        <span className="text-sm text-slate-600">{value ? '근무일' : '비근무일'}</span>
      </div>
    </div>
  )
}

function validateTime(start, end) {
  const hasStart = start.trim() !== ''
  const hasEnd = end.trim() !== ''
  if (hasStart !== hasEnd) return '시작/종료 시간을 모두 입력하거나 모두 비우세요'
  return ''
}

export default function ShiftTypesPage() {
  const toast = useToast()
  const [shiftTypes, setShiftTypes] = useState(mockShiftTypes)
  const [loading, setLoading] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState(defaultForm)
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(defaultForm)
  const [editError, setEditError] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => { fetchShiftTypes() }, [])

  async function fetchShiftTypes() {
    setLoading(true)
    try {
      const { data } = await apiClient.get('/admin/shift-types')
      setShiftTypes(data)
    } catch {
      // mock 유지
    } finally {
      setLoading(false)
    }
  }

  // --- 근무 유형 추가 ---
  function openAdd() {
    setAddForm(defaultForm)
    setAddError('')
    setAddOpen(true)
  }

  async function handleAdd() {
    const timeErr = validateTime(addForm.start_time, addForm.end_time)
    if (timeErr) { setAddError(timeErr); return }

    setAddError('')
    setAddLoading(true)
    try {
      await apiClient.post('/admin/shift-types', {
        code: addForm.code.trim().toUpperCase(),
        label: addForm.label.trim(),
        start_time: addForm.start_time || null,
        end_time: addForm.end_time || null,
        color: addForm.color,
        is_work_day: addForm.is_work_day,
      })
      setAddOpen(false)
      fetchShiftTypes()
    } catch (err) {
      setAddError(err.response?.data?.detail || '등록에 실패했습니다')
    } finally {
      setAddLoading(false)
    }
  }

  // --- 근무 유형 수정 ---
  function openEdit(st) {
    setEditTarget(st)
    setEditForm({
      code: st.code,
      label: st.label,
      start_time: st.start_time ?? '',
      end_time: st.end_time ?? '',
      color: st.color,
      is_work_day: st.is_work_day,
    })
    setEditError('')
    setEditOpen(true)
  }

  async function handleEdit() {
    const timeErr = validateTime(editForm.start_time, editForm.end_time)
    if (timeErr) { setEditError(timeErr); return }

    setEditError('')
    setEditLoading(true)
    try {
      await apiClient.put(`/admin/shift-types/${editTarget.shift_type_id}`, {
        label: editForm.label.trim(),
        start_time: editForm.start_time || null,
        end_time: editForm.end_time || null,
        color: editForm.color,
        is_work_day: editForm.is_work_day,
      })
      setEditOpen(false)
      toast.success('근무 유형이 수정되었습니다')
      fetchShiftTypes()
    } catch (err) {
      setEditError(err.response?.data?.detail || '수정에 실패했습니다')
    } finally {
      setEditLoading(false)
    }
  }

  // --- 근무 유형 삭제 ---
  async function handleDelete() {
    setDeleteLoading(true)
    try {
      await apiClient.delete(`/admin/shift-types/${deleteTarget.shift_type_id}`)
      setDeleteTarget(null)
      fetchShiftTypes()
    } catch (err) {
      setDeleteTarget(null)
      const detail = err.response?.data?.detail ?? ''
      if (detail.includes('사용 중인')) {
        toast.error('현재 근무표에서 사용 중인 코드는 삭제할 수 없습니다')
      } else {
        toast.error(detail || '삭제에 실패했습니다')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">근무 유형 관리</h1>
        <Button variant="primary" icon={Plus} onClick={openAdd}>근무 유형 추가</Button>
      </div>

      {/* 테이블 */}
      <Table
        loading={loading}
        skeletonCols={5}
        empty={!loading && shiftTypes.length === 0 ? '근무 유형이 없습니다' : undefined}
      >
        <TableHeader>
          <tr>
            <TableHead>코드</TableHead>
            <TableHead>라벨</TableHead>
            <TableHead>시간</TableHead>
            <TableHead>색상</TableHead>
            <TableHead>관리</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {shiftTypes.map(st => (
            <TableRow key={st.shift_type_id}>
              <TableCell>
                <span className="font-bold text-slate-800">{st.code}</span>
              </TableCell>
              <TableCell>{st.label}</TableCell>
              <TableCell>
                {st.start_time && st.end_time ? `${st.start_time} ~ ${st.end_time}` : '-'}
              </TableCell>
              <TableCell>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: st.color }} />
              </TableCell>
              <TableCell>
                {st.is_system ? (
                  <span className="text-slate-400 text-sm">🔒</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(st)}>수정</Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(st)}>삭제</Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 근무 유형 추가 모달 */}
      <Modal size="md" open={addOpen} onClose={() => setAddOpen(false)}>
        <ModalHeader onClose={() => setAddOpen(false)}>근무 유형 추가</ModalHeader>
        <ModalBody className="space-y-4">
          <Input
            label="코드"
            required
            placeholder="예: D, E, N"
            value={addForm.code}
            onChange={e => setAddForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            helper="대문자 영문과 숫자만, 최대 10자"
          />
          <Input
            label="라벨"
            required
            placeholder="예: 주간, 야간"
            value={addForm.label}
            onChange={e => setAddForm(f => ({ ...f, label: e.target.value }))}
          />
          <TimeFields
            start={addForm.start_time}
            end={addForm.end_time}
            onStartChange={v => setAddForm(f => ({ ...f, start_time: v }))}
            onEndChange={v => setAddForm(f => ({ ...f, end_time: v }))}
          />
          <ColorField
            value={addForm.color}
            onChange={v => setAddForm(f => ({ ...f, color: v }))}
          />
          <WorkDayToggle
            value={addForm.is_work_day}
            onChange={v => setAddForm(f => ({ ...f, is_work_day: v }))}
          />
          {addError && <p className="text-sm text-red-500">{addError}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setAddOpen(false)}>취소</Button>
          <Button
            variant="primary"
            disabled={!addForm.code.trim() || !addForm.label.trim()}
            loading={addLoading}
            onClick={handleAdd}
          >
            추가
          </Button>
        </ModalFooter>
      </Modal>

      {/* 근무 유형 수정 모달 */}
      <Modal size="md" open={editOpen} onClose={() => setEditOpen(false)}>
        <ModalHeader onClose={() => setEditOpen(false)}>근무 유형 수정</ModalHeader>
        <ModalBody className="space-y-4">
          <Input label="코드" value={editForm.code} readOnly />
          <Input
            label="라벨"
            required
            value={editForm.label}
            onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
          />
          <TimeFields
            start={editForm.start_time}
            end={editForm.end_time}
            onStartChange={v => setEditForm(f => ({ ...f, start_time: v }))}
            onEndChange={v => setEditForm(f => ({ ...f, end_time: v }))}
          />
          <ColorField
            value={editForm.color}
            onChange={v => setEditForm(f => ({ ...f, color: v }))}
          />
          <WorkDayToggle
            value={editForm.is_work_day}
            onChange={v => setEditForm(f => ({ ...f, is_work_day: v }))}
          />
          {editError && <p className="text-sm text-red-500">{editError}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEditOpen(false)}>취소</Button>
          <Button
            variant="primary"
            disabled={!editForm.label.trim()}
            loading={editLoading}
            onClick={handleEdit}
          >
            저장
          </Button>
        </ModalFooter>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal size="sm" open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <ModalHeader onClose={() => setDeleteTarget(null)}>근무 유형 삭제</ModalHeader>
        <ModalBody>
          <p className="text-sm text-slate-700">
            {deleteTarget?.code} ({deleteTarget?.label}) 근무 유형을 삭제하시겠습니까?
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>취소</Button>
          <Button variant="danger" loading={deleteLoading} onClick={handleDelete}>삭제</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
