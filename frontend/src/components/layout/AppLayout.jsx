// frontend/src/components/layout/AppLayout.jsx
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Bell, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../Sidebar'

export default function AppLayout() {
  const { user } = useAuth()
  const [notifOpen, setNotifOpen] = useState(false)

  const role = user?.role
  const userName = user?.name ?? ''

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8FAFC' }}>
      <Sidebar />

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
              onClick={() => setNotifOpen(v => !v)}
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
                <div className="px-4 py-3 border-b border-slate-100 font-semibold text-slate-700 text-sm">알림</div>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="w-full text-center py-4 text-sm text-slate-400 hover:text-slate-600"
                >
                  알림이 없습니다.
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

        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
