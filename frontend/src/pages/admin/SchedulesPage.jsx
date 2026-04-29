import { useMemo, useState } from "react";
import {
  Save,
  CheckCircle,
  AlertTriangle,
  Info,
  Lock,
} from "lucide-react";
import {
  activeEmployees,
  aprilSchedules,
  marchSchedules,
  shiftTypes,
  shiftColorMap,
  shiftBgMap,
  scheduleValidations,
} from "../../data/mockData.js";

const DAYS_IN_MONTH = 30;
const DAYS_IN_PREV = 31;
const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

const APRIL_START_DOW = 3;
const MARCH_START_DOW = 0;

function getDayOfWeek(startDow, day) {
  return (startDow + day - 1) % 7;
}

function isWeekend(dow) {
  return dow === 0 || dow === 6;
}

function ShiftCell({
  code,
  onChange,
  isWeekend: weekend,
  readonly = false,
  hasWarning = false,
  isLocked = false,
  disabled = false,
}) {
  const [hover, setHover] = useState(false);

  if (readonly) {
    return (
      <td
        className="border-r border-b border-slate-100 text-center transition-colors"
        style={{
          width: 72,
          height: 44,
          minWidth: 72,
          background: code ? shiftBgMap[code] : "#F8FAFC",
        }}
      >
        {code ? (
          <span
            className="inline-block px-2 py-0.5 rounded-md text-xs font-bold"
            style={{ color: shiftColorMap[code] }}
          >
            {code}
          </span>
        ) : (
          <span className="text-xs text-slate-300">-</span>
        )}
      </td>
    );
  }

  return (
    <td
      className="border-r border-b border-slate-100 p-1 relative"
      style={{
        width: 72,
        height: 44,
        minWidth: 72,
        background: weekend ? "#FAFBFC" : "white",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {(isLocked || disabled) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80">
          <Lock size={12} className="text-slate-400" />
        </div>
      )}

      <select
        value={code || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLocked || disabled}
        className="w-full h-full text-center text-xs font-bold rounded-md border-0 cursor-pointer appearance-none focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all disabled:cursor-not-allowed"
        style={{
          background: code ? shiftBgMap[code] : hover ? "#F1F5F9" : "transparent",
          color: code ? shiftColorMap[code] : "#94A3B8",
        }}
      >
        <option value="">-</option>
        {shiftTypes.map((st) => (
          <option key={st.id} value={st.code}>
            {st.code}
          </option>
        ))}
      </select>

      {hasWarning && (
        <span
          className="absolute top-0.5 right-0.5 z-20 w-2 h-2 rounded-full bg-amber-400"
          title="검증 경고"
        />
      )}
    </td>
  );
}

export default function ScheduleBuilder() {
  const [schedules, setSchedules] = useState(() =>
    JSON.parse(JSON.stringify(aprilSchedules))
  );
  const [prevSchedules] = useState(() =>
    JSON.parse(JSON.stringify(marchSchedules))
  );

  const [showValidation, setShowValidation] = useState(true);
  const [confirmModal, setConfirmModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [activePanel, setActivePanel] = useState("both");

  const warningDays = useMemo(() => {
    return new Set(
      scheduleValidations
        .filter((v) => v.type === "warning")
        .map((v) => `${v.employeeId}-${v.day}`)
    );
  }, []);

  const validationWarningCount = scheduleValidations.filter(
    (v) => v.type === "warning"
  ).length;

  const handleChange = (empId, day, code) => {
    if (confirmed) return;

    setSchedules((prev) => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {}),
        [day]: code,
      },
    }));

    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleConfirm = () => {
    setConfirmed(true);
    setConfirmModal(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getDayHeader = (day, startDow) => {
    const dow = getDayOfWeek(startDow, day);
    const weekend = isWeekend(dow);

    return (
      <th
        key={day}
        className="border-r border-b border-slate-100 text-center py-1"
        style={{
          width: 72,
          minWidth: 72,
          background: weekend ? "#FEF9F0" : "white",
        }}
      >
        <div
          className="text-xs font-semibold"
          style={{
            color:
              dow === 0 ? "#EF4444" : dow === 6 ? "#3B82F6" : "#64748B",
          }}
        >
          {day}
        </div>
        <div
          className="text-xs"
          style={{
            color:
              dow === 0 ? "#FCA5A5" : dow === 6 ? "#93C5FD" : "#CBD5E1",
          }}
        >
          {DAYS_OF_WEEK[dow]}
        </div>
      </th>
    );
  };

  return (
    <div className="space-y-5 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-bold text-slate-800" style={{ fontSize: 24 }}>
            근무표 작성
          </h1>

          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-500 text-sm">
              2026년 4월 · {confirmed ? "확정 완료" : "작성 중"}
            </span>

            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={
                confirmed
                  ? { background: "#ECFDF5", color: "#059669" }
                  : { background: "#FEF3C7", color: "#D97706" }
              }
            >
              {confirmed ? "확정됨" : "초안"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100">
            {[
              ["both", "이전+이번 달"],
              ["prev", "이전 달"],
              ["current", "이번 달"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setActivePanel(value)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={
                  activePanel === value
                    ? {
                        background: "white",
                        color: "#3B82F6",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                      }
                    : { color: "#64748B" }
                }
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={confirmed}
            className="flex items-center gap-2 px-4 py-2 rounded-[14px] text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {saved ? "저장됨" : "저장"}
          </button>

          <button
            onClick={() => setConfirmModal(true)}
            disabled={confirmed}
            className="flex items-center gap-2 px-5 py-2 rounded-[14px] text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#3B82F6" }}
          >
            <CheckCircle size={14} />
            {confirmed ? "확정 완료" : "근무표 확정"}
          </button>
        </div>
      </div>

      {showValidation && scheduleValidations.length > 0 && (
        <div
          className="bg-white rounded-2xl border p-4 space-y-2 shrink-0"
          style={{ borderColor: "#FDE68A", background: "#FFFBEB" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: "#92400E" }}>
              자동 검증 결과
            </span>

            <button
              onClick={() => setShowValidation(false)}
              className="text-xs text-amber-500 hover:text-amber-700"
            >
              닫기
            </button>
          </div>

          {scheduleValidations.map((v, index) => (
            <div
              key={`${v.employeeId || "all"}-${v.day || index}-${index}`}
              className="flex items-start gap-2 text-xs"
              style={{
                color: v.type === "warning" ? "#B45309" : "#1D4ED8",
              }}
            >
              {v.type === "warning" ? (
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              ) : (
                <Info size={13} className="mt-0.5 shrink-0" />
              )}
              <span>{v.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-4 flex-1 overflow-hidden">
        {(activePanel === "both" || activePanel === "prev") && (
          <div
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col"
            style={{
              flex: activePanel === "prev" ? 1 : "0 0 auto",
              width: activePanel === "prev" ? undefined : 520,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <div className="px-4 py-3 border-b border-slate-100 shrink-0 flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">
                3월 근무표
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                참고용 · 읽기 전용
              </span>
            </div>

            <div className="overflow-auto flex-1">
              <table className="border-collapse" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 z-20 border-r border-b border-slate-100 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap"
                      style={{ minWidth: 120 }}
                    >
                      직원
                    </th>
                    {Array.from({ length: DAYS_IN_PREV }, (_, i) =>
                      getDayHeader(i + 1, MARCH_START_DOW)
                    )}
                  </tr>
                </thead>

                <tbody>
                  {activeEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td
                        className="sticky left-0 z-10 bg-white border-r border-b border-slate-100 px-3 py-0 whitespace-nowrap"
                        style={{ minWidth: 120 }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: "#8B5CF6" }}
                          >
                            {emp.name.charAt(0)}
                          </div>
                          <span className="text-xs text-slate-700 font-medium">
                            {emp.name}
                          </span>
                        </div>
                      </td>

                      {Array.from({ length: DAYS_IN_PREV }, (_, i) => (
                        <ShiftCell
                          key={i + 1}
                          code={prevSchedules[emp.id]?.[i + 1] || ""}
                          onChange={() => {}}
                          isWeekend={isWeekend(
                            getDayOfWeek(MARCH_START_DOW, i + 1)
                          )}
                          readonly
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activePanel === "both" || activePanel === "current") && (
          <div
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col flex-1"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          >
            <div className="px-4 py-3 border-b border-slate-100 shrink-0 flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">
                4월 근무표
              </span>

              {confirmed && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "#ECFDF5", color: "#059669" }}
                >
                  확정됨
                </span>
              )}

              <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
                {shiftTypes.map((st) => (
                  <span key={st.id} className="flex items-center gap-1">
                    <span
                      className="w-3 h-3 rounded-sm"
                      style={{ background: st.color }}
                    />
                    {st.code}={st.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="overflow-auto flex-1">
              <table className="border-collapse" style={{ fontSize: 12 }}>
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th
                      className="sticky left-0 z-30 border-r border-b border-slate-100 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap"
                      style={{ minWidth: 140, background: "white" }}
                    >
                      직원 / 날짜
                    </th>

                    {Array.from({ length: DAYS_IN_MONTH }, (_, i) =>
                      getDayHeader(i + 1, APRIL_START_DOW)
                    )}
                  </tr>
                </thead>

                <tbody>
                  {activeEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-blue-50/20">
                      <td className="sticky left-0 z-10 bg-white border-r border-b border-slate-100 px-3 py-0 whitespace-nowrap">
                        <div className="flex items-center gap-2.5 py-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: "#3B82F6" }}
                          >
                            {emp.name.charAt(0)}
                          </div>

                          <div>
                            <div className="text-xs text-slate-700 font-medium">
                              {emp.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {emp.yearsOfExperience}년차
                            </div>
                          </div>
                        </div>
                      </td>

                      {Array.from({ length: DAYS_IN_MONTH }, (_, i) => {
                        const day = i + 1;
                        const dow = getDayOfWeek(APRIL_START_DOW, day);
                        const hasWarning = warningDays.has(`${emp.id}-${day}`);

                        return (
                          <ShiftCell
                            key={day}
                            code={schedules[emp.id]?.[day] || ""}
                            onChange={(code) => handleChange(emp.id, day, code)}
                            isWeekend={isWeekend(dow)}
                            hasWarning={hasWarning}
                            isLocked={false}
                            disabled={confirmed}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "#EFF6FF" }}
            >
              <CheckCircle size={24} style={{ color: "#3B82F6" }} />
            </div>

            <h2
              className="font-bold text-slate-800 mb-2"
              style={{ fontSize: 18 }}
            >
              2026년 4월 근무표 확정
            </h2>

            <p className="text-sm text-slate-500 mb-4">
              월 단위로 일괄 확정됩니다. 확정 후에는 셀 선택이 잠기며,
              관리자가 별도 수정해야 합니다.
            </p>

            {validationWarningCount > 0 && (
              <div
                className="p-3 rounded-xl mb-4 text-xs"
                style={{ background: "#FFFBEB", color: "#B45309" }}
              >
                <AlertTriangle size={13} className="inline mr-1" />
                검증 경고 {validationWarningCount}건이 있습니다. 그래도
                확정하시겠습니까?
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(false)}
                className="flex-1 py-2.5 rounded-[14px] border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                취소
              </button>

              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-[14px] text-white text-sm font-medium transition-all"
                style={{ background: "#3B82F6" }}
              >
                확정하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}