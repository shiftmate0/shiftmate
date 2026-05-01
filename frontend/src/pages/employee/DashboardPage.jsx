/**
 * 직원 대시보드
 * PRD_14 / 사용자3(멤버2) 담당
 * 라우트: /employee/dashboard
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { fetchEmployeeDashboard } from "../../api/schedules";

const WEEKDAY_FULL = ["일", "월", "화", "수", "목", "금", "토"];

// ── 타입 배지 색상 ────────────────────────────────────
const TYPE_STYLE = {
  OFF:  { background: "#F1F5F9", color: "#64748B", label: "휴무" },
  VAC:  { background: "#D1FAE5", color: "#065F46", label: "휴가" },
  SWAP: { background: "#DBEAFE", color: "#1D4ED8", label: "교대" },
};

// ── 상태 배지 색상 ────────────────────────────────────
const STATUS_STYLE = {
  pending:  { background: "#FEF3C7", color: "#92400E", label: "대기" },
  approved: { background: "#D1FAE5", color: "#065F46", label: "승인" },
  rejected: { background: "#FEE2E2", color: "#991B1B", label: "거절" },
  canceled: { background: "#F1F5F9", color: "#64748B", label: "취소" },
  accepted: { background: "#DBEAFE", color: "#1D4ED8", label: "수락" },
  expired:  { background: "#F1F5F9", color: "#94A3B8", label: "만료" },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployeeDashboard()
      .then(setDashboard)
      .catch((err) => console.error("대시보드 로드 실패:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <div style={{
          width: 32, height: 32,
          border: "3px solid #E5E7EB", borderTop: "3px solid #2563EB",
          borderRadius: "50%", animation: "spin 0.8s linear infinite",
        }} />
      </div>
    );
  }

  // PageHeader 날짜 계산
  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${WEEKDAY_FULL[now.getDay()]})`;

  const today = dashboard?.today_schedule ?? null;
  const thisWeek = dashboard?.this_week ?? [];
  const myRequests = dashboard?.my_requests ?? [];

  // "전체 보기" 네비게이션 경로 결정
  const hasOffVac = myRequests.some((r) => r.type === "OFF" || r.type === "VAC");
  const viewAllPath = hasOffVac ? "/employee/requests" : "/employee/swap-requests";

  return (
    <div style={{ padding: "24px 32px", maxWidth: 800, fontFamily: "Pretendard, sans-serif" }}>

      {/* PageHeader */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111827" }}>
          직원 대시보드
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748B" }}>
          {dateStr} · 안녕하세요, {user?.name}님
        </p>
      </div>

      {/* ── 오늘의 근무 Card ─────────────────────────── */}
      <div style={{
        borderLeft: `4px solid ${today?.shift_color ?? "#94A3B8"}`,
        background: "#fff", borderRadius: 12, padding: "20px 24px",
        marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 10 }}>
          오늘의 근무
        </div>

        {today ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Clock size={16} color="#64748B" />
              <span style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>
                {today.shift_label} 근무
              </span>
              <span style={{
                backgroundColor: today.shift_color, color: "#fff",
                padding: "2px 10px", borderRadius: 20,
                fontSize: 12, fontWeight: 700,
              }}>
                {today.shift_code}
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#64748B" }}>
              {today.is_work_day
                ? `${today.start_time} - ${today.end_time}`
                : today.shift_code === "OFF"
                  ? "휴무일"
                  : "휴가일"
              }
            </div>
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94A3B8", fontSize: 14 }}>
            <Clock size={16} />
            오늘 배정된 근무가 없습니다
          </div>
        )}
      </div>

      {/* ── 이번 주 근무표 Card ──────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "20px 24px",
        marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginBottom: 16 }}>
          📅 이번 주 근무표
        </div>
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
            {thisWeek.map((day) => {
              const dayNum = new Date(day.work_date + "T00:00:00").getDate();
              return (
                <div
                  key={day.work_date}
                  style={{
                    minWidth: 60, textAlign: "center",
                    paddingBottom: 8,
                    borderBottom: day.is_today
                      ? "2px solid #3B82F6"
                      : "2px solid transparent",
                  }}
                >
                  <div style={{
                    fontSize: 12, marginBottom: 6,
                    fontWeight: day.is_today ? 700 : 400,
                    color: day.is_today ? "#2563EB" : "#6B7280",
                  }}>
                    {day.day_label}({dayNum})
                  </div>
                  {day.shift_code ? (
                    <>
                      <div style={{
                        display: "inline-block",
                        padding: "2px 6px", borderRadius: 6,
                        backgroundColor: day.shift_color,
                        color: "#fff",
                        fontSize: 12, fontWeight: 700,
                        marginBottom: 2,
                      }}>
                        {day.shift_code}
                      </div>
                      <div style={{ fontSize: 10, color: "#6B7280" }}>
                        {day.shift_label}
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: 10, color: "#D1D5DB" }}>미배정</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 나의 요청 Card ───────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "20px 24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 14,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>
            📋 나의 요청
          </div>
          {myRequests.length > 0 && (
            <button
              onClick={() => navigate(viewAllPath)}
              style={{
                background: "transparent", border: "none",
                color: "#3B82F6", fontSize: 13, fontWeight: 600,
                cursor: "pointer", padding: 0,
              }}
            >
              전체 보기 →
            </button>
          )}
        </div>

        {myRequests.length === 0 ? (
          <div style={{ color: "#94A3B8", fontSize: 14, textAlign: "center", padding: "12px 0" }}>
            최근 요청 내역이 없습니다
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myRequests.map((req) => {
              const typeStyle = TYPE_STYLE[req.type] ?? TYPE_STYLE.OFF;
              const statusStyle = STATUS_STYLE[req.status] ?? STATUS_STYLE.pending;
              return (
                <div
                  key={`${req.type}-${req.request_id}`}
                  style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                >
                  <span style={{
                    padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    backgroundColor: typeStyle.background, color: typeStyle.color,
                  }}>
                    {typeStyle.label}
                  </span>
                  <span style={{ color: "#374151", flex: 1 }}>{req.date_display}</span>
                  <span style={{
                    padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                    backgroundColor: statusStyle.background, color: statusStyle.color,
                  }}>
                    {statusStyle.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
