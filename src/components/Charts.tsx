/** Runder Höchstwert für die Achse (1, 2 oder 5 mal Zehnerpotenz). */
export function niceMax(value: number): number {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const n = value / power
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * power
}

/** Schlichtes Balkendiagramm (ohne Chart-Bibliothek). */
export function BarChart({ bars, format }: { bars: { label: string; value: number }[]; format: (v: number) => string }) {
  const W = 600
  const H = 260
  const pad = { l: 78, r: 6, t: 14, b: 34 }
  const max = niceMax(Math.max(0, ...bars.map((b) => b.value)))
  const step = (W - pad.l - pad.r) / Math.max(1, bars.length)
  const barWidth = Math.max(2, step * 0.72)
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b)
  const labelEvery = Math.max(1, Math.ceil(bars.length / 5))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Verlauf pro Woche">
      {[0, max / 2, max].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-zinc-200 dark:stroke-zinc-800" />
          <text x={pad.l - 8} y={y(t) + 7} textAnchor="end" className="fill-zinc-500 text-[20px]">
            {format(t)}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const x = pad.l + i * step + (step - barWidth) / 2
        return (
          <g key={i}>
            {b.value > 0 && (
              <rect x={x} y={y(b.value)} width={barWidth} height={y(0) - y(b.value)} rx={Math.min(3, barWidth / 3)} className="fill-zinc-800 dark:fill-zinc-200" />
            )}
            {i % labelEvery === 0 && (
              <text x={x + barWidth / 2} y={H - 8} textAnchor="middle" className="fill-zinc-500 text-[20px]">
                {b.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** Spinnennetzdiagramm: aktueller Zeitraum als Fläche, der vorherige als gestrichelte Linie. */
export function RadarChart({ axes, current, previous }: { axes: readonly string[]; current: number[]; previous?: number[] }) {
  const C = 150
  const R = 92
  const max = Math.max(1, ...current, ...(previous ?? []))
  const point = (i: number, share: number): [number, number] => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / axes.length
    return [C + Math.cos(angle) * R * share, C + Math.sin(angle) * R * share]
  }
  const polygon = (values: number[]) => values.map((v, i) => point(i, v / max).map((n) => n.toFixed(1)).join(',')).join(' ')

  return (
    <svg viewBox="0 0 300 270" className="mx-auto h-auto w-full max-w-sm" role="img" aria-label="Muskelverteilung">
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon key={ring} points={polygon(axes.map(() => ring * max))} fill="none" className="stroke-zinc-200 dark:stroke-zinc-800" />
      ))}
      {axes.map((name, i) => {
        const [x, y] = point(i, 1)
        const [lx, ly] = point(i, 1.2)
        return (
          <g key={name}>
            <line x1={C} y1={C} x2={x} y2={y} className="stroke-zinc-200 dark:stroke-zinc-800" />
            <text x={lx} y={ly + 4} textAnchor={Math.abs(lx - C) < 8 ? 'middle' : lx > C ? 'start' : 'end'} className="fill-zinc-500 text-[15px]">
              {name}
            </text>
          </g>
        )
      })}
      {previous && <polygon points={polygon(previous)} fill="none" strokeWidth={1.5} strokeDasharray="4 4" className="stroke-zinc-400" />}
      <polygon points={polygon(current)} strokeWidth={2} strokeLinejoin="round" className="fill-emerald-500/25 stroke-emerald-500" />
    </svg>
  )
}
