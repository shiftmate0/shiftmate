/**
 * 직원 대시보드 화면
 * GET /api/employee/dashboard → 오늘 근무 + 이번 주(월~일) 일정
 */

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { fetchEmployeeDashboard } from "../../api/schedules";
import { MOCK_DASHBOARD } from "../../api/mocks/schedules";

const USE_MOCK = false; // API 완성 후 false (이미 Day 3 PM에 완성)

const WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"];

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = USE_MOCK ? MOCK_DASHBOARD : await fetchEmployeeDashboard();
        setDashboard(data);
      } catch (err) {
        console.error("대시보드 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
      </div>
    );
  }

  const today = dashboard;

  return (
    <div style={styles.page}>
      {/* 인사말 */}
      <h2 style={styles.greeting}>
        안녕하세요, <strong>{user?.name}</strong> 님 👋
      </h2>

      {/* 오늘 근무 카드 */}
      <div style={styles.todayCard(today?.today_shift_color)}>
        <div style={styles.todayLabel}>오늘 근무</div>
        {today?.today_shift_code ? (
          <>
            <div style={styles.todayCode}>{today.today_shift_code}</div>
            <div style={styles.todayName}>{today.today_shift_label}</div>
          </>
        ) : (
          <div style={styles.todayCode}>—</div>
        )}
      </div>

      {/* 이번 주 */}
      <h3 style={styles.sectionTitle}>이번 주 일정</h3>
      <div style={styles.weekGrid}>
        {(today?.this_week ?? []).map((day, i) => {
          const dateObj = new Date(day.date);
          const dayNum = dateObj.getDate();
          const isToday = day.date === new Date().toISOString().slice(0, 10);

          return (
            <div
              key={day.date}
              style={styles.dayCard(isToday, day.shift_color)}
            >
              <div style={styles.dayLabel(isToday)}>{WEEKDAY_KO[i]}</div>
              <div style={styles.dayNum(isToday)}>{dayNum}</div>
              {day.shift_code ? (
                <>
                  <div style={styles.dayShiftCode(day.shift_color)}>
                    {day.shift_code}
                  </div>
                  <div style={styles.dayShiftLabel}>{day.shift_label}</div>
                </>
              ) : (
                <div style={styles.dayEmpty}>미배정</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────
const styles = {
  page: {
    padding: "28px 32px",
    fontFamily: "Pretendard, sans-serif",
    maxWidth: 800,
  },
  center: {
    display: "flex", alignItems: "center", justifyContent: "center",
    height: 300,
  },
  spinner: {
    width: 32, height: 32,
    border: "3px solid #E5E7EB",
    borderTop: "3px solid #2563EB",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  greeting: {
    fontSize: 22, fontWeight: 500, color: "#111827",
    marginBottom: 20,
  },
  todayCard: (color) => ({
    backgroundColor: color ?? "#F3F4F6",
    borderRadius: 16,
    padding: "24px 32px",
    marginBottom: 28,
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "flex-start",
    minWidth: 200,
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
  }),
  todayLabel: {
    fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)",
    marginBottom: 6, letterSpacing: "0.05em",
  },
  todayCode: {
    fontSize: 52, fontWeight: 800, color: "#fff", lineHeight: 1,
  },
  todayName: {
    fontSize: 16, color: "rgba(255,255,255,0.9)", marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: 700, color: "#374151", marginBottom: 14,
  },
  weekGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 8,
  },
  dayCard: (isToday, color) => ({
    borderRadius: 12,
    padding: "14px 8px",
    textAlign: "center",
    backgroundColor: isToday ? (color ?? "#2563EB") : "#F9FAFB",
    border: isToday ? "none" : "1px solid #E5E7EB",
    boxShadow: isToday ? "0 4px 12px rgba(0,0,0,0.12)" : "none",
    transition: "transform 0.15s",
  }),
  dayLabel: (isToday) => ({
    fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
    color: isToday ? "rgba(255,255,255,0.8)" : "#9CA3AF",
    marginBottom: 4,
  }),
  dayNum: (isToday) => ({
    fontSize: 20, fontWeight: 700,
    color: isToday ? "#fff" : "#111827",
    marginBottom: 8,
  }),
  dayShiftCode: (color) => ({
    fontSize: 15, fontWeight: 800,
    color: color ?? "#2563EB",
  }),
  dayShiftLabel: {
    fontSize: 11, color: "#6B7280", marginTop: 2,
  },
  dayEmpty: {
    fontSize: 11, color: "#D1D5DB",
  },
};