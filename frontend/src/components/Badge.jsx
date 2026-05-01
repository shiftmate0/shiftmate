// frontend/src/components/Badge.jsx
const variants = {
  'status-pending':  { bg: '#FEF3C7', color: '#D97706' },
  'status-approved': { bg: '#ECFDF5', color: '#059669' },
  'status-rejected': { bg: '#FEF2F2', color: '#DC2626' },
  'status-canceled': { bg: '#F1F5F9', color: '#64748B' },
  'status-expired':  { bg: '#F1F5F9', color: '#64748B' },
  'status-accepted': { bg: '#EFF6FF', color: '#2563EB' },
  'role-admin':      { bg: '#EFF6FF', color: '#3B82F6' },
  'role-employee':   { bg: '#F5F3FF', color: '#8B5CF6' },
  count:             { bg: '#EF4444', color: '#FFFFFF' },
  default:           { bg: '#F1F5F9', color: '#475569' },
}

export default function Badge({ variant = 'default', children }) {
  const style = variants[variant] ?? variants.default
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ background: style.bg, color: style.color }}
    >
      {children}
    </span>
  )
}
