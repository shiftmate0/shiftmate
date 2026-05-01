import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [employeeNo, setEmployeeNo] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(employeeNo, password)
      if (user.is_initial_password) {
        navigate('/change-password', { replace: true })
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
      } else {
        navigate('/employee/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.response?.data?.detail ?? '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handleDemo(empNo, pw) {
    setEmployeeNo(empNo)
    setPassword(pw)
    setError('')
    setLoading(true)
    login(empNo, pw)
      .then(user => {
        if (user.is_initial_password) {
          navigate('/change-password', { replace: true })
        } else if (user.role === 'admin') {
          navigate('/admin/dashboard', { replace: true })
        } else {
          navigate('/employee/dashboard', { replace: true })
        }
      })
      .catch(err => {
        setError(err.response?.data?.detail ?? '로그인에 실패했습니다.')
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* 좌측 패널 55% */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12 text-white"
        style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M8 7h8M8 12h5M8 17h3" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xl font-bold">ShiftMate</span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight mb-4">
              스마트한 근무<br />스케줄 관리
            </h1>
            <p className="text-white/70 text-lg">
              팀의 근무 일정을 효율적으로 관리하고<br />교대 요청을 손쉽게 처리하세요.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['실시간 현황', '권한 기반 관리', '교대 매칭'].map(label => (
              <span
                key={label}
                className="px-3 py-1.5 bg-white/20 rounded-full text-sm font-medium"
              >
                {label}
              </span>
            ))}
          </div>

          <ul className="space-y-3">
            {[
              '근무 유형별 색상으로 한눈에 파악',
              '휴무·휴가 신청과 승인 자동화',
              '연차 기반 교대 요청 매칭',
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-white/80">
                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/40 text-sm">© 2026 ShiftMate</p>
      </div>

      {/* 우측 패널 45% */}
      <div className="flex-1 lg:w-[45%] flex flex-col items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* 모바일 전용 로고 */}
          <div className="flex lg:hidden items-center gap-2 justify-center">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#3B82F6' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M8 7h8M8 12h5M8 17h3" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-800">ShiftMate</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-800">ShiftMate 로그인</h2>
            <p className="text-sm text-slate-400 mt-1">사번과 비밀번호를 입력하세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">사번</label>
              <input
                type="text"
                value={employeeNo}
                onChange={e => setEmployeeNo(e.target.value)}
                placeholder="사번을 입력하세요"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">비밀번호</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  required
                  className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <path d="M3 3l18 18M10.477 10.477A3 3 0 0013.536 13.5M6.357 6.357C4.29 7.74 2.8 9.73 2 12c1.73 4.39 6 7.5 10 7.5a9.77 9.77 0 004.468-1.08M9.75 4.63A9.77 9.77 0 0112 4.5c4 0 8.27 3.11 10 7.5a13.16 13.16 0 01-1.67 2.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" />
                      <path d="M2 12C3.73 7.61 7.5 4.5 12 4.5S20.27 7.61 22 12c-1.73 4.39-5.5 7.5-10 7.5S3.73 16.39 2 12z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm px-3 py-2 rounded-lg bg-red-50" style={{ color: '#DC2626' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ background: '#3B82F6' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  로그인 중...
                </span>
              ) : '로그인'}
            </button>
          </form>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">데모 로그인</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemo('ADMIN001', 'admin1234!')}
                className="flex-1 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
              >
                관리자
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDemo('EMP002', 'emp1234!')}
                className="flex-1 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
              >
                직원
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-slate-300">© 2026 ShiftMate</p>
        </div>
      </div>
    </div>
  )
}
