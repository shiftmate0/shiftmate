import { useMemo, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  Shield,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { shiftTypes } from "../../data/mockData.js";

const defaultForm = {
  code: "",
  label: "",
  startTime: "",
  endTime: "",
  color: "#3B82F6",
  isWorkDay: true,
};

const colorPresets = [
  "#3B82F6",
  "#8B5CF6",
  "#1D4ED8",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#14B8A6",
  "#F97316",
  "#6366F1",
];

export default function ShiftTypesPage() {
  const [types, setTypes] = useState(shiftTypes);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState("");

  const sortedTypes = useMemo(() => {
    return [...types].sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return String(a.code).localeCompare(String(b.code));
    });
  }, [types]);

  const openAdd = () => {
    setEditing(null);
    setForm(defaultForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (shiftType) => {
    if (shiftType.isSystem) return;

    setEditing(shiftType);
    setForm({
      code: shiftType.code,
      label: shiftType.label,
      startTime: shiftType.startTime || "",
      endTime: shiftType.endTime || "",
      color: shiftType.color,
      isWorkDay: shiftType.isWorkDay,
    });
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(defaultForm);
    setError("");
  };

  const validateForm = () => {
    const code = form.code.trim().toUpperCase();
    const label = form.label.trim();

    if (!code) return "근무 코드를 입력해주세요.";
    if (!label) return "표시 이름을 입력해주세요.";
    if (code === "OFF" || code === "VAC") {
      return "OFF와 VAC는 시스템 예약 코드이므로 직접 추가하거나 수정할 수 없습니다.";
    }

    const duplicated = types.some((item) => {
      if (editing && item.id === editing.id) return false;
      return item.code.toUpperCase() === code;
    });

    if (duplicated) return "이미 사용 중인 근무 코드입니다.";

    if (form.isWorkDay && (!form.startTime || !form.endTime)) {
      return "근무일로 설정한 경우 시작 시간과 종료 시간을 입력해주세요.";
    }

    return "";
  };

  const handleSave = () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    const normalizedForm = {
      code: form.code.trim().toUpperCase(),
      label: form.label.trim(),
      startTime: form.isWorkDay ? form.startTime || null : null,
      endTime: form.isWorkDay ? form.endTime || null : null,
      color: form.color,
      isWorkDay: form.isWorkDay,
    };

    if (editing) {
      setTypes((prev) =>
        prev.map((item) =>
          item.id === editing.id ? { ...item, ...normalizedForm } : item
        )
      );
    } else {
      setTypes((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...normalizedForm,
          isSystem: false,
        },
      ]);
    }

    closeModal();
  };

  const handleDelete = () => {
    if (!deleteConfirm || deleteConfirm.isSystem) return;

    setTypes((prev) => prev.filter((item) => item.id !== deleteConfirm.id));
    setDeleteConfirm(null);
  };

  const updateForm = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
    setError("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-bold text-slate-800" style={{ fontSize: 24 }}>
            근무 유형 관리
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            근무 코드, 표시 이름, 시간, 캘린더 색상을 관리합니다.
          </p>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="flex items-center justify-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: "#3B82F6" }}
        >
          <Plus size={16} />
          근무 유형 추가
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {sortedTypes.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
            style={{
              background: `${item.color}15`,
              borderColor: `${item.color}40`,
              color: item.color,
            }}
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: item.color }}
            />
            {item.code} · {item.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sortedTypes.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm lg:flex-row lg:items-center"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          >
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-bold text-white"
              style={{ background: item.color, fontSize: 18 }}
            >
              {item.code}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className="font-semibold text-slate-800"
                  style={{ fontSize: 16 }}
                >
                  {item.label}
                </span>

                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={
                    item.isSystem
                      ? { background: "#F1F5F9", color: "#64748B" }
                      : { background: `${item.color}20`, color: item.color }
                  }
                >
                  {item.code}
                </span>

                {item.isSystem && (
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
                    style={{ background: "#F1F5F9", color: "#94A3B8" }}
                  >
                    <Shield size={11} />
                    예약 코드
                  </span>
                )}

                {item.isWorkDay ? (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs"
                    style={{ background: "#EFF6FF", color: "#3B82F6" }}
                  >
                    근무일
                  </span>
                ) : (
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs"
                    style={{ background: "#F1F5F9", color: "#64748B" }}
                  >
                    비근무일
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                {item.startTime && item.endTime ? (
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} />
                    {item.startTime} ~ {item.endTime}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">시간 없음</span>
                )}

                <span className="flex items-center gap-1.5 text-xs">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: item.color }}
                  />
                  {item.color}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {!item.isSystem ? (
                <>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Edit2 size={14} />
                    수정
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(item)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-400 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                    삭제
                  </button>
                </>
              ) : (
                <span className="px-3 py-2 text-xs text-slate-400">
                  수정·삭제 불가
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-2xl p-4 text-sm"
        style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
      >
        <p className="mb-1 font-medium text-blue-700">근무 코드 안내</p>
        <p className="text-xs leading-relaxed text-blue-600">
          OFF와 VAC는 시스템 예약 코드입니다. 동일 코드는 중복 등록할 수
          없으며, 실제 백엔드 연결 후에는 사용 중인 근무 코드는 삭제할 수
          없도록 처리해야 합니다.
        </p>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-bold text-slate-800" style={{ fontSize: 18 }}>
                {editing ? "근무 유형 수정" : "근무 유형 추가"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    근무 코드 *
                  </label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(event) =>
                      updateForm("code", event.target.value.toUpperCase())
                    }
                    placeholder="예: D, E, N"
                    maxLength={5}
                    disabled={Boolean(editing)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    표시 이름 *
                  </label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(event) => updateForm("label", event.target.value)}
                    placeholder="예: 주간, 야간"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    시작 시간
                  </label>
                  <input
                    type="time"
                    value={form.startTime}
                    disabled={!form.isWorkDay}
                    onChange={(event) =>
                      updateForm("startTime", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    종료 시간
                  </label>
                  <input
                    type="time"
                    value={form.endTime}
                    disabled={!form.isWorkDay}
                    onChange={(event) =>
                      updateForm("endTime", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  캘린더 색상
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap gap-2">
                    {colorPresets.map((color) => (
                      <button
                        type="button"
                        key={color}
                        onClick={() => updateForm("color", color)}
                        className="h-7 w-7 rounded-full border-2 transition-all"
                        style={{
                          background: color,
                          borderColor:
                            form.color === color ? "#1D4ED8" : "transparent",
                        }}
                      />
                    ))}
                  </div>

                  <input
                    type="color"
                    value={form.color}
                    onChange={(event) => updateForm("color", event.target.value)}
                    className="h-8 w-8 cursor-pointer rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    const nextValue = !form.isWorkDay;
                    setForm((prev) => ({
                      ...prev,
                      isWorkDay: nextValue,
                      startTime: nextValue ? prev.startTime : "",
                      endTime: nextValue ? prev.endTime : "",
                    }));
                    setError("");
                  }}
                  className="flex items-center gap-2.5"
                >
                  <span
                    className="relative h-5 w-10 rounded-full transition-all"
                    style={{
                      background: form.isWorkDay ? "#3B82F6" : "#CBD5E1",
                    }}
                  >
                    <span
                      className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
                      style={{
                        left: form.isWorkDay ? "22px" : "2px",
                      }}
                    />
                  </span>

                  <span className="text-sm font-medium text-slate-700">
                    근무일로 설정
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-[14px] border border-slate-200 px-5 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
              >
                취소
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ background: "#3B82F6" }}
              >
                <Check size={15} />
                {editing ? "저장" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="mb-2 font-bold text-slate-800" style={{ fontSize: 18 }}>
              근무 유형 삭제
            </h2>

            <p className="mb-5 text-sm leading-relaxed text-slate-500">
              <strong className="text-slate-700">
                {deleteConfirm.label}({deleteConfirm.code})
              </strong>
              을 삭제하시겠습니까?
              <br />
              실제 서버 연결 후에는 해당 코드를 사용하는 스케줄이 있으면 삭제할
              수 없습니다.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-[14px] border border-slate-200 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50"
              >
                취소
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 rounded-[14px] py-2.5 text-sm font-medium text-white"
                style={{ background: "#EF4444" }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}