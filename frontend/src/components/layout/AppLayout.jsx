import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'  // react-router-dom 사용
import {
  LayoutDashboard, Users, Calendar, ClipboardList,
  Bell, ChevronDown, LogOut, RefreshCw, Layers, Menu, X,
  CalendarDays, Shuffle, FileText
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'  // shiftmate AuthContext 경로

const adminNavItems = [
  { path: '/admin/dashboard', icon: LayoutDashboard, label: '대시보드' },
  { path: '/admin/employees', icon: Users, label: '직원 관리' },
  { path: '/admin/shift-types', icon: Layers, label: '근무 유형 관리' },
  { path: '/admin/schedules', icon: ClipboardList, label: '근무표 작성' },
  { path: '/admin/requests', icon: Bell, label: '요청 관리', badge: 4 },
]

const employeeNavItems = [
  { path: '/employee/dashboard', icon: LayoutDashboard, label: '대시보드' },
  { path: '/employee/schedules', icon: CalendarDays, label: '근무표 조회' },
  { path: '/employee/requests', icon: FileText, label: '휴무·휴가 신청' },
  { path: '/employee/swap-requests', icon: Shuffle, label: '교대 요청' },
]

export default function AppLayout() {
  // shiftmate AuthContext는 user 객체로 관리 (role, name 직접 X)
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifOpen, setNotifOpen] = useState(false)
  const navigate = useNavigate()

  // user 객체에서 role과 이름 추출
  const role = user?.role
  const userName = user?.name ?? ''

  const navItems = role === 'admin' ? adminNavItems : employeeNavItems

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // 데모용 모드 전환 (실제 API 연결 전 테스트용)
  const handleSwitch = () => {
    const next = role === 'admin' ? '/employee/dashboard' : '/admin/dashboard'
    navigate(next)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAFC' }}>

      {/* ── 사이드바 ─────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 h-full bg-white border-r border-slate-200 transition-all duration-200 z-30"
        style={{ width: sidebarOpen ? 260 : 68 }}
      >
        {/* 로고 */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#3B82F6' }}
          >
            <Shuffle size={18} color="white" />
          </div>
          {sidebarOpen && (
            <div>
              <div className="font-bold text-slate-800 leading-tight" style={{ fontSize: 16 }}>
                ShiftMate
              </div>
              <div className="text-xs text-slate-400 leading-tight">근무 스케줄 관리</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* 역할 배지 */}
        {sidebarOpen && (
          <div className="px-4 py-2.5">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: role === 'admin' ? '#EFF6FF' : '#F5F3FF',
                color: role === 'admin' ? '#3B82F6' : '#8B5CF6',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: role === 'admin' ? '#3B82F6' : '#8B5CF6' }}
              />
              {role === 'admin' ? '관리자' : '직원'} 모드
            </span>
          </div>
        )}

        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative ${
                  isActive
                    ? 'text-blue-600 font-medium'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`
              }
              style={({ isActive }) => (isActive ? { background: '#EFF6FF' } : {})}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-blue-500" />
                  )}
                  <item.icon size={18} className="shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="text-sm flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {!sidebarOpen && item.badge && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* 하단 유저 영역 */}
        <div className="border-t border-slate-100 p-3 space-y-1">
          {sidebarOpen ? (
            <>
              <button
                onClick={handleSwitch}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                <RefreshCw size={16} />
                <span>
                  {role === 'admin' ? '직원 모드 전환 (데모)' : '관리자 모드 전환 (데모)'}
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <LogOut size={16} />
                <span>로그아웃</span>
              </button>
              <div className="flex items-center gap-3 px-3 py-2.5 mt-1 bg-slate-50 rounded-xl">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: role === 'admin' ? '#3B82F6' : '#8B5CF6' }}
                >
                  {userName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{userName}</div>
                  <div className="text-xs text-slate-400">{role === 'admin' ? '관리자' : '직원'}</div>
                </div>
              </div>
            </>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* ── 메인 영역 ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* 헤더 */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-4 shrink-0">
          <div className="flex-1">
            <div className="text-xs text-slate-400 mb-0.5">
              {new Date().getFullYear()}년 {new Date().getMonth() + 1}월
            </div>
            <div className="text-slate-800 font-semibold" style={{ fontSize: 16 }}>
              ShiftMate 근무 관리 시스템
            </div>
          </div>

          {/* 알림 버튼 */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
            {notifOpen && (
              <div
                className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden"
                style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}
              >
                <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-700 text-sm">
                  알림
                </div>
                {[
                  { msg: '이서윤님이 휴무를 신청했습니다.', time: '방금 전', dot: '#F59E0B' },
                  { msg: '정도현님의 교대 요청이 승인 대기 중입니다.', time: '1시간 전', dot: '#3B82F6' },
                ].map((n, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                  >
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.dot }} />
                    <div>
                      <div className="text-xs text-slate-700">{n.msg}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{n.time}</div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setNotifOpen(false)}
                  className="w-full text-center py-2.5 text-xs text-slate-400 hover:text-slate-600 border-t border-slate-100"
                >
                  닫기
                </button>
              </div>
            )}
          </div>

          {/* 유저 정보 */}
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: role === 'admin' ? '#3B82F6' : '#8B5CF6' }}
            >
              {userName.charAt(0)}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-medium text-slate-700">{userName}</div>
              <div className="text-xs text-slate-400">{role === 'admin' ? '관리자' : '직원'}</div>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </div>
        </header>

        {/* 페이지 컨텐츠 — 각 페이지 컴포넌트가 여기에 렌더링됨 */}
        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
