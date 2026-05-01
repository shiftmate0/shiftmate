// frontend/src/components/Input.jsx
import { useState } from 'react'

export default function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  helper,
  required = false,
  disabled = false,
  readOnly = false,
  icon: Icon,
  options = [],
  rows = 3,
  className = '',
}) {
  const [showPw, setShowPw] = useState(false)

  const baseInput = 'w-full rounded-xl border text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400'
  const borderColor = error ? 'border-red-400' : 'border-slate-200'

  const renderInput = () => {
    if (type === 'select') {
      return (
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`${baseInput} ${borderColor} px-4 py-2.5 ${className}`}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )
    }

    if (type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          rows={rows}
          className={`${baseInput} ${borderColor} px-4 py-2.5 resize-none ${className}`}
        />
      )
    }

    const inputType = type === 'password' ? (showPw ? 'text' : 'password') : type

    return (
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icon size={16} />
          </span>
        )}
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          className={`${baseInput} ${borderColor} py-2.5 ${Icon ? 'pl-9 pr-4' : 'px-4'} ${type === 'password' ? 'pr-10' : ''} ${className}`}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPw ? (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 3l18 18M10.477 10.477A3 3 0 0013.5 13.5M6.36 6.36C4.29 7.74 2.8 9.73 2 12c1.73 4.39 6 7.5 10 7.5a9.77 9.77 0 004.47-1.08M9.75 4.63A9.77 9.77 0 0112 4.5c4 0 8.27 3.11 10 7.5a13.16 13.16 0 01-1.67 2.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            ) : (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2"/><path d="M2 12C3.73 7.61 7.5 4.5 12 4.5S20.27 7.61 22 12c-1.73 4.39-5.5 7.5-10 7.5S3.73 16.39 2 12z" stroke="currentColor" strokeWidth="2"/></svg>
            )}
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-600 mb-1.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {renderInput()}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {!error && helper && <p className="mt-1 text-xs text-slate-400">{helper}</p>}
    </div>
  )
}
