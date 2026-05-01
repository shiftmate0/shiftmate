// frontend/src/components/Card.jsx
const variantClass = {
  default:   'bg-white border border-slate-100 shadow-sm',
  elevated:  'bg-white shadow-md',
  outlined:  'bg-white border border-slate-200',
  clickable: 'bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all',
}

export function CardHeader({ children, className = '' }) {
  return <div className={`px-6 py-4 border-b border-slate-100 ${className}`}>{children}</div>
}

export function CardContent({ children, className = '' }) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }) {
  return <div className={`px-6 py-4 border-t border-slate-100 ${className}`}>{children}</div>
}

export default function Card({ variant = 'default', children, className = '', onClick }) {
  return (
    <div
      className={`rounded-2xl ${variantClass[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
