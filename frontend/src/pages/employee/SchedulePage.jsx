/**
 * 근무표 캘린더 화면 (관리자·직원 공용)
 * ─────────────────────────────────────────────────────
 * 관리자: 전체 직원 근무표 + 확정 버튼 표시
 * 직원:   본인 근무표만 표시, 확정 버튼 없음
 *
 * ⚠ react-big-calendar 설치 필요:
 *   npm install react-big-calendar moment
 *
 * ⚠ 멤버 1 BE(근무유형 API) 완성 전:
 *   MOCK_SHIFT_TYPES 사용 중 → API 완성 후 fetchShiftTypes()로 교체
 */

import { useState, useEffect, useCallback } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "moment/locale/ko";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useAuth } from "../../context/AuthContext";
import {
  fetchSchedules,
  confirmSchedule,
  validateSchedules,
  fetchShiftTypes,
} from "../../api/schedules";
import { MOCK_SHIFT_TYPES } from "../../api/mocks/shiftTypes"; // Day 3 멤버1 API 완성 후 제거

moment.locale("ko");
const localizer = momentLocalizer(moment);

// ─── 상수 ────────────────────────────────────────────
const USE_MOCK_SHIFT_TYPES = true; // ⚠ 멤버1 API 완성 후 false로 변경

export default function SchedulePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [events, setEvents] = useState([]);
  const [shiftColorMap, setShiftColorMap] = useState({});
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // 검증 경고 모달
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [warnings, setWarnings] = useState([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  // ── 근무 유형 색상 로드 ────────────────────────────
  useEffect(() => {
    const loadShiftTypes = async () => {
      let types;
      if (USE_MOCK_SHIFT_TYPES) {
        types = MOCK_SHIFT_TYPES;
      } else {
        // 멤버 1 API 완성 후 교체
        const res = await fetchShiftTypes();
        types = res.data ?? res;
      }
      const map = {};
      types.forEach((t) => { map[t.code] = { color: t.color, label: t.label }; });
      setShiftColorMap(map);
    };
    loadShiftTypes();
  }, []);

  // ── 근무표 로드 ────────────────────────────────────
  const loadSchedules = useCallback(async () => {
    if (!Object.keys(shiftColorMap).length) return;
    setLoading(true);
    try {
      const res = await fetchSchedules({
        year,
        month,
        mine: !isAdmin, // 직원은 본인만
      });

      // react-big-calendar 이벤트 형식으로 변환
      const mapped = res.data.map((s) => {
        const colorInfo = shiftColorMap[s.shift_type.code] ?? { color: "#9CA3AF", label: s.shift_type.code };
        return {
          id: s.schedule_id,
          title: isAdmin
            ? `${s.user_name} · ${s.shift_type.label}`
            : s.shift_type.label,
          start: new Date(s.work_date),
          end:   new Date(s.work_date),
          allDay: true,
          resource: {
            shiftCode: s.shift_type.code,
            color: s.shift_type.color || colorInfo.color,
            isLocked: s.is_locked,
            userId: s.user_id,
            userName: s.user_name,
          },
        };
      });

      setEvents(mapped);
    } catch (err) {
      console.error("근무표 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [year, month, isAdmin, shiftColorMap]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  // ── 월 이동 ───────────────────────────────────────
  const handleNavigate = (newDate) => setCurrentDate(newDate);

  // ── 확정 버튼 클릭 ────────────────────────────────
  const handleConfirmClick = async () => {
    setConfirmLoading(true);
    try {
      // 1. 검증 먼저 실행
      const result = await validateSchedules(year, month);
      if (result.has_warnings) {
        setWarnings(result.warnings);
        setShowWarnModal(true);
        return;
      }
      // 경고 없으면 바로 확정
      await doConfirm(false);
    } catch (err) {
      alert("검증 중 오류가 발생했습니다.");
    } finally {
      setConfirmLoading(false);
    }
  };

  const doConfirm = async (force) => {
    setConfirmLoading(true);
    try {
      await confirmSchedule(year, month, force);
      setIsConfirmed(true);
      setShowWarnModal(false);
      alert(`${year}년 ${month}월 근무표가 확정됐습니다.`);
    } catch (err) {
      const msg = err?.response?.data?.detail;
      alert(typeof msg === "string" ? msg : "확정 처리 중 오류가 발생했습니다.");
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── 이벤트 스타일 ─────────────────────────────────
  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: event.resource.color,
      borderRadius: "4px",
      border: event.resource.isLocked ? "2px solid #EF4444" : "none",
      color: "#fff",
      fontSize: "12px",
      fontWeight: 600,
      padding: "1px 4px",
    },
  });

  // ── 렌더링 ────────────────────────────────────────
  return (
    <div style={{ padding: "24px", fontFamily: "Pretendard, sans-serif" }}>
      {/* 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#111827" }}>
          근무표 캘린더
        </h2>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* 확정 상태 배지 */}
          <span style={{
            padding: "4px 12px",
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 600,
            backgroundColor: isConfirmed ? "#D1FAE5" : "#FEF3C7",
            color: isConfirmed ? "#065F46" : "#92400E",
          }}>
            {isConfirmed ? "✅ 확정됨" : "⏳ 미확정"}
          </span>

          {/* 관리자만 확정 버튼 표시 */}
          {isAdmin && !isConfirmed && (
            <button
              onClick={handleConfirmClick}
              disabled={confirmLoading}
              style={{
                padding: "8px 18px",
                backgroundColor: confirmLoading ? "#9CA3AF" : "#2563EB",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                cursor: confirmLoading ? "not-allowed" : "pointer",
              }}
            >
              {confirmLoading ? "처리 중..." : "이번 달 확정"}
            </button>
          )}
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#6B7280" }}>
          근무표를 불러오는 중...
        </div>
      )}

      {/* 캘린더 */}
      {!loading && (
        <div style={{ height: 650 }}>
          <Calendar
            localizer={localizer}
            events={events}
            defaultView={Views.MONTH}
            views={[Views.MONTH]}
            date={currentDate}
            onNavigate={handleNavigate}
            eventPropGetter={eventStyleGetter}
            style={{ borderRadius: 12, overflow: "hidden" }}
            messages={{
              next: "다음 달",
              previous: "이전 달",
              today: "이번 달",
              month: "월",
            }}
          />
        </div>
      )}

      {/* 범례 */}
      <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
        {Object.entries(shiftColorMap).map(([code, info]) => (
          <div key={code} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 14, height: 14, borderRadius: 3,
              backgroundColor: info.color,
            }} />
            <span style={{ fontSize: 13, color: "#374151" }}>{code} — {info.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 14, height: 14, borderRadius: 3,
            backgroundColor: "#fff", border: "2px solid #EF4444",
          }} />
          <span style={{ fontSize: 13, color: "#374151" }}>🔒 교대 협의 중</span>
        </div>
      </div>

      {/* 검증 경고 모달 */}
      {showWarnModal && (
        <WarnModal
          warnings={warnings}
          onCancel={() => setShowWarnModal(false)}
          onForceConfirm={() => doConfirm(true)}
          loading={confirmLoading}
        />
      )}
    </div>
  );
}

// ─── 검증 경고 모달 ───────────────────────────────────
function WarnModal({ warnings, onCancel, onForceConfirm, loading }) {
  const TYPE_LABEL = {
    consecutive_night: "연속 야간근무",
    post_night_day:    "야간 후 주간 배정",
    understaffed:      "최소 인원 미달",
    low_avg_years:     "평균 연차 부족",
    overloaded:        "근무 편중",
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 28,
        width: 480,
        maxHeight: "80vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#111827" }}>
          ⚠ 검증 경고
        </h3>
        <ul style={{ margin: "0 0 20px", padding: "0 0 0 20px", lineHeight: 1.8 }}>
          {warnings.map((w, i) => (
            <li key={i} style={{ color: "#374151", fontSize: 14 }}>
              <span style={{
                fontSize: 11, fontWeight: 700,
                backgroundColor: "#FEF3C7", color: "#92400E",
                padding: "1px 6px", borderRadius: 4, marginRight: 6,
              }}>
                {TYPE_LABEL[w.type] ?? w.type}
              </span>
              {w.message}
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 13, color: "#6B7280", margin: "0 0 20px" }}>
          경고가 있어도 강제 확정할 수 있습니다.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "1px solid #D1D5DB",
              backgroundColor: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer",
            }}
          >
            취소
          </button>
          <button
            onClick={onForceConfirm}
            disabled={loading}
            style={{
              padding: "8px 18px", borderRadius: 8, border: "none",
              backgroundColor: loading ? "#9CA3AF" : "#DC2626",
              color: "#fff", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "처리 중..." : "강제 확정"}
          </button>
        </div>
      </div>
    </div>
  );
}