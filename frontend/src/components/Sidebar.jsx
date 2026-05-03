// frontend/src/components/Sidebar.jsx
import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Calendar, ClipboardList, Bell,
  LogOut, RefreshCw, Layers, Menu, X, CalendarDays, Shuffle, FileText,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const adminNavItems = [
  { path: '/admin/dashboard',   icon: LayoutDashboard, label: '대시보드' },
  { path: '/admin/employees',   icon: Users,           label: '직원 관리' },
  { path: '/admin/shift-types', icon: Layers,          label: '근무 유형 관리' },
  { path: '/admin/schedules',     icon: ClipboardList,   label: '근무표 작성' },
  { path: '/admin/schedule-view', icon: Calendar,        label: '근무표 조회' },
  { path: '/admin/requests',      icon: Bell,            label: '요청 관리' },
]

const employeeNavItems = [
  { path: '/employee/dashboard',     icon: LayoutDashboard, label: '대시보드' },
  { path: '/employee/schedules',     icon: CalendarDays,    label: '근무표 조회' },
  { path: '/employee/requests',      icon: FileText,        label: '휴무·휴가 신청' },
  { path: '/employee/swap-requests', icon: Shuffle,         label: '교대 요청' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(true)
  const navigate = useNavigate()

  const role = user?.role
  const userName = user?.name ?? ''
  const navItems = role === 'admin' ? adminNavItems : employeeNavItems

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handleSwitch() {
    navigate(role === 'admin' ? '/employee/dashboard' : '/admin/dashboard')
  }

  return (
    <aside
      className="flex flex-col shrink-0 h-full bg-white border-r border-slate-200 transition-all duration-200 z-30"
      style={{ width: open ? 260 : 68 }}
    >
      {/* 로고 */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#3B82F6' }}
        >
          <Shuffle size={18} color="white" />
        </div>
        {open && (
          <div>
            <div className="font-bold text-slate-800 leading-tight" style={{ fontSize: 16 }}>ShiftMate</div>
            <div className="text-xs text-slate-400 leading-tight">근무 스케줄 관리</div>
          </div>
        )}
        <button
          onClick={() => setOpen(v => !v)}
          className="ml-auto text-slate-400 hover:text-slate-600 transition-colors"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* 역할 배지 */}
      {open && (
        <div className="px-4 py-2.5">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: role === 'admin' ? '#EFF6FF' : '#F5F3FF',
              color:      role === 'admin' ? '#3B82F6' : '#8B5CF6',
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

      {/* 네비게이션 */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative
              ${isActive ? 'text-blue-600 font-medium' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`
            }
            style={({ isActive }) => isActive ? { background: '#EFF6FF' } : {}}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-blue-500" />
                )}
                <item.icon size={18} className="shrink-0" />
                {open && <span className="text-sm flex-1">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 하단 */}
      <div className="border-t border-slate-100 p-3 space-y-1">
        {open ? (
          <>
            <button
              onClick={handleSwitch}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
            >
              <RefreshCw size={16} />
              <span>{role === 'admin' ? '직원 모드 전환 (데모)' : '관리자 모드 전환 (데모)'}</span>
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
  )
}
