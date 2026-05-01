import { useState, useEffect, useMemo } from 'react'
import { Plus, Copy } from 'lucide-react'
import apiClient from '../../api/client'
import { mockEmployees } from '../../api/mocks/employees'
import Modal, { ModalHeader, ModalBody, ModalFooter } from '../../components/Modal'
import Button from '../../components/Button'
import Badge from '../../components/Badge'
import Input from '../../components/Input'
import Table, { TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/Table'
import { useToast } from '../../components/Toast'

const defaultAddForm = { name: '', employee_no: '', years_of_experience: 0, role: 'employee' }
const defaultEditForm = { name: '', years_of_experience: 0, role: 'employee', is_active: true }

export default function EmployeesPage() {
  const toast = useToast()

  const [employees, setEmployees] = useState(mockEmployees)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterActive, setFilterActive] = useState('all')

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState(defaultAddForm)
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(defaultEditForm)
  const [editLoading, setEditLoading] = useState(false)

  const [resetTarget, setResetTarget] = useState(null)
  const [resetLoading, setResetLoading] = useState(false)

  const [tempPw, setTempPw] = useState(null)

  useEffect(() => {
    fetchEmployees()
  }, [])

  async function fetchEmployees() {
    setLoading(true)
    try {
      const { data } = await apiClient.get('/admin/employees')
      setEmployees(data)
    } catch {
      // mock 데이터 유지
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return employees.filter(e => {
      const matchSearch =
        !keyword ||
        e.name?.toLowerCase().includes(keyword) ||
        e.employee_no?.toLowerCase().includes(keyword)
      const matchRole = filterRole === 'all' || e.role === filterRole
      const matchActive =
        filterActive === 'all' ||
        (filterActive === 'active' ? e.is_active : !e.is_active)
      return matchSearch && matchRole && matchActive
    })
  }, [employees, search, filterRole, filterActive])

  // --- 직원 등록 ---
  function openAdd() {
    setAddForm(defaultAddForm)
    setAddError('')
    setAddOpen(true)
  }

  const addDisabled =
    !addForm.name.trim() ||
    !addForm.employee_no.trim() ||
    addForm.years_of_experience < 0

  async function handleAdd() {
    setAddError('')
    setAddLoading(true)
    try {
      const { data } = await apiClient.post('/admin/employees', {
        name: addForm.name.trim(),
        employee_no: addForm.employee_no.trim(),
        years_of_experience: Number(addForm.years_of_experience),
        role: addForm.role,
      })
      setAddOpen(false)
      setTempPw({ name: data.name, password: data.temporary_password })
    } catch (err) {
      setAddError(err.response?.data?.detail || '등록에 실패했습니다')
    } finally {
      setAddLoading(false)
    }
  }

  // --- 임시 비밀번호 모달 ---
  async function handleTempPwClose() {
    setTempPw(null)
    fetchEmployees()
  }

  async function handleCopyPassword() {
    try {
      await navigator.clipboard.writeText(tempPw.password)
      toast.success('복사되었습니다')
    } catch {
      toast.error('복사에 실패했습니다')
    }
  }

  // --- 직원 수정 ---
  function openEdit(emp) {
    setEditTarget(emp)
    setEditForm({
      name: emp.name,
      years_of_experience: emp.years_of_experience,
      role: emp.role,
      is_active: emp.is_active,
    })
    setEditOpen(true)
  }

  async function handleEdit() {
    setEditLoading(true)
    try {
      await apiClient.put(`/admin/employees/${editTarget.user_id}`, editForm)
      setEditOpen(false)
      toast.success('직원 정보가 수정되었습니다')
      fetchEmployees()
    } catch (err) {
      toast.error(err.response?.data?.detail || '수정에 실패했습니다')
    } finally {
      setEditLoading(false)
    }
  }

  // --- 비밀번호 초기화 ---
  async function handleReset() {
    setResetLoading(true)
    try {
      const { data } = await apiClient.post(`/admin/employees/${resetTarget.user_id}/reset-password`)
      setResetTarget(null)
      setTempPw({ name: data.name, password: data.temporary_password })
    } catch (err) {
      toast.error(err.response?.data?.detail || '초기화에 실패했습니다')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">직원 관리</h1>
          <p className="text-sm text-slate-500 mt-0.5">직원 등록·수정·비활성화 및 연차 관리</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={openAdd}>직원 추가</Button>
      </div>

      {/* 필터 행 */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="all">전체 역할</option>
          <option value="admin">관리자</option>
          <option value="employee">직원</option>
        </select>

        <select
          value={filterActive}
          onChange={e => setFilterActive(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="all">전체 상태</option>
          <option value="active">재직</option>
          <option value="inactive">비활성</option>
        </select>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름 또는 사번 검색"
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 w-56"
        />

        <span className="text-sm text-slate-400">{filtered.length}명</span>
      </div>

      {/* 테이블 */}
      <Table
        loading={loading}
        skeletonCols={5}
        empty={!loading && filtered.length === 0 ? '조건에 맞는 직원이 없습니다' : undefined}
      >
        <TableHeader>
          <tr>
            <TableHead>이름</TableHead>
            <TableHead>사번</TableHead>
            <TableHead>연차</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>관리</TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {filtered.map(emp => (
            <TableRow key={emp.user_id}>
              <TableCell className="font-medium text-slate-800">{emp.name}</TableCell>
              <TableCell className="font-mono text-slate-500">{emp.employee_no}</TableCell>
              <TableCell>{emp.years_of_experience}년차</TableCell>
              <TableCell>
                <Badge variant={emp.is_active ? 'status-approved' : 'default'}>
                  {emp.is_active ? '재직' : '비활성'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(emp)}>수정</Button>
                  {emp.is_active && (
                    <Button variant="ghost" size="sm" onClick={() => setResetTarget(emp)}>초기화</Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* 직원 등록 모달 */}
      <Modal size="md" open={addOpen} onClose={() => setAddOpen(false)}>
        <ModalHeader onClose={() => setAddOpen(false)}>직원 등록</ModalHeader>
        <ModalBody className="space-y-4">
          <Input
            label="이름"
            required
            placeholder="직원 이름"
            value={addForm.name}
            onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="사번"
            required
            placeholder="EMP001"
            value={addForm.employee_no}
            onChange={e => setAddForm(f => ({ ...f, employee_no: e.target.value }))}
          />
          <Input
            label="연차"
            type="number"
            required
            value={addForm.years_of_experience}
            onChange={e => setAddForm(f => ({ ...f, years_of_experience: Number(e.target.value) }))}
          />
          <Input
            label="권한"
            type="select"
            value={addForm.role}
            onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'employee', label: '직원' },
              { value: 'admin', label: '관리자' },
            ]}
          />
          {addError && <p className="text-sm text-red-500">{addError}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setAddOpen(false)}>취소</Button>
          <Button variant="primary" disabled={addDisabled} loading={addLoading} onClick={handleAdd}>
            등록
          </Button>
        </ModalFooter>
      </Modal>

      {/* 임시 비밀번호 모달 — onClose 없음으로 ESC/백드롭 닫기 차단 */}
      <Modal size="sm" open={!!tempPw}>
        <ModalHeader>⚠ 임시 비밀번호</ModalHeader>
        <ModalBody className="space-y-4">
          <p className="text-sm text-slate-600">{tempPw?.name}님의 임시 비밀번호입니다.</p>
          <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <span className="font-mono font-bold text-lg text-slate-800 break-all">
              {tempPw?.password}
            </span>
            <Button variant="ghost" size="sm" icon={Copy} onClick={handleCopyPassword}>
              복사
            </Button>
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-3 leading-relaxed">
            이 창을 닫으면 다시 볼 수 없습니다.<br />
            직원에게 전달 후 닫아주세요.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleTempPwClose}>확인</Button>
        </ModalFooter>
      </Modal>

      {/* 직원 수정 모달 */}
      <Modal size="md" open={editOpen} onClose={() => setEditOpen(false)}>
        <ModalHeader onClose={() => setEditOpen(false)}>직원 정보 수정</ModalHeader>
        <ModalBody className="space-y-4">
          <Input
            label="사번"
            value={editTarget?.employee_no ?? ''}
            readOnly
            helper="사번은 변경할 수 없습니다"
          />
          <Input
            label="이름"
            required
            value={editForm.name}
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="연차"
            type="number"
            value={editForm.years_of_experience}
            onChange={e => setEditForm(f => ({ ...f, years_of_experience: Number(e.target.value) }))}
          />
          <Input
            label="권한"
            type="select"
            value={editForm.role}
            onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'employee', label: '직원' },
              { value: 'admin', label: '관리자' },
            ]}
          />
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">상태</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${editForm.is_active ? 'bg-blue-500' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editForm.is_active ? 'translate-x-5' : ''}`}
                />
              </button>
              <span className="text-sm text-slate-600">{editForm.is_active ? '재직' : '비활성'}</span>
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEditOpen(false)}>취소</Button>
          <Button variant="primary" loading={editLoading} onClick={handleEdit}>저장</Button>
        </ModalFooter>
      </Modal>

      {/* 비밀번호 초기화 확인 모달 */}
      <Modal size="sm" open={!!resetTarget} onClose={() => setResetTarget(null)}>
        <ModalHeader onClose={() => setResetTarget(null)}>비밀번호 초기화</ModalHeader>
        <ModalBody>
          <p className="text-sm text-slate-700">
            {resetTarget?.name}님의 비밀번호를 초기화하시겠습니까?
          </p>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setResetTarget(null)}>취소</Button>
          <Button variant="danger" loading={resetLoading} onClick={handleReset}>초기화</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
