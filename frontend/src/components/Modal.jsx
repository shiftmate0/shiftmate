// frontend/src/components/Modal.jsx
import { useEffect } from 'react'

const sizeWidth = { sm: 400, md: 600, lg: 800, xl: 1000 }

export function ModalHeader({ children, onClose }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <h3 className="text-base font-semibold text-slate-800">{children}</h3>
      {onClose && (
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}

export function ModalBody({ children, className = '' }) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>
}

export function ModalFooter({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 ${className}`}>
      {children}
    </div>
  )
}

export default function Modal({ size = 'md', open, onClose, children }) {
  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose || undefined}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full overflow-hidden"
        style={{ maxWidth: sizeWidth[size] }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
