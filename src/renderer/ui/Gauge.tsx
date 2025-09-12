import { useMemo } from 'react'

type Props = { value: number; max?: number; unit?: string; color?: string }

export function Gauge({ value, max = 100, unit, color = '#22c55e' }: Props) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const stroke = 8
  const r = 48
  const c = 2 * Math.PI * r
  const dash = useMemo(() => (pct / 100) * c, [pct, c])
  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} stroke="#1f2937" strokeWidth={stroke} fill="none" />
        <circle cx="60" cy="60" r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${dash} ${c}`} transform="rotate(-90 60 60)" />
        <text x="60" y="60" dominantBaseline="middle" textAnchor="middle" fill="#e5e7eb" fontSize="16">{value}</text>
      </svg>
      {unit && <div className="text-sm text-neutral-400">{unit}</div>}
    </div>
  )
} 