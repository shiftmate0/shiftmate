import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import apiClient from "../../api/client";

const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

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

function ReadOnlyCell({ code, isWeekend: weekend, shiftColorMap, shiftBgMap }) {
  return (
    <td
      className="border-r border-b border-slate-100 text-center"
      style={{
        width: 72,
        height: 44,
        minWidth: 72,
        background: code ? shiftBgMap[code] : weekend ? "#FAFBFC" : "#F8FAFC",
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

export default function ScheduleViewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const year  = parseInt(searchParams.get("year"))  || new Date().getFullYear();
  const month = parseInt(searchParams.get("month")) || new Date().getMonth() + 1;

  const daysInMonth  = new Date(year, month, 0).getDate();
  const monthStartDow = new Date(year, month - 1, 1).getDay();

  const [employees,     setEmployees]     = useState([]);
  const [shiftTypeList, setShiftTypeList] = useState([]);
  const [schedules,     setSchedules]     = useState({});
  const [periodStatus,  setPeriodStatus]  = useState("draft");
  const [loading,       setLoading]       = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [empRes, stRes, schedRes] = await Promise.all([
          apiClient.get("/admin/employees"),
          apiClient.get("/admin/shift-types"),
          apiClient.get("/schedules", { params: { year, month } }),
        ]);
        setEmployees((empRes.data || []).filter((e) => e.is_active && e.role === "employee"));
        setShiftTypeList(stRes.data || []);
        setPeriodStatus(schedRes.data.period_status || "draft");
        setSchedules(buildScheduleMap(schedRes.data.schedules || []));
      } catch (err) {
        console.error("근무표 조회 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year, month]);

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

  const confirmed = periodStatus === "confirmed";

  const navigate = (delta) => {
    const d = new Date(year, month - 1 + delta, 1);
    setSearchParams({ year: d.getFullYear(), month: d.getMonth() + 1 });
  };

  const getDayHeader = (day) => {
    const dow = getDayOfWeek(monthStartDow, day);
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

  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-bold text-slate-800" style={{ fontSize: 24 }}>
            근무표 조회
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-slate-500 text-sm">
              {year}년 {month}월 · 전체 직원 · 읽기 전용
            </span>
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={
                confirmed
                  ? { background: "#ECFDF5", color: "#059669" }
                  : { background: "#FEF3C7", color: "#D97706" }
              }
            >
              {confirmed ? "확정됨" : "미확정"}
            </span>
          </div>
        </div>

        {/* 월 이동 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-[14px] text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            ← 이전 달
          </button>
          <span className="text-sm font-semibold text-slate-700 px-2">
            {year}년 {month}월
          </span>
          <button
            onClick={() => navigate(1)}
            className="px-4 py-2 rounded-[14px] text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            다음 달 →
          </button>
        </div>
      </div>

      {/* 그리드 */}
      <div
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col flex-1"
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
      >
        {/* 테이블 헤더 바 */}
        <div className="px-4 py-3 border-b border-slate-100 shrink-0 flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">
            {year}년 {month}월 근무표
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

        {/* 테이블 본체 */}
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
            <p className="text-base">등록된 직원이 없습니다</p>
          </div>
        ) : (
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
                  {Array.from({ length: daysInMonth }, (_, i) => getDayHeader(i + 1))}
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
                          <div className="text-xs text-slate-700 font-medium">{emp.name}</div>
                          <div className="text-xs text-slate-400">{emp.years_of_experience}년차</div>
                        </div>
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const dow = getDayOfWeek(monthStartDow, day);
                      return (
                        <ReadOnlyCell
                          key={day}
                          code={schedules[emp.user_id]?.[day] || ""}
                          isWeekend={isWeekend(dow)}
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
        )}
      </div>
    </div>
  );
}
