// frontend/src/components/Toast.jsx
import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

const typeStyle = {
  success: { bg: '#ECFDF5', color: '#059669', border: '#6EE7B7' },
  error:   { bg: '#FEF2F2', color: '#EF4444', border: '#FCA5A5' },
  info:    { bg: '#EFF6FF', color: '#3B82F6', border: '#93C5FD' },
}

function ToastItem({ id, type, message, onClose }) {
  const s = typeStyle[type] ?? typeStyle.info
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium min-w-64 max-w-sm animate-fade-in"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      <span className="flex-1">{message}</span>
      <button onClick={() => onClose(id)} className="shrink-0 opacity-60 hover:opacity-100">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
          <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const push = useCallback((type, message) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => remove(id), 3000)
  }, [remove])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(t => (
          <ToastItem key={t.id} {...t} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return {
    success: (msg) => ctx.push('success', msg),
    error:   (msg) => ctx.push('error', msg),
    info:    (msg) => ctx.push('info', msg),
  }
}
