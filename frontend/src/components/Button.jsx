// frontend/src/components/Button.jsx
const variantClass = {
  primary:   'bg-blue-500 hover:bg-blue-600 text-white',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
  ghost:     'bg-transparent hover:bg-slate-100 text-slate-600',
  danger:    'bg-red-500 hover:bg-red-600 text-white',
}

const sizeClass = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  children,
  icon: Icon,
  type = 'button',
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClass[variant]} ${sizeClass[size]} ${className}`}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      {children}
    </button>
  )
}
