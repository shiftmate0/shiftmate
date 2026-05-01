/**
 * 직원 근무표 조회
 * PRD_09 / 사용자3(멤버2) 담당
 * 라우트: /employee/schedules?year={년}&month={월}
 *
 * ⚠ react-big-calendar 설치 필요:
 *   npm install react-big-calendar moment
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "moment/locale/ko";
import "react-big-calendar/lib/css/react-big-calendar.css";
import apiClient from "../../api/client";
import { mockShiftTypes } from "../../api/mocks/shiftTypes";

moment.locale("ko");
const localizer = momentLocalizer(moment);
const DAY_NAMES_KO = ["일", "월", "화", "수", "목", "금", "토"];

// OFF/VAC는 시간 미표시
const SHIFT_TIME_MAP = mockShiftTypes.reduce((acc, st) => {
  if (st.start_time) acc[st.code] = { start: st.start_time, end: st.end_time };
  return acc;
}, {});

export default function SchedulesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const year  = parseInt(searchParams.get("year"))  || now.getFullYear();
  const month = parseInt(searchParams.get("month")) || now.getMonth() + 1;

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [popover, setPopover]     = useState(null);
  const popoverRef = useRef(null);

  // ── 근무표 조회 ───────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get("/schedules/me", { params: { year, month } });
        setSchedules(res.data.schedules || []);
      } catch (err) {
        console.error("근무표 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [year, month]);

  // ── 이벤트 변환 ───────────────────────────────────
  const events = useMemo(() =>
    schedules.map((s) => ({
      id: s.schedule_id,
      title: `${s.shift_code} ${s.shift_label}`,
      start: new Date(s.work_date + "T00:00:00"),
      end:   new Date(s.work_date + "T00:00:00"),
      allDay: true,
      color: s.shift_color,
      shiftCode: s.shift_code,
      shiftLabel: s.shift_label,
      workDate: s.work_date,
    })),
    [schedules]
  );

  // ── 이벤트 스타일 ─────────────────────────────────
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

  // ── 날짜 배경 ─────────────────────────────────────
  const dayPropGetter = useCallback((date) => {
    const isToday = date.toDateString() === new Date().toDateString();
    const dow = date.getDay();
    if (isToday) return { style: { backgroundColor: "#EFF6FF", border: "1px solid #3B82F6" } };
    if (dow === 6) return { style: { backgroundColor: "#F8FAFC" } };
    if (dow === 0) return { style: { backgroundColor: "#FFF5F5" } };
    return {};
  }, []);

  // ── 월 이동 ───────────────────────────────────────
  const navigate = useCallback((delta) => {
    const d = new Date(year, month - 1 + delta, 1);
    setSearchParams({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }, [year, month, setSearchParams]);

  const handleNavigate = useCallback((newDate) => {
    setSearchParams({ year: newDate.getFullYear(), month: newDate.getMonth() + 1 });
  }, [setSearchParams]);

  // ── 날짜 클릭 팝오버 ──────────────────────────────
  const openPopover = useCallback((date) => {
    const dateStr = new Date(date).toISOString().split("T")[0];
    const schedule = schedules.find((s) => s.work_date === dateStr) || null;
    setPopover({ date, schedule });
  }, [schedules]);

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

  // ── 렌더링 ────────────────────────────────────────
  return (
    <div style={{ padding: "24px", fontFamily: "Pretendard, sans-serif" }}>
      {/* 페이지 헤더 + 월 네비게이션 */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 20,
      }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111827" }}>
          근무표 조회
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "6px 14px", borderRadius: 8,
              border: "1px solid #E5E7EB", background: "#fff",
              color: "#374151", cursor: "pointer", fontSize: 13,
            }}
          >
            ← 이전 달
          </button>
          <span style={{ fontWeight: 600, color: "#111827", fontSize: 15 }}>
            {year}년 {month}월
          </span>
          <button
            onClick={() => navigate(1)}
            style={{
              padding: "6px 14px", borderRadius: 8,
              border: "1px solid #E5E7EB", background: "#fff",
              color: "#374151", cursor: "pointer", fontSize: 13,
            }}
          >
            다음 달 →
          </button>
        </div>
      </div>

      {/* 캘린더 */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#6B7280" }}>
          불러오는 중...
        </div>
      ) : schedules.length === 0 ? (
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
            zIndex: 9999, minWidth: 220,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 12, color: "#111827", fontSize: 15 }}>
            {formatDate(popover.date)}
          </div>
          {popover.schedule ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 16, height: 16, borderRadius: 3,
                  backgroundColor: popover.schedule.shift_color,
                }} />
                <span style={{ fontWeight: 600, color: "#111827" }}>
                  {popover.schedule.shift_code} {popover.schedule.shift_label}
                </span>
              </div>
              {SHIFT_TIME_MAP[popover.schedule.shift_code] && (
                <div style={{ fontSize: 13, color: "#6B7280" }}>
                  시간: {SHIFT_TIME_MAP[popover.schedule.shift_code].start} ~{" "}
                  {SHIFT_TIME_MAP[popover.schedule.shift_code].end}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: "#6B7280", fontSize: 14 }}>근무 없음</div>
          )}
          <button
            onClick={() => setPopover(null)}
            style={{
              marginTop: 14, width: "100%", padding: "6px 0",
              borderRadius: 6, border: "1px solid #E5E7EB",
              background: "transparent", cursor: "pointer",
              color: "#6B7280", fontSize: 13,
            }}
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
