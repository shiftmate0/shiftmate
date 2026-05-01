/**
 * 근무표 API 호출 함수 모음
 * 모든 호출은 src/api/client.js 의 apiClient 사용 (axios 직접 호출 금지)
 * baseURL = '/api' 이므로 경로에 /api 중복 금지
 */
import apiClient from "./client";

// ── 근무표 조회 ───────────────────────────────────────
export const fetchSchedules = async ({ year, month, userId, shiftTypeId } = {}) => {
  const params = { year, month };
  if (userId)      params.user_id = userId;
  if (shiftTypeId) params.shift_type_id = shiftTypeId;

  const { data } = await apiClient.get("/schedules", { params });
  return data; // { period_status, schedules: [...] }
};

export const fetchMySchedules = async ({ year, month }) => {
  const { data } = await apiClient.get("/schedules/me", {
    params: { year, month },
  });
  return data; // { period_status, schedules: [...] }
};

// ── 근무표 배치 저장 ──────────────────────────────────
export const bulkSaveSchedules = async (items) => {
  // items: [{ user_id, work_date, shift_type_id }, ...]
  const { data } = await apiClient.post("/admin/schedules/bulk", items);
  return data; // { saved: N }
};

// ── 근무표 단건 수정 ──────────────────────────────────
export const updateSchedule = async (scheduleId, { shiftTypeId }) => {
  const { data } = await apiClient.put(`/admin/schedules/${scheduleId}`, {
    shift_type_id: shiftTypeId,
  });
  return data;
};

// ── 근무표 소프트 삭제 ────────────────────────────────
export const deleteSchedule = async (scheduleId) => {
  await apiClient.delete(`/admin/schedules/${scheduleId}`);
};

// ── 월 확정 ───────────────────────────────────────────
export const confirmSchedule = async (year, month) => {
  const { data } = await apiClient.post(
    `/admin/schedules/${year}/${month}/confirm`,
    {}
  );
  return data; // { period_id, year, month, status, confirmed_at, confirmed_by }
};

// ── 근무표 검증 ───────────────────────────────────────
export const validateSchedules = async (year, month) => {
  const { data } = await apiClient.get("/admin/schedules/validate", {
    params: { year, month },
  });
  return data; // { is_valid, warnings: [...] }
};

// ── 직원 대시보드 ─────────────────────────────────────
export const fetchEmployeeDashboard = async () => {
  const { data } = await apiClient.get("/employee/dashboard");
  return data;
};

// ── 근무 유형 목록 (멤버 1 담당) ─────────────────────
// ⚠ 멤버 1 API 완성 전: MOCK_SHIFT_TYPES 사용
// ⚠ 완성 후: 아래 함수로 교체
export const fetchShiftTypes = async () => {
  const { data } = await apiClient.get("/admin/shift-types");
  return data; // [{ shift_type_id, code, label, color, is_work_day }]
};
