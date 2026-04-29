import { Users, Briefcase, CalendarOff, Clock, ArrowUpRight, CheckCircle, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { adminDashboardStats } from '../../api/mocks/mockData'

// ── 실제 API로 교체할 때 ────────────────────────────────────
// import { useState, useEffect } from 'react'
// import apiClient from '../../api/client'
// useEffect(() => {
//   apiClient.get('/admin/dashboard').then(res => setDashboard(res.data))
// }, [])
// ──────────────────────────────────────────────────────────

// ── KPI 카드 컴포넌트 ─────────────────────────────────────────
const KPICard = ({ icon: Icon, label, value, sub, color, bg }) => (
  <div
    className="bg-white rounded-2xl p-6 border border-slate-200 flex items-start gap-4"
    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
  >
    <div
      className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
      style={{ background: bg }}
    >
      <Icon size={22} style={{ color }} />
    </div>
    <div className="min-w-0">
      <div className="text-slate-500 text-sm mb-1">{label}</div>
      <div className="font-bold text-slate-800 leading-none" style={{ fontSize: 28 }}>
        {value}
      </div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  </div>
)

// ── 상태 색상 매핑 ────────────────────────────────────────────
const statusColors = {
  pending:  { bg: '#FEF3C7', text: '#D97706', label: '대기' },
  approved: { bg: '#ECFDF5', text: '#059669', label: '승인' },
  rejected: { bg: '#FEF2F2', text: '#DC2626', label: '반려' },
  accepted: { bg: '#EFF6FF', text: '#3B82F6', label: '합의' },
}

export default function DashboardPage() {
  // adminDashboardStats에서 직접 데이터 가져오기
  const {
    totalEmployees,
    todayWorkers,
    todayOffWorkers,
    pendingRequests,
    weeklySchedule,
    recentRequests,
  } = adminDashboardStats

  // ── 오늘 날짜 문자열 ───────────────────────────────────────
  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="space-y-6">

      {/* ── 페이지 타이틀 ───────────────────────────────────── */}
      <div>
        <h1 className="font-bold text-slate-800" style={{ fontSize: 24 }}>
          관리자 대시보드
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {todayStr} · 오늘의 근무 현황
        </p>
      </div>

      {/* ── KPI 카드 4개 ────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-6">
        <KPICard
          icon={Users}
          label="전체 직원 수"
          value={totalEmployees}
          sub="활성 직원 기준"
          color="#3B82F6"
          bg="#EFF6FF"
        />
        <KPICard
          icon={Briefcase}
          label="오늘 근무자"
          value={todayWorkers}
          sub="D·E·N 근무 합산"
          color="#8B5CF6"
          bg="#F5F3FF"
        />
        <KPICard
          icon={CalendarOff}
          label="오늘 휴무·휴가"
          value={todayOffWorkers}
          sub="OFF + VAC"
          color="#10B981"
          bg="#ECFDF5"
        />
        <KPICard
          icon={Clock}
          label="승인 대기"
          value={pendingRequests}
          sub="처리 필요한 요청"
          color="#F59E0B"
          bg="#FFFBEB"
        />
      </div>

      {/* ── 차트 + 최근 요청 ─────────────────────────────────── */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '60% 1fr' }}>

        {/* 이번 주 근무 현황 차트 — D/E/N/OFF 4개 막대 */}
        <div
          className="bg-white rounded-2xl p-6 border border-slate-200"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-slate-800" style={{ fontSize: 16 }}>
                이번 주 근무 현황
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">4월 14일(월) ~ 4월 20일(일)</p>
            </div>
            {/* 범례 */}
            <div className="flex items-center gap-4 text-xs">
              {[
                { color: '#3B82F6', label: '주간(D)' },
                { color: '#8B5CF6', label: '오후(E)' },
                { color: '#1D4ED8', label: '야간(N)' },
                { color: '#CBD5E1', label: '휴무(OFF)' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm" style={{ background: l.color }} />
                  <span className="text-slate-500">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklySchedule} barSize={12} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  fontSize: 12,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              />
              <Bar dataKey="D" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="E" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="N" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="OFF" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 최근 요청 목록 */}
        <div
          className="bg-white rounded-2xl p-6 border border-slate-200"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800" style={{ fontSize: 16 }}>최근 요청</h2>
            <button
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: '#3B82F6' }}
            >
              전체 보기 <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {recentRequests.map((req) => {
              const sc = statusColors[req.status] ?? statusColors.pending
              return (
                <div
                  key={req.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: '#3B82F6' }}
                  >
                    {req.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 truncate">
                        {req.name}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: sc.bg, color: sc.text }}
                      >
                        {sc.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {req.type} · {req.date}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{req.createdAt}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 알림 배너 ────────────────────────────────────────── */}
      <div className="space-y-3">
        {pendingRequests > 0 && (
          <div
            className="flex items-start gap-3 p-4 rounded-2xl border"
            style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}
          >
            <AlertCircle size={18} style={{ color: '#D97706' }} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium" style={{ color: '#92400E' }}>
                승인 대기 요청 알림
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
                처리 대기 중인 요청이 {pendingRequests}건 있습니다. 요청 관리 화면에서 확인해주세요.
              </p>
            </div>
          </div>
        )}

        <div
          className="flex items-start gap-3 p-4 rounded-2xl border"
          style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}
        >
          <CheckCircle size={18} style={{ color: '#059669' }} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium" style={{ color: '#065F46' }}>근무표 상태</p>
            <p className="text-xs mt-0.5" style={{ color: '#047857' }}>
              근무표 작성 완료 후 확정 처리를 해주세요.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
