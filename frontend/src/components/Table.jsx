// frontend/src/components/Table.jsx
export function TableHeader({ children }) {
  return <thead className="bg-slate-50 border-b border-slate-100">{children}</thead>
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-slate-50">{children}</tbody>
}

export function TableRow({ children, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`hover:bg-gray-50 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  )
}

export function TableHead({ children, className = '' }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide ${className}`}>
      {children}
    </th>
  )
}

export function TableCell({ children, className = '' }) {
  return (
    <td className={`px-4 py-3 text-sm text-slate-700 ${className}`}>
      {children}
    </td>
  )
}

function SkeletonRow({ cols }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-slate-100 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

export default function Table({ children, loading = false, skeletonCols = 4, skeletonRows = 5, empty, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-slate-100 ${className}`}>
      <table className="w-full">
        {loading ? (
          <>
            <tbody>
              {Array.from({ length: skeletonRows }).map((_, i) => (
                <SkeletonRow key={i} cols={skeletonCols} />
              ))}
            </tbody>
          </>
        ) : (
          children
        )}
      </table>
      {!loading && empty && (
        <div className="py-12 text-center text-sm text-slate-400">{empty}</div>
      )}
    </div>
  )
}
