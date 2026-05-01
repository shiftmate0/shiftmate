// frontend/src/components/KPICard.jsx
export default function KPICard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div
      className="bg-white rounded-2xl p-6 border border-slate-100 flex items-start gap-4"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: bg }}
      >
        {Icon && <Icon size={24} style={{ color }} />}
      </div>
      <div className="min-w-0">
        <div className="text-slate-500 text-sm mb-1">{label}</div>
        <div className="font-bold text-slate-800 leading-none" style={{ fontSize: 28 }}>
          {value}
        </div>
        {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
      </div>
    </div>
  )
}
