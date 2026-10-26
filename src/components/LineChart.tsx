import { formatShortDate, parseLocalDate } from '../lib/date'
import { formatNumber } from '../lib/numbers'

export interface Series {
  name: string
  /** Tailwind-Klasse für Strich- und Punktfarbe, z. B. "text-zinc-900" */
  colorClass: string
  dashed?: boolean
  points: { date: string; value: number }[]
}

/** Schlichtes Liniendiagramm über die Zeit (ohne Chart-Bibliothek). */
export function LineChart({ series, unit }: { series: Series[]; unit: string }) {
  const all = series.flatMap((s) => s.points)
  if (all.length === 0) return null
  const W = 600
  const H = 220
  const pad = { l: 44, r: 12, t: 12, b: 26 }
  const times = all.map((p) => parseLocalDate(p.date).getTime())
  const values = all.map((p) => p.value)
  let tMin = Math.min(...times)
  let tMax = Math.max(...times)
  if (tMin === tMax) {
    tMin -= 86400000
    tMax += 86400000
  }
  let vMin = Math.min(...values)
  let vMax = Math.max(...values)
  const span = vMax - vMin || Math.max(1, vMax * 0.1)
  vMin -= span * 0.1
  vMax += span * 0.1
  const x = (d: string) => pad.l + ((parseLocalDate(d).getTime() - tMin) / (tMax - tMin)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - vMin) / (vMax - vMin)) * (H - pad.t - pad.b)
  const ticks = [vMin + (vMax - vMin) * 0.1, (vMin + vMax) / 2, vMax - (vMax - vMin) * 0.1]
  const first = all.reduce((a, b) => (a.date < b.date ? a : b)).date
  const last = all.reduce((a, b) => (a.date > b.date ? a : b)).date

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Verlauf">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-zinc-200 dark:stroke-zinc-800" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="fill-zinc-500 text-[12px]">
              {formatNumber(t, 0)}
            </text>
          </g>
        ))}
        <text x={pad.l} y={H - 6} className="fill-zinc-500 text-[12px]">
          {formatShortDate(first)}
        </text>
        <text x={W - pad.r} y={H - 6} textAnchor="end" className="fill-zinc-500 text-[12px]">
          {formatShortDate(last)}
        </text>
        {series.map((s) => {
          const pts = [...s.points].sort((a, b) => (a.date < b.date ? -1 : 1))
          return (
            <g key={s.name} className={s.colorClass}>
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeDasharray={s.dashed ? '6 5' : undefined}
                points={pts.map((p) => `${x(p.date)},${y(p.value)}`).join(' ')}
              />
              {pts.map((p, i) => (
                <circle key={i} cx={x(p.date)} cy={y(p.value)} r={3.5} fill="currentColor" />
              ))}
            </g>
          )
        })}
      </svg>
      {series.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-4 text-sm">
          {series.map((s) => (
            <span key={s.name} className={`flex items-center gap-1.5 ${s.colorClass}`}>
              <span className="inline-block h-0.5 w-5 bg-current" />
              <span className="text-zinc-600 dark:text-zinc-400">
                {s.name} ({unit})
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
