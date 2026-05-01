// frontend/src/components/ShiftCell.jsx
export default function ShiftCell({ shift, color, bg, onClick, editable = false, locked = false }) {
  if (locked) {
    return (
      <div
        className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
        style={{ background: bg ?? '#F1F5F9', color: color ?? '#64748B' }}
      >
        <span>🔒</span>
        <span>{shift}</span>
      </div>
    )
  }

  if (!shift) {
    return (
      <div
        onClick={editable ? onClick : undefined}
        className={`flex items-center justify-center px-2 py-1 rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-300 min-h-8
          ${editable ? 'hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors' : ''}`}
      >
        —
      </div>
    )
  }

  return (
    <div
      onClick={editable ? onClick : undefined}
      className={`flex items-center justify-center px-2 py-1 rounded-lg text-xs font-semibold
        ${editable ? 'hover:opacity-80 cursor-pointer transition-opacity' : ''}`}
      style={{ background: bg ?? '#F1F5F9', color: color ?? '#475569' }}
    >
      {shift}
    </div>
  )
}
