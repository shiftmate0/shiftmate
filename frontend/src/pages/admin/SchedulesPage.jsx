import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import apiClient from "../../api/client";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "moment/locale/ko";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  Save,
  CheckCircle,
  AlertTriangle,
  Lock,
} from "lucide-react";

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

moment.locale("ko");
const localizer = momentLocalizer(moment);
const DAY_NAMES_KO = ["일", "월", "화", "수", "목", "금", "토"];

function getDayOfWeek(startDow, day) {
  return (startDow + day - 1) % 7;
}

function isWeekend(dow) {
  return dow === 0 || dow === 6;
}

function buildScheduleMap(scheduleList) {
  const map = {};
  scheduleList.forEach((s) => {
    const day = new Date(s.work_date + "T00:00:00").getDate();
    if (!map[s.user_id]) map[s.user_id] = {};
    map[s.user_id][day] = s.shift_code;
  });
  return map;
}

function buildLockMap(scheduleList) {
  const map = {};
  scheduleList.forEach((s) => {
    if (!s.is_locked) return;
    const day = new Date(s.work_date + "T00:00:00").getDate();
    if (!map[s.user_id]) map[s.user_id] = {};
    map[s.user_id][day] = true;
  });
  return map;
}

function ShiftCell({
  code,
  onChange,
  isWeekend: weekend,
  readonly = false,
  hasWarning = false,
  isLocked = false,
  disabled = false,
  shiftTypes = [],
  shiftColorMap = {},
  shiftBgMap = {},
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
        <div className="absolute top-0.5 right-0.5 z-10">
          <Lock size={10} className="text-slate-400" />
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
          <option key={st.shift_type_id} value={st.code}>
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

export default function SchedulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "grid";
  const urlYear  = parseInt(searchParams.get("year"))  || new Date().getFullYear();
  const urlMonth = parseInt(searchParams.get("month")) || new Date().getMonth() + 1;

  const prevMonth = urlMonth === 1 ? 12 : urlMonth - 1;
  const prevYear  = urlMonth === 1 ? urlYear - 1 : urlYear;
  const nextMonth = urlMonth === 12 ? 1 : urlMonth + 1;
  const nextYear  = urlMonth === 12 ? urlYear + 1 : urlYear;
  const daysInMonth     = new Date(urlYear, urlMonth, 0).getDate();
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
  const monthStartDow     = new Date(urlYear, urlMonth - 1, 1).getDay();
  const prevMonthStartDow = new Date(prevYear, prevMonth - 1, 1).getDay();

  const [employees,    setEmployees]    = useState([]);
  const [shiftTypeList, setShiftTypeList] = useState([]);
  const [schedules,    setSchedules]    = useState({});
  const [prevSchedules, setPrevSchedules] = useState({});
  const [lockedCells,  setLockedCells]  = useState({});
  const [periodStatus, setPeriodStatus] = useState("draft");
  const [validations,  setValidations]  = useState([]);

  const [showValidation, setShowValidation] = useState(true);
  const [confirmModal,   setConfirmModal]   = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [activePanel,    setActivePanel]    = useState("both");
  const [saving,         setSaving]         = useState(false);
  const [confirming,     setConfirming]     = useState(false);

  const confirmed = periodStatus === "confirmed";

  const shiftColorMap = useMemo(() => {
    const m = {};
    shiftTypeList.forEach((st) => { m[st.code] = st.color; });
    return m;
  }, [shiftTypeList]);

  const shiftBgMap = useMemo(() => {
    const m = {};
    shiftTypeList.forEach((st) => { m[st.code] = st.color + "20"; });
    return m;
  }, [shiftTypeList]);

  const codeToTypeId = useMemo(() => {
    const m = {};
    shiftTypeList.forEach((st) => { m[st.code] = st.shift_type_id; });
    return m;
  }, [shiftTypeList]);

  useEffect(() => {
    fetchAll();
  }, [urlYear, urlMonth]);

  async function fetchAll() {
    try {
      const [empRes, stRes, schedRes, prevSchedRes] = await Promise.all([
        apiClient.get("/admin/employees"),
        apiClient.get("/admin/shift-types"),
        apiClient.get("/schedules", { params: { year: urlYear, month: urlMonth } }),
        apiClient.get("/schedules", { params: { year: prevYear, month: prevMonth } }),
      ]);
      setEmployees((empRes.data || []).filter((e) => e.is_active));
      setShiftTypeList(stRes.data || []);
      setPeriodStatus(schedRes.data.period_status || "draft");
      setSchedules(buildScheduleMap(schedRes.data.schedules || []));
      setLockedCells(buildLockMap(schedRes.data.schedules || []));
      setPrevSchedules(buildScheduleMap(prevSchedRes.data.schedules || []));
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    }
    fetchValidations();
  }

  async function fetchValidations() {
    try {
      const res = await apiClient.get("/admin/schedules/validate", {
        params: { year: urlYear, month: urlMonth },
      });
      setValidations(res.data.warnings || []);
    } catch {
      setValidations([]);
    }
  }

  const warningDays = useMemo(() => {
    const s = new Set();
    validations.forEach((v) => {
      if (!v.affected_date) return;
      const day = new Date(v.affected_date + "T00:00:00").getDate();
      if (v.affected_user_name) {
        const emp = employees.find((e) => e.name === v.affected_user_name);
        if (emp) s.add(`${emp.user_id}-${day}`);
      } else {
        employees.forEach((emp) => s.add(`${emp.user_id}-${day}`));
      }
    });
    return s;
  }, [validations, employees]);

  const handleChange = (userId, day, code) => {
    setSchedules((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] || {}), [day]: code },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const items = [];
      employees.forEach((emp) => {
        for (let day = 1; day <= daysInMonth; day++) {
          const code = schedules[emp.user_id]?.[day];
          if (code) {
            const stId = codeToTypeId[code];
            if (stId) {
              items.push({
                user_id: emp.user_id,
                work_date: `${urlYear}-${String(urlMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                shift_type_id: stId,
              });
            }
          }
        }
      });
      await apiClient.post("/admin/schedules/bulk", items);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (confirmed) setPeriodStatus("draft");
      fetchValidations();
    } catch (err) {
      console.error("저장 실패:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await apiClient.post(`/admin/schedules/${urlYear}/${urlMonth}/confirm`);
      setPeriodStatus("confirmed");
      setConfirmModal(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("확정 실패:", err);
    } finally {
      setConfirming(false);
    }
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
          style={{ color: dow === 0 ? "#EF4444" : dow === 6 ? "#3B82F6" : "#64748B" }}
        >
          {day}
        </div>
        <div
          className="text-xs"
          style={{ color: dow === 0 ? "#FCA5A5" : dow === 6 ? "#93C5FD" : "#CBD5E1" }}
        >
          {DAYS_OF_WEEK[dow]}
        </div>
      </th>
    );
  };

  if (view === "calendar") {
    return (
      <CalendarView
        year={urlYear}
        month={urlMonth}
        setSearchParams={setSearchParams}
      />
    );
  }

  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* 그리드 / 캘린더 탭 전환 */}
      <div style={{ display: "flex", gap: 4 }}>
        <button
          onClick={() => setSearchParams({ year: urlYear, month: urlMonth, view: "grid" })}
          style={{
            padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: "white", color: "#3B82F6", fontWeight: 600, fontSize: 13,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          그리드
        </button>
        <button
          onClick={() => setSearchParams({ year: urlYear, month: urlMonth, view: "calendar" })}
          style={{
            padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: "#F1F5F9", color: "#64748B", fontWeight: 600, fontSize: 13,
          }}
        >
          캘린더
        </button>
      </div>

      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-bold text-slate-800" style={{ fontSize: 24 }}>
            근무표 작성
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => setSearchParams({ year: prevYear, month: prevMonth, view: "grid" })}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              style={{ fontSize: 16, lineHeight: 1, padding: "2px 6px" }}
            >
              ←
            </button>
            <span className="text-slate-500 text-sm">
              {urlYear}년 {urlMonth}월 · {confirmed ? "확정 완료" : "작성 중"}
            </span>
            <button
              onClick={() => setSearchParams({ year: nextYear, month: nextMonth, view: "grid" })}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              style={{ fontSize: 16, lineHeight: 1, padding: "2px 6px" }}
            >
              →
            </button>
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
                    ? { background: "white", color: "#3B82F6", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                    : { color: "#64748B" }
                }
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-[14px] text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={14} />
            {saving ? "저장 중..." : saved ? "저장됨" : "저장"}
          </button>

          <button
            onClick={() => setConfirmModal(true)}
            disabled={confirmed || confirming}
            className="flex items-center gap-2 px-5 py-2 rounded-[14px] text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "#3B82F6" }}
          >
            <CheckCircle size={14} />
            {confirmed ? "확정 완료" : "근무표 확정"}
          </button>
        </div>
      </div>

      {showValidation && validations.length > 0 && (
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
          {validations.map((v, index) => (
            <div
              key={index}
              className="flex items-start gap-2 text-xs"
              style={{ color: "#B45309" }}
            >
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
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
                {prevYear}년 {prevMonth}월 근무표
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
                    {Array.from({ length: daysInPrevMonth }, (_, i) =>
                      getDayHeader(i + 1, prevMonthStartDow)
                    )}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.user_id} className="hover:bg-slate-50/50">
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
                      {Array.from({ length: daysInPrevMonth }, (_, i) => (
                        <ShiftCell
                          key={i + 1}
                          code={prevSchedules[emp.user_id]?.[i + 1] || ""}
                          onChange={() => {}}
                          isWeekend={isWeekend(getDayOfWeek(prevMonthStartDow, i + 1))}
                          readonly
                          shiftColorMap={shiftColorMap}
                          shiftBgMap={shiftBgMap}
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
                {urlYear}년 {urlMonth}월 근무표
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
                {shiftTypeList.map((st) => (
                  <span key={st.shift_type_id} className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm" style={{ background: st.color }} />
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
                    {Array.from({ length: daysInMonth }, (_, i) =>
                      getDayHeader(i + 1, monthStartDow)
                    )}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.user_id} className="hover:bg-blue-50/20">
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
                              {emp.years_of_experience}년차
                            </div>
                          </div>
                        </div>
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const dow = getDayOfWeek(monthStartDow, day);
                        return (
                          <ShiftCell
                            key={day}
                            code={schedules[emp.user_id]?.[day] || ""}
                            onChange={(code) => handleChange(emp.user_id, day, code)}
                            isWeekend={isWeekend(dow)}
                            hasWarning={warningDays.has(`${emp.user_id}-${day}`)}
                            isLocked={lockedCells[emp.user_id]?.[day] || false}
                            shiftTypes={shiftTypeList}
                            shiftColorMap={shiftColorMap}
                            shiftBgMap={shiftBgMap}
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
            <h2 className="font-bold text-slate-800 mb-2" style={{ fontSize: 18 }}>
              {urlYear}년 {urlMonth}월 근무표 확정
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              월 단위로 일괄 확정됩니다. 확정 후에도 수정 후 저장하면
              재확정할 수 있습니다.
            </p>
            {validations.length > 0 && (
              <div
                className="p-3 rounded-xl mb-4 text-xs"
                style={{ background: "#FFFBEB", color: "#B45309" }}
              >
                <AlertTriangle size={13} className="inline mr-1" />
                검증 경고 {validations.length}건이 있습니다. 그래도 확정하시겠습니까?
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
                disabled={confirming}
                className="flex-1 py-2.5 rounded-[14px] text-white text-sm font-medium transition-all disabled:opacity-50"
                style={{ background: "#3B82F6" }}
              >
                {confirming ? "처리 중..." : "확정하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 캘린더 탭 — 사용자3(멤버2) 담당
// ════════════════════════════════════════════════════════
function CalendarView({ year, month, setSearchParams }) {
  const [periodStatus, setPeriodStatus] = useState("draft");
  const [rawSchedules, setRawSchedules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedShift, setSelectedShift] = useState("");
  const [loading, setLoading] = useState(false);
  const [popover, setPopover] = useState(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [schedRes, empRes, stRes] = await Promise.all([
          apiClient.get("/schedules", { params: { year, month } }),
          apiClient.get("/admin/employees"),
          apiClient.get("/admin/shift-types"),
        ]);
        setPeriodStatus(schedRes.data.period_status);
        setRawSchedules(schedRes.data.schedules || []);
        setEmployees(empRes.data || []);
        setShiftTypes(stRes.data || []);
      } catch (err) {
        console.error("캘린더 데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year, month]);

  const empMap = useMemo(() => {
    const m = {};
    employees.forEach((e) => { m[e.user_id] = e.name; });
    return m;
  }, [employees]);

  const allEvents = useMemo(() =>
    rawSchedules.map((s) => ({
      id: s.schedule_id,
      title: `${empMap[s.user_id] ?? "?"} ${s.shift_code}`,
      start: new Date(s.work_date + "T00:00:00"),
      end: new Date(s.work_date + "T00:00:00"),
      allDay: true,
      color: s.shift_color,
      userId: s.user_id,
      shiftCode: s.shift_code,
      shiftLabel: s.shift_label,
      workDate: s.work_date,
    })),
    [rawSchedules, empMap]
  );

  const filteredEvents = useMemo(() =>
    allEvents
      .filter((e) => !selectedUser || e.userId === parseInt(selectedUser))
      .filter((e) => !selectedShift || e.shiftCode === selectedShift),
    [allEvents, selectedUser, selectedShift]
  );

  const eventPropGetter = useCallback((event) => ({
    style: {
      backgroundColor: event.color,
      borderColor: event.color,
      color: "#ffffff",
      borderRadius: "4px",
      fontSize: "11px",
      padding: "1px 4px",
    },
  }), []);

  const dayPropGetter = useCallback((date) => {
    const isToday = date.toDateString() === new Date().toDateString();
    const dow = date.getDay();
    if (isToday) return { style: { backgroundColor: "#EFF6FF", border: "1px solid #3B82F6" } };
    if (dow === 6) return { style: { backgroundColor: "#F8FAFC" } };
    if (dow === 0) return { style: { backgroundColor: "#FFF5F5" } };
    return {};
  }, []);

  const handleNavigate = useCallback((newDate) => {
    setSearchParams({ year: newDate.getFullYear(), month: newDate.getMonth() + 1, view: "calendar" });
  }, [setSearchParams]);

  const openPopover = useCallback((date) => {
    const dateStr = new Date(date).toISOString().split("T")[0];
    const daySchedules = rawSchedules.filter((s) => s.work_date === dateStr);
    setPopover({ date, daySchedules });
  }, [rawSchedules]);

  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopover(null);
      }
    };
    if (popover) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popover]);

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES_KO[d.getDay()]})`;
  };

  const calDate = new Date(year, month - 1, 1);

  return (
    <div>
      {/* 그리드 / 캘린더 탭 전환 */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        <button
          onClick={() => setSearchParams({ year, month, view: "grid" })}
          style={{
            padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: "#F1F5F9", color: "#64748B", fontWeight: 600, fontSize: 13,
          }}
        >
          그리드
        </button>
        <button
          style={{
            padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: "white", color: "#3B82F6", fontWeight: 600, fontSize: 13,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          캘린더
        </button>
      </div>

      {/* 미확정 배너 */}
      {periodStatus === "draft" && (
        <div style={{
          background: "#FEF3C7", borderLeft: "4px solid #D97706",
          padding: "12px 16px", borderRadius: 8, marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          color: "#D97706", fontSize: 14, fontWeight: 500,
        }}>
          <span>⚠ {year}년 {month}월 근무표는 아직 미확정입니다.</span>
          <button
            onClick={() => setSearchParams({ year, month, view: "grid" })}
            style={{
              background: "transparent", border: "1px solid #D97706",
              borderRadius: 6, padding: "4px 10px",
              color: "#D97706", cursor: "pointer", fontSize: 13, fontWeight: 600,
            }}
          >
            근무표 작성으로 이동 →
          </button>
        </div>
      )}

      {/* 필터 행 */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          style={{
            padding: "6px 12px", borderRadius: 8,
            border: "1px solid #E5E7EB", fontSize: 13, color: "#374151",
          }}
        >
          <option value="">전체 직원</option>
          {employees.map((e) => (
            <option key={e.user_id} value={e.user_id}>{e.name}</option>
          ))}
        </select>
        <select
          value={selectedShift}
          onChange={(e) => setSelectedShift(e.target.value)}
          style={{
            padding: "6px 12px", borderRadius: 8,
            border: "1px solid #E5E7EB", fontSize: 13, color: "#374151",
          }}
        >
          <option value="">전체 유형</option>
          {shiftTypes.map((st) => (
            <option key={st.shift_type_id} value={st.code}>{st.code} — {st.label}</option>
          ))}
        </select>
      </div>

      {/* 캘린더 본체 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#6B7280" }}>불러오는 중...</div>
      ) : rawSchedules.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#6B7280", fontSize: 15 }}>
          이번 달 근무표가 아직 작성되지 않았습니다
        </div>
      ) : (
        <div style={{ height: 650 }}>
          <Calendar
            localizer={localizer}
            events={filteredEvents}
            defaultView={Views.MONTH}
            views={[Views.MONTH]}
            date={calDate}
            onNavigate={handleNavigate}
            eventPropGetter={eventPropGetter}
            dayPropGetter={dayPropGetter}
            selectable
            onSelectSlot={({ start }) => openPopover(start)}
            onSelectEvent={(event) => openPopover(event.start)}
            style={{ borderRadius: 12 }}
            messages={{ next: "다음 달", previous: "이전 달", today: "이번 달", month: "월" }}
          />
        </div>
      )}

      {/* 날짜 클릭 팝오버 */}
      {popover && (
        <div
          ref={popoverRef}
          style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#fff", borderRadius: 12, padding: 20,
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
            zIndex: 9999, minWidth: 260, maxHeight: "60vh", overflowY: "auto",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 12, color: "#111827", fontSize: 15 }}>
            {formatDate(popover.date)}
          </div>
          {popover.daySchedules.length === 0 ? (
            <div style={{ color: "#6B7280", fontSize: 14 }}>근무 없음</div>
          ) : (
            <>
              {popover.daySchedules.map((s) => (
                <div key={s.schedule_id} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "6px 0", borderBottom: "1px solid #F3F4F6", fontSize: 14,
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 3,
                    backgroundColor: s.shift_color, flexShrink: 0,
                  }} />
                  <span style={{ color: "#374151", flex: 1 }}>{empMap[s.user_id] ?? "?"}</span>
                  <span style={{ fontWeight: 600, color: "#111827" }}>
                    {s.shift_code} {s.shift_label}
                  </span>
                </div>
              ))}
              <div style={{ marginTop: 10, fontSize: 13, color: "#6B7280" }}>
                근무 인원: {popover.daySchedules.length}명
              </div>
            </>
          )}
          <button
            onClick={() => setPopover(null)}
            style={{
              marginTop: 12, width: "100%", padding: "6px 0",
              borderRadius: 6, border: "1px solid #E5E7EB",
              background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 13,
            }}
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
