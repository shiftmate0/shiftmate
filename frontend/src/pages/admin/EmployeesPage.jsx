import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Edit2,
  Lock,
  UserX,
  UserCheck,
  X,
  Check,
  Copy,
} from "lucide-react";
import { employees as mockEmployees } from "../../data/mockData.js";

const defaultForm = {
  name: "",
  employeeNo: "",
  department: "",
  email: "",
  phone: "",
  yearsOfExperience: 0,
  role: "employee",
};

function generateTempPassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";

  return Array.from({ length: 10 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

export default function EmployeesPage() {
  const [employeeList, setEmployeeList] = useState(mockEmployees);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [modalMode, setModalMode] = useState(null);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [tempPasswordModal, setTempPasswordModal] = useState(null);

  const filtered = useMemo(() => {
    return employeeList.filter((e) => {
      const keyword = search.trim().toLowerCase();

      const matchSearch =
        !keyword ||
        e.name?.toLowerCase().includes(keyword) ||
        e.employeeNo?.toLowerCase().includes(keyword) ||
        e.department?.toLowerCase().includes(keyword);

      const matchActive =
        filterActive === "all" ||
        (filterActive === "active" ? e.isActive : !e.isActive);

      return matchSearch && matchActive;
    });
  }, [employeeList, search, filterActive]);

  const openAdd = () => {
    setSelectedEmp(null);
    setForm(defaultForm);
    setModalMode("add");
  };

  const openEdit = (emp) => {
    setSelectedEmp(emp);
    setForm({
      name: emp.name || "",
      employeeNo: emp.employeeNo || "",
      department: emp.department || "",
      email: emp.email || "",
      phone: emp.phone || "",
      yearsOfExperience: emp.yearsOfExperience || 0,
      role: emp.role || "employee",
    });
    setModalMode("edit");
  };

  const closeFormModal = () => {
    setModalMode(null);
    setSelectedEmp(null);
    setForm(defaultForm);
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      alert("이름을 입력하세요.");
      return false;
    }

    if (!form.employeeNo.trim()) {
      alert("사번을 입력하세요.");
      return false;
    }

    const duplicated = employeeList.some(
      (emp) =>
        emp.employeeNo === form.employeeNo.trim() &&
        emp.id !== selectedEmp?.id
    );

    if (duplicated) {
      alert("이미 사용 중인 사번입니다.");
      return false;
    }

    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    if (modalMode === "add") {
      const tempPassword = generateTempPassword();

      const newEmployee = {
        id: Date.now(),
        name: form.name.trim(),
        employeeNo: form.employeeNo.trim(),
        department: form.department.trim() || "미지정",
        email: form.email.trim(),
        phone: form.phone.trim(),
        yearsOfExperience: Number(form.yearsOfExperience) || 0,
        role: form.role,
        isActive: true,
        isInitialPassword: true,
      };

      setEmployeeList((prev) => [...prev, newEmployee]);
      closeFormModal();

      setTempPasswordModal({
        title: "직원 등록 완료",
        employeeName: newEmployee.name,
        password: tempPassword,
      });

      return;
    }

    if (modalMode === "edit" && selectedEmp) {
      setEmployeeList((prev) =>
        prev.map((emp) =>
          emp.id === selectedEmp.id
            ? {
                ...emp,
                name: form.name.trim(),
                employeeNo: form.employeeNo.trim(),
                department: form.department.trim() || "미지정",
                email: form.email.trim(),
                phone: form.phone.trim(),
                yearsOfExperience: Number(form.yearsOfExperience) || 0,
                role: form.role,
              }
            : emp
        )
      );

      closeFormModal();
    }
  };

  const handleResetPassword = (emp) => {
    const tempPassword = generateTempPassword();

    setEmployeeList((prev) =>
      prev.map((item) =>
        item.id === emp.id ? { ...item, isInitialPassword: true } : item
      )
    );

    setTempPasswordModal({
      title: "비밀번호 초기화 완료",
      employeeName: emp.name,
      password: tempPassword,
    });
  };

  const handleToggleActive = (emp) => {
    const message = emp.isActive
      ? `${emp.name}님을 비활성화하시겠습니까?`
      : `${emp.name}님을 다시 활성화하시겠습니까?`;

    if (!window.confirm(message)) return;

    setEmployeeList((prev) =>
      prev.map((item) =>
        item.id === emp.id ? { ...item, isActive: !item.isActive } : item
      )
    );
  };

  const handleCopyPassword = async () => {
    if (!tempPasswordModal?.password) return;

    try {
      await navigator.clipboard.writeText(tempPasswordModal.password);
      alert("임시 비밀번호가 복사되었습니다.");
    } catch {
      alert("복사에 실패했습니다. 직접 선택해서 복사하세요.");
    }
  };

  const closeTempPasswordModal = () => {
    setTempPasswordModal(null);
  };

  const roleColors = {
    admin: { bg: "#EFF6FF", text: "#3B82F6" },
    employee: { bg: "#F5F3FF", text: "#8B5CF6" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-slate-800" style={{ fontSize: 24 }}>
            직원 관리
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            직원 등록·수정·비활성화 및 연차 관리
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-white text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "#3B82F6" }}
        >
          <Plus size={16} />
          직원 추가
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름, 사번, 부서 검색"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100">
          {[
            ["all", "전체"],
            ["active", "재직"],
            ["inactive", "비활성"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilterActive(value)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={
                filterActive === value
                  ? {
                      background: "white",
                      color: "#1D4ED8",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }
                  : { color: "#64748B" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <span className="text-sm text-slate-400">{filtered.length}명</span>
      </div>

      <div
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: "#F8FAFC" }}>
              {[
                "사번",
                "이름",
                "부서",
                "권한",
                "연차",
                "상태",
                "계정 상태",
                "작업",
              ].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide first:pl-6 last:pr-6"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filtered.map((emp) => {
              const roleColor = roleColors[emp.role] || roleColors.employee;

              return (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 pl-6 text-sm text-slate-500 font-mono">
                    {emp.employeeNo}
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{
                          background: emp.isActive ? "#3B82F6" : "#CBD5E1",
                        }}
                      >
                        {emp.name?.charAt(0)}
                      </div>

                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {emp.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {emp.email || "-"}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-sm text-slate-600">
                    {emp.department || "미지정"}
                  </td>

                  <td className="px-4 py-3.5">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: roleColor.bg,
                        color: roleColor.text,
                      }}
                    >
                      {emp.role === "admin" ? "관리자" : "직원"}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-sm text-slate-700">
                    {emp.yearsOfExperience}년차
                  </td>

                  <td className="px-4 py-3.5">
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={
                        emp.isActive
                          ? { background: "#ECFDF5", color: "#059669" }
                          : { background: "#F1F5F9", color: "#64748B" }
                      }
                    >
                      {emp.isActive ? "재직" : "비활성"}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    {emp.isInitialPassword ? (
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: "#FEF3C7", color: "#D97706" }}
                      >
                        초기 PW
                      </span>
                    ) : (
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: "#ECFDF5", color: "#059669" }}
                      >
                        정상
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 pr-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(emp)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="수정"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => handleResetPassword(emp)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        title="비밀번호 초기화"
                      >
                        <Lock size={14} />
                      </button>

                      <button
                        onClick={() => handleToggleActive(emp)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                        title={emp.isActive ? "비활성화" : "활성화"}
                      >
                        {emp.isActive ? (
                          <UserX size={14} />
                        ) : (
                          <UserCheck size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-sm text-slate-400"
                >
                  조건에 맞는 직원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalMode && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[520px] shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-800" style={{ fontSize: 18 }}>
                {modalMode === "add" ? "직원 등록" : "직원 정보 수정"}
              </h2>

              <button
                onClick={closeFormModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    이름 *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="직원 이름"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    사번 *
                  </label>
                  <input
                    type="text"
                    value={form.employeeNo}
                    onChange={(e) =>
                      setForm({ ...form, employeeNo: e.target.value })
                    }
                    placeholder="EMP001"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    부서
                  </label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={(e) =>
                      setForm({ ...form, department: e.target.value })
                    }
                    placeholder="서비스팀"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    연차
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.yearsOfExperience}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        yearsOfExperience: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  이메일
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@shiftmate.io"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    연락처
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="010-0000-0000"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    권한
                  </label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white transition-all"
                  >
                    <option value="employee">직원</option>
                    <option value="admin">관리자</option>
                  </select>
                </div>
              </div>

              {modalMode === "add" && (
                <div
                  className="p-3 rounded-xl text-xs leading-relaxed"
                  style={{ background: "#EFF6FF", color: "#1D4ED8" }}
                >
                  등록 완료 후 임시 비밀번호가 1회만 표시됩니다. 창을 닫기
                  전에 반드시 직원에게 전달하세요.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={closeFormModal}
                className="px-5 py-2.5 rounded-[14px] border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>

              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[14px] text-white text-sm font-medium transition-all hover:opacity-90"
                style={{ background: "#3B82F6" }}
              >
                <Check size={15} />
                {modalMode === "add" ? "등록하기" : "저장하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {tempPasswordModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800" style={{ fontSize: 18 }}>
                {tempPasswordModal.title}
              </h2>

              <button
                onClick={closeTempPasswordModal}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-5">
              {tempPasswordModal.employeeName}님의 임시 비밀번호입니다.
            </p>

            <div
              className="p-4 rounded-xl mb-4"
              style={{
                background: "#F8FAFC",
                border: "1px dashed #CBD5E1",
              }}
            >
              <div className="text-xs text-slate-500 mb-1">임시 비밀번호</div>

              <div className="flex items-center justify-between gap-3">
                <div
                  className="font-mono font-bold text-slate-800 break-all"
                  style={{ fontSize: 18 }}
                >
                  {tempPasswordModal.password}
                </div>

                <button
                  onClick={handleCopyPassword}
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                  title="복사"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div
              className="p-3 rounded-xl text-xs leading-relaxed mb-5"
              style={{ background: "#FEF3C7", color: "#92400E" }}
            >
              이 창을 닫으면 임시 비밀번호를 다시 볼 수 없습니다. 직원에게
              전달 후 닫아주세요.
            </div>

            <button
              onClick={closeTempPasswordModal}
              className="w-full py-2.5 rounded-[14px] text-white text-sm font-medium transition-all hover:opacity-90"
              style={{ background: "#3B82F6" }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
