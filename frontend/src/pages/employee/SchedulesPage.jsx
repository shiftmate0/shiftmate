import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "moment/locale/ko";
import "react-big-calendar/lib/css/react-big-calendar.css";
import apiClient from "../../api/client";

moment.locale("ko");
const localizer = momentLocalizer(moment);
const DAY_NAMES_KO = ["일", "월", "화", "수", "목", "금", "토"];

// ── 그리드 헬퍼 ───────────────────────────────────────
const DAYS_OF_WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function getDayOfWeek(startDow, day) {
  return (startDow + day - 1) % 7;
}

function isWeekend(dow) {
  return dow === 0 || dow === 6;
}

function buildScheduleMap(list) {
  const map = {};
  list.forEach((s) => {
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

// ── 탭 스타일 ─────────────────────────────────────────
const activeTab = {
  padding: "6px 20px", borderRadius: 8, border: "none", cursor: "pointer",
  background: "white", color: "#3B82F6", fontWeight: 700, fontSize: 13,
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};
const inactiveTab = {
  padding: "6px 20px", borderRadius: 8, border: "none", cursor: "pointer",
  background: "transparent", color: "#64748B", fontWeight: 600, fontSize: 13,
};

// ── 메인 컴포넌트 ─────────────────────────────────────
export default function SchedulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const year  = parseInt(searchParams.get("year"))  || new Date().getFullYear();
  const month = parseInt(searchParams.get("month")) || new Date().getMonth() + 1;
  const tab   = searchParams.get("tab") || "mine";

  // 그리드 계산
  const daysInMonth   = new Date(year, month, 0).getDate();
  const monthStartDow = new Date(year, month - 1, 1).getDay();

  // ── 내 근무표 state ──────────────────────────────────
  const [mySchedules,  setMySchedules]  = useState([]);
  const [shiftTimeMap, setShiftTimeMap] = useState({});
  const [myLoading,    setMyLoading]    = useState(false);
  const [popover,      setPopover]      = useState(null);
  const popoverRef = useRef(null);

  // ── 전체 근무표 state ────────────────────────────────
  const [allScheduleList, setAllScheduleList] = useState([]);
  const [periodStatus,    setPeriodStatus]    = useState("draft");
  const [allLoading,      setAllLoading]      = useState(false);

  // 전체 근무표 파생 데이터 (스케줄 응답에서 직접 추출)
  const allScheduleMap = useMemo(() => buildScheduleMap(allScheduleList), [allScheduleList]);

  const allEmployees = useMemo(() => {
    const seen = {};
    allScheduleList.forEach((s) => {
      if (!seen[s.user_id]) seen[s.user_id] = { user_id: s.user_id, name: s.user_name };
    });
    return Object.values(seen).sort((a, b) => a.user_id - b.user_id);
  }, [allScheduleList]);

  const shiftColorMap = useMemo(() => {
    const m = {};
    allScheduleList.forEach((s) => { if (!m[s.shift_code]) m[s.shift_code] = s.shift_color; });
    return m;
  }, [allScheduleList]);

  const shiftBgMap = useMemo(() => {
    const m = {};
    allScheduleList.forEach((s) => { if (!m[s.shift_code]) m[s.shift_code] = s.shift_color + "20"; });
    return m;
  }, [allScheduleList]);

  const shiftLegend = useMemo(() => {
    const seen = new Set();
    return allScheduleList
      .filter((s) => { if (seen.has(s.shift_code)) return false; seen.add(s.shift_code); return true; })
      .map((s) => ({ code: s.shift_code, label: s.shift_label, color: s.shift_color }));
  }, [allScheduleList]);

  // ── 내 근무표 로드 ───────────────────────────────────
  useEffect(() => {
    apiClient.get("/admin/shift-types")
      .then((res) => {
        const map = {};
        (res.data || []).forEach((st) => {
          if (st.start_time) map[st.code] = { start: st.start_time, end: st.end_time };
        });
        setShiftTimeMap(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const load = async () => {
      setMyLoading(true);
      try {
        const res = await apiClient.get("/schedules/me", { params: { year, month } });
        setMySchedules(res.data.schedules || []);
      } catch (err) {
        console.error("내 근무표 로드 실패:", err);
      } finally {
        setMyLoading(false);
      }
    };
    load();
  }, [year, month]);

  // ── 전체 근무표 로드 (탭 활성 시에만) ─────────────────
  useEffect(() => {
    if (tab !== "all") return;
    const load = async () => {
      setAllLoading(true);
      try {
        const res = await apiClient.get("/schedules", { params: { year, month } });
        setPeriodStatus(res.data.period_status || "draft");
        setAllScheduleList(res.data.schedules || []);
      } catch (err) {
        console.error("전체 근무표 로드 실패:", err);
      } finally {
        setAllLoading(false);
      }
    };
    load();
  }, [year, month, tab]);

  // ── 캘린더 이벤트 변환 ───────────────────────────────
  const events = useMemo(() =>
    mySchedules.map((s) => ({
      id:         s.schedule_id,
      title:      `${s.shift_code} ${s.shift_label}`,
      start:      new Date(s.work_date + "T00:00:00"),
      end:        new Date(s.work_date + "T00:00:00"),
      allDay:     true,
      color:      s.shift_color,
      shiftCode:  s.shift_code,
      shiftLabel: s.shift_label,
      workDate:   s.work_date,
    })),
    [mySchedules]
  );

  const eventPropGetter = useCallback((event) => ({
    style: {
      backgroundColor: event.color,
      borderColor:     event.color,
      color:           "#ffffff",
      borderRadius:    "4px",
      fontSize:        "11px",
      padding:         "1px 4px",
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

  // ── 월 이동 (탭 유지) ────────────────────────────────
  const navigate = useCallback((delta) => {
    const d = new Date(year, month - 1 + delta, 1);
    setSearchParams({ year: d.getFullYear(), month: d.getMonth() + 1, tab });
  }, [year, month, tab, setSearchParams]);

  const handleCalendarNavigate = useCallback((newDate) => {
    setSearchParams({ year: newDate.getFullYear(), month: newDate.getMonth() + 1, tab });
  }, [tab, setSearchParams]);

  // ── 팝오버 (내 근무표) ───────────────────────────────
  const openPopover = useCallback((date) => {
    const dateStr = new Date(date).toISOString().split("T")[0];
    const schedule = mySchedules.find((s) => s.work_date === dateStr) || null;
    setPopover({ date, schedule });
  }, [mySchedules]);

  useEffect(() => {
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setPopover(null);
      }
    };
    if (popover) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popover]);

  // ── 그리드 날짜 헤더 ─────────────────────────────────
  const getDayHeader = (day) => {
    const dow = getDayOfWeek(monthStartDow, day);
    const weekend = isWeekend(dow);
    return (
      <th
        key={day}
        className="border-r border-b border-slate-100 text-center py-1"
        style={{ width: 72, minWidth: 72, background: weekend ? "#FEF9F0" : "white" }}
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

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_NAMES_KO[d.getDay()]})`;
  };

  const calDate = new Date(year, month - 1, 1);

  return (
    <div style={{ padding: "24px", fontFamily: "Pretendard, sans-serif" }}>

      {/* 헤더 + 월 이동 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111827" }}>
          근무표 조회
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", color: "#374151", cursor: "pointer", fontSize: 13 }}
          >
            ← 이전 달
          </button>
          <span style={{ fontWeight: 600, color: "#111827", fontSize: 15 }}>
            {year}년 {month}월
          </span>
          <button
            onClick={() => navigate(1)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#fff", color: "#374151", cursor: "pointer", fontSize: 13 }}
          >
            다음 달 →
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: "#F1F5F9", borderRadius: 10, width: "fit-content", marginBottom: 20 }}>
        <button
          onClick={() => setSearchParams({ year, month, tab: "mine" })}
          style={tab === "mine" ? activeTab : inactiveTab}
        >
          내 근무표
        </button>
        <button
          onClick={() => setSearchParams({ year, month, tab: "all" })}
          style={tab === "all" ? activeTab : inactiveTab}
        >
          전체 근무표
        </button>
      </div>

      {/* ── 내 근무표 (캘린더) ── */}
      {tab === "mine" && (
        <>
          {myLoading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#6B7280" }}>불러오는 중...</div>
          ) : mySchedules.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#6B7280", fontSize: 15 }}>
              이번 달 근무표가 아직 배정되지 않았습니다
            </div>
          ) : (
            <div style={{ height: 650 }}>
              <Calendar
                localizer={localizer}
                events={events}
                defaultView={Views.MONTH}
                views={[Views.MONTH]}
                date={calDate}
                onNavigate={handleCalendarNavigate}
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

          {/* 팝오버 */}
          {popover && (
            <div
              ref={popoverRef}
              style={{
                position: "fixed", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "#fff", borderRadius: 12, padding: 20,
                boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
                zIndex: 9999, minWidth: 220,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 12, color: "#111827", fontSize: 15 }}>
                {formatDate(popover.date)}
              </div>
              {popover.schedule ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: popover.schedule.shift_color }} />
                    <span style={{ fontWeight: 600, color: "#111827" }}>
                      {popover.schedule.shift_code} {popover.schedule.shift_label}
                    </span>
                  </div>
                  {shiftTimeMap[popover.schedule.shift_code] && (
                    <div style={{ fontSize: 13, color: "#6B7280" }}>
                      시간: {shiftTimeMap[popover.schedule.shift_code].start} ~{" "}
                      {shiftTimeMap[popover.schedule.shift_code].end}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: "#6B7280", fontSize: 14 }}>근무 없음</div>
              )}
              <button
                onClick={() => setPopover(null)}
                style={{ marginTop: 14, width: "100%", padding: "6px 0", borderRadius: 6, border: "1px solid #E5E7EB", background: "transparent", cursor: "pointer", color: "#6B7280", fontSize: 13 }}
              >
                닫기
              </button>
            </div>
          )}
        </>
      )}

      {/* ── 전체 근무표 (그리드) ── */}
      {tab === "all" && (
        <div
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
        >
          {/* 테이블 상단 바 */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">
              {year}년 {month}월 근무표
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={
                periodStatus === "confirmed"
                  ? { background: "#ECFDF5", color: "#059669" }
                  : { background: "#FEF3C7", color: "#D97706" }
              }
            >
              {periodStatus === "confirmed" ? "확정됨" : "미확정"}
            </span>
            <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
              {shiftLegend.map((st) => (
                <span key={st.code} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ background: st.color }} />
                  {st.code}={st.label}
                </span>
              ))}
            </div>
          </div>

          {allLoading ? (
            <div className="flex items-center justify-center" style={{ height: 400 }}>
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : allEmployees.length === 0 ? (
            <div className="flex items-center justify-center text-slate-400" style={{ height: 400 }}>
              이번 달 근무표가 아직 작성되지 않았습니다
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="border-collapse" style={{ fontSize: 12 }}>
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th
                      className="sticky left-0 z-30 border-r border-b border-slate-100 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-500 whitespace-nowrap"
                      style={{ minWidth: 120, background: "white" }}
                    >
                      직원 / 날짜
                    </th>
                    {Array.from({ length: daysInMonth }, (_, i) => getDayHeader(i + 1))}
                  </tr>
                </thead>
                <tbody>
                  {allEmployees.map((emp) => (
                    <tr key={emp.user_id} className="hover:bg-blue-50/20">
                      <td
                        className="sticky left-0 z-10 bg-white border-r border-b border-slate-100 px-3 py-0 whitespace-nowrap"
                        style={{ minWidth: 120 }}
                      >
                        <div className="flex items-center gap-2 py-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: "#8B5CF6" }}
                          >
                            {emp.name.charAt(0)}
                          </div>
                          <span className="text-xs text-slate-700 font-medium">{emp.name}</span>
                        </div>
                      </td>
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const dow = getDayOfWeek(monthStartDow, day);
                        return (
                          <ReadOnlyCell
                            key={day}
                            code={allScheduleMap[emp.user_id]?.[day] || ""}
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
      )}
    </div>
  );
}
