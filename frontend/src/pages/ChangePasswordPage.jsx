import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'

const PW_RULE = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/

export default function ChangePasswordPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const isInitial = user?.is_initial_password ?? true

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 초기 비밀번호 모드일 때 뒤로가기 차단
  useEffect(() => {
    if (!isInitial) return
    const block = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', block)
    return () => window.removeEventListener('beforeunload', block)
  }, [isInitial])

  const newPwInvalid = newPw.length > 0 && !PW_RULE.test(newPw)
  const confirmMismatch = confirmPw.length > 0 && newPw !== confirmPw
  const canSubmit = currentPw && PW_RULE.test(newPw) && newPw === confirmPw && !loading

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setLoading(true)
    try {
      await apiClient.put('/auth/password', {
        current_password: currentPw,
        new_password: newPw,
      })
      updateUser({ is_initial_password: false })
      if (isInitial) {
        navigate(user.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard', { replace: true })
      } else {
        navigate(-1)
      }
    } catch (err) {
      setError(err.response?.data?.detail ?? '비밀번호 변경에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isInitial ? '초기 비밀번호 변경' : '비밀번호 변경'}
            </h1>
          </div>

          {isInitial && (
            <div className="flex gap-2.5 p-3 bg-blue-50 rounded-xl">
              <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#3B82F6" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-sm text-blue-700">보안을 위해 초기 비밀번호를 변경해 주세요.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordField
              label="현재 비밀번호"
              value={currentPw}
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
              onChange={e => setCurrentPw(e.target.value)}
            />

            <div>
              <PasswordField
                label="새 비밀번호"
                value={newPw}
                show={showNew}
                onToggle={() => setShowNew(v => !v)}
                onChange={e => setNewPw(e.target.value)}
                invalid={newPwInvalid}
              />
              {newPwInvalid ? (
                <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>
                  최소 8자, 영문+숫자 조합이어야 합니다
                </p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">최소 8자, 영문+숫자 조합</p>
              )}
            </div>

            <div>
              <PasswordField
                label="새 비밀번호 확인"
                value={confirmPw}
                show={showConfirm}
                onToggle={() => setShowConfirm(v => !v)}
                onChange={e => setConfirmPw(e.target.value)}
                invalid={confirmMismatch}
              />
              {confirmMismatch && (
                <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>
                  비밀번호가 일치하지 않습니다
                </p>
              )}
            </div>

            {error && (
              <p className="text-sm px-3 py-2 rounded-lg bg-red-50" style={{ color: '#DC2626' }}>
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              {!isInitial && (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                >
                  취소
                </button>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: '#3B82F6' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    변경 중...
                  </span>
                ) : '변경 완료'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function PasswordField({ label, value, show, onToggle, onChange, invalid }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          className={`w-full px-4 py-2.5 pr-10 rounded-xl border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent transition ${
            invalid
              ? 'border-red-300 focus:ring-red-400'
              : 'border-slate-200 focus:ring-blue-400'
          }`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {show ? (
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
  )
}
