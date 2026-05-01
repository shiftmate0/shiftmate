// ShiftMate Mock Data - April 2026

// ─────────────────────────────────────────────
// Shift Types
// ─────────────────────────────────────────────
export const shiftTypes = [
  { id: 1, code: 'D', label: '주간', startTime: '08:00', endTime: '16:00', color: '#3B82F6', isWorkDay: true, isSystem: false },
  { id: 2, code: 'E', label: '오후', startTime: '14:00', endTime: '22:00', color: '#8B5CF6', isWorkDay: true, isSystem: false },
  { id: 3, code: 'N', label: '야간', startTime: '22:00', endTime: '06:00', color: '#1D4ED8', isWorkDay: true, isSystem: false },
  { id: 4, code: 'OFF', label: '휴무', startTime: null, endTime: null, color: '#94A3B8', isWorkDay: false, isSystem: true },
  { id: 5, code: 'VAC', label: '휴가', startTime: null, endTime: null, color: '#10B981', isWorkDay: false, isSystem: true },
];

export const shiftColorMap = {
  D: '#3B82F6',
  E: '#8B5CF6',
  N: '#1D4ED8',
  OFF: '#94A3B8',
  VAC: '#10B981',
  '': '#F1F5F9',
};

export const shiftBgMap = {
  D: '#EFF6FF',
  E: '#F5F3FF',
  N: '#EFF6FF',
  OFF: '#F8FAFC',
  VAC: '#ECFDF5',
  '': '#F8FAFC',
};

// ─────────────────────────────────────────────
// Employees
// ─────────────────────────────────────────────
export const employees = [
  { id: 1, name: '김민준', employeeNo: 'EMP001', role: 'admin', yearsOfExperience: 8, isActive: true, isInitialPassword: false, department: '운영팀', email: 'minjun.kim@shiftmate.io', phone: '010-1234-5678', joinDate: '2017-03-02' },
  { id: 2, name: '이서윤', employeeNo: 'EMP002', role: 'employee', yearsOfExperience: 3, isActive: true, isInitialPassword: false, department: '서비스팀', email: 'seoyun.lee@shiftmate.io', phone: '010-2345-6789', joinDate: '2022-07-15' },
  { id: 3, name: '박지호', employeeNo: 'EMP003', role: 'employee', yearsOfExperience: 5, isActive: true, isInitialPassword: false, department: '서비스팀', email: 'jiho.park@shiftmate.io', phone: '010-3456-7890', joinDate: '2020-01-20' },
  { id: 4, name: '최예린', employeeNo: 'EMP004', role: 'employee', yearsOfExperience: 2, isActive: true, isInitialPassword: true, department: '서비스팀', email: 'yerin.choi@shiftmate.io', phone: '010-4567-8901', joinDate: '2023-09-01' },
  { id: 5, name: '정도현', employeeNo: 'EMP005', role: 'employee', yearsOfExperience: 7, isActive: true, isInitialPassword: false, department: '운영팀', email: 'dohyun.jung@shiftmate.io', phone: '010-5678-9012', joinDate: '2018-04-10' },
  { id: 6, name: '한소희', employeeNo: 'EMP006', role: 'employee', yearsOfExperience: 1, isActive: true, isInitialPassword: false, department: '서비스팀', email: 'sohee.han@shiftmate.io', phone: '010-6789-0123', joinDate: '2024-02-05' },
  { id: 7, name: '윤성민', employeeNo: 'EMP007', role: 'employee', yearsOfExperience: 4, isActive: false, isInitialPassword: false, department: '운영팀', email: 'sungmin.yoon@shiftmate.io', phone: '010-7890-1234', joinDate: '2021-06-14' },
  { id: 8, name: '오지은', employeeNo: 'EMP008', role: 'employee', yearsOfExperience: 6, isActive: true, isInitialPassword: false, department: '운영팀', email: 'jieun.oh@shiftmate.io', phone: '010-8901-2345', joinDate: '2019-11-01' },
];

export const activeEmployees = employees.filter(e => e.isActive && e.role === 'employee');

// ─────────────────────────────────────────────
// Schedule Generation
// ─────────────────────────────────────────────
const patterns = [
  ['D','D','D','E','E','E','N','N','N','OFF','OFF','OFF'],
  ['E','E','E','N','N','N','OFF','OFF','OFF','D','D','D'],
  ['N','N','N','OFF','OFF','OFF','D','D','D','E','E','E'],
  ['D','D','E','E','E','N','N','N','OFF','OFF','D','D'],
  ['N','N','OFF','D','D','D','E','E','E','N','N','OFF'],
  ['OFF','OFF','D','D','D','E','E','E','N','N','N','OFF'],
  ['E','N','N','N','OFF','OFF','D','D','D','E','E','N'],
  ['D','E','E','N','N','OFF','OFF','D','D','E','N','N'],
];

const startOffsets = [0, 4, 8, 2, 6, 10, 3, 7];

export function generateMonthSchedule(empIdx, year, month) {
  const pattern = patterns[empIdx % patterns.length];
  const offset = startOffsets[empIdx];
  const daysInMonth = new Date(year, month, 0).getDate();
  const result = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const idx = (offset + day - 1) % pattern.length;
    result[day] = pattern[idx];
  }
  // Add some VAC days for realism
  if (empIdx === 2) { result[15] = 'VAC'; result[16] = 'VAC'; result[17] = 'VAC'; }
  if (empIdx === 5) { result[22] = 'VAC'; result[23] = 'VAC'; }
  return result;
}

// April 2026 (month=4)
export const aprilSchedules = {};
activeEmployees.forEach((emp, i) => {
  aprilSchedules[emp.id] = generateMonthSchedule(i, 2026, 4);
});

// March 2026 (month=3) - previous month reference
export const marchSchedules = {};
activeEmployees.forEach((emp, i) => {
  marchSchedules[emp.id] = generateMonthSchedule(i, 2026, 3);
});

// ─────────────────────────────────────────────
// Swap Requests
// ─────────────────────────────────────────────
export const swapRequests = [
  {
    id: 1,
    requesterId: 2,
    requesterName: '이서윤',
    requesterDate: '2026-04-18',
    requesterShift: 'N',
    requiredYearsMin: 1,
    requiredYearsMax: 5,
    status: 'pending',
    reason: '개인 사정으로 야간 근무 교대 요청드립니다.',
    proposals: [
      { id: 1, proposerId: 3, proposerName: '박지호', proposerDate: '2026-04-18', proposerShift: 'D', proposerYears: 5, status: 'proposed', createdAt: '2026-04-12 14:20' },
      { id: 2, proposerId: 8, proposerName: '오지은', proposerDate: '2026-04-18', proposerShift: 'E', proposerYears: 6, status: 'proposed', createdAt: '2026-04-12 16:05' },
    ],
    createdAt: '2026-04-12 11:30',
    expiresAt: '2026-04-13 11:30',
  },
  {
    id: 2,
    requesterId: 5,
    requesterName: '정도현',
    requesterDate: '2026-04-22',
    requesterShift: 'D',
    requiredYearsMin: 5,
    requiredYearsMax: 9,
    status: 'accepted',
    reason: '가족 행사 참석으로 교대 요청합니다.',
    proposals: [
      { id: 3, proposerId: 8, proposerName: '오지은', proposerDate: '2026-04-22', proposerShift: 'E', proposerYears: 6, status: 'selected', createdAt: '2026-04-13 09:15' },
    ],
    createdAt: '2026-04-13 08:00',
    expiresAt: '2026-04-14 08:00',
    acceptedAt: '2026-04-13 10:00',
  },
  {
    id: 3,
    requesterId: 6,
    requesterName: '한소희',
    requesterDate: '2026-04-25',
    requesterShift: 'E',
    requiredYearsMin: 0,
    requiredYearsMax: 3,
    status: 'approved',
    reason: '수업 일정으로 인해 교대 부탁드립니다.',
    proposals: [
      { id: 4, proposerId: 4, proposerName: '최예린', proposerDate: '2026-04-25', proposerShift: 'D', proposerYears: 2, status: 'selected', createdAt: '2026-04-10 13:00' },
    ],
    createdAt: '2026-04-10 10:00',
    expiresAt: '2026-04-11 10:00',
    acceptedAt: '2026-04-10 14:00',
  },
  {
    id: 4,
    requesterId: 3,
    requesterName: '박지호',
    requesterDate: '2026-04-08',
    requesterShift: 'N',
    requiredYearsMin: 3,
    requiredYearsMax: 7,
    status: 'rejected',
    reason: '개인 사정',
    proposals: [],
    createdAt: '2026-04-05 17:00',
    expiresAt: '2026-04-06 17:00',
  },
  {
    id: 5,
    requesterId: 4,
    requesterName: '최예린',
    requesterDate: '2026-04-30',
    requesterShift: 'D',
    requiredYearsMin: 0,
    requiredYearsMax: 4,
    status: 'pending',
    reason: '병원 방문 예정',
    proposals: [],
    createdAt: '2026-04-14 09:30',
    expiresAt: '2026-04-15 09:30',
  },
];

// ─────────────────────────────────────────────
// Time-Off Requests
// ─────────────────────────────────────────────
export const timeOffRequests = [
  { id: 1, requesterId: 2, requesterName: '이서윤', type: 'OFF', startDate: '2026-04-05', endDate: '2026-04-05', reason: '개인 사정', status: 'approved', adminComment: '승인합니다.', createdAt: '2026-03-28 10:00', processedAt: '2026-03-29 09:00' },
  { id: 2, requesterId: 3, requesterName: '박지호', type: 'VAC', startDate: '2026-04-15', endDate: '2026-04-17', reason: '가족 여행', status: 'approved', adminComment: '수고하셨습니다.', createdAt: '2026-03-30 14:00', processedAt: '2026-04-01 10:00' },
  { id: 3, requesterId: 4, requesterName: '최예린', type: 'OFF', startDate: '2026-04-20', endDate: '2026-04-20', reason: '병원 방문', status: 'pending', createdAt: '2026-04-10 09:00' },
  { id: 4, requesterId: 5, requesterName: '정도현', type: 'VAC', startDate: '2026-04-28', endDate: '2026-04-30', reason: '결혼 기념일', status: 'pending', createdAt: '2026-04-11 11:00' },
  { id: 5, requesterId: 6, requesterName: '한소희', type: 'OFF', startDate: '2026-04-12', endDate: '2026-04-12', reason: '개인 사정', status: 'rejected', adminComment: '해당 날짜 최소 인원 미달 우려', createdAt: '2026-04-08 16:00', processedAt: '2026-04-09 10:00' },
  { id: 6, requesterId: 8, requesterName: '오지은', type: 'VAC', startDate: '2026-04-22', endDate: '2026-04-23', reason: '휴식', status: 'approved', adminComment: '승인합니다.', createdAt: '2026-04-05 12:00', processedAt: '2026-04-06 09:00' },
  { id: 7, requesterId: 2, requesterName: '이서윤', type: 'OFF', startDate: '2026-04-28', endDate: '2026-04-28', reason: '개인 사정', status: 'pending', createdAt: '2026-04-12 10:30' },
  { id: 8, requesterId: 3, requesterName: '박지호', type: 'OFF', startDate: '2026-04-25', endDate: '2026-04-25', reason: '가족 행사', status: 'pending', createdAt: '2026-04-13 15:00' },
];

// ─────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────
export const adminDashboardStats = {
  totalEmployees: 7,
  todayWorkers: 5,
  todayOffWorkers: 1,
  pendingRequests: 4,
  weeklySchedule: [
    { day: '월(4/14)', D: 3, E: 2, N: 1, OFF: 1 },
    { day: '화(4/15)', D: 2, E: 2, N: 2, OFF: 1 },
    { day: '수(4/16)', D: 3, E: 1, N: 2, OFF: 1 },
    { day: '목(4/17)', D: 2, E: 3, N: 1, OFF: 1 },
    { day: '금(4/18)', D: 3, E: 2, N: 1, OFF: 1 },
    { day: '토(4/19)', D: 2, E: 2, N: 2, OFF: 1 },
    { day: '일(4/20)', D: 1, E: 2, N: 2, OFF: 2 },
  ],
  recentRequests: [
    { id: 1, name: '이서윤', type: 'OFF', date: '2026-04-28', status: 'pending', createdAt: '방금 전' },
    { id: 2, name: '최예린', type: 'OFF', date: '2026-04-20', status: 'pending', createdAt: '1시간 전' },
    { id: 3, name: '정도현', type: 'VAC', date: '2026-04-28~30', status: 'pending', createdAt: '3시간 전' },
    { id: 4, name: '박지호', type: 'OFF', date: '2026-04-25', status: 'pending', createdAt: '어제' },
    { id: 5, name: '이서윤', type: '교대', date: '2026-04-18 야간', status: 'pending', createdAt: '2일 전' },
  ],
};

export const employeeDashboardData = {
  todayShift: { code: 'D', label: '주간', startTime: '08:00', endTime: '16:00', color: '#3B82F6' },
  weekSchedule: [
    { date: '4/14', day: '월', code: 'D' },
    { date: '4/15', day: '화', code: 'D' },
    { date: '4/16', day: '수', code: 'E' },
    { date: '4/17', day: '목', code: 'E' },
    { date: '4/18', day: '금', code: 'N' },
    { date: '4/19', day: '토', code: 'OFF' },
    { date: '4/20', day: '일', code: 'OFF' },
  ],
  myRequests: [
    { id: 1, type: 'OFF', date: '2026-04-28', status: 'pending', createdAt: '방금 전' },
    { id: 2, type: 'OFF', date: '2026-04-05', status: 'approved', createdAt: '2026-03-28' },
    { id: 3, type: '교대', date: '2026-04-18 야간', status: 'pending', createdAt: '2일 전' },
  ],
  monthStats: { totalWork: 21, dayShift: 8, eveningShift: 7, nightShift: 6, offDays: 9 },
};

// Validation warnings for schedule builder
export const scheduleValidations = [
  { type: 'warning', message: '이서윤: 4/16~4/18 연속 야간근무 3회 (설정값 초과)', day: 18, employeeId: 2 },
  { type: 'warning', message: '4/15: 주간 근무 인원 2명 (최소 인원 3명 미달)', day: 15, employeeId: null },
  { type: 'info', message: '4/22~4/23: 오지은 휴가 반영 완료', day: 22, employeeId: 8 },
];
