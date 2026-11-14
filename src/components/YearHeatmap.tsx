import { useMemo, useState } from 'react'
import type { DayStatus } from '../lib/activity'
import { addDays, parseLocalDate } from '../lib/date'
import { IconBack, IconChevron } from './Icons'

const CELL = 10
const STEP = 12
const TOP = 24
const MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']

export const STATUS_FILL: Record<DayStatus, string> = {
  trained: 'fill-emerald-500',
  rest: 'fill-emerald-500/40',
  missed: 'fill-red-500',
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
      {(
        [
          ['bg-emerald-500', 'Training'],
          ['bg-emerald-500/40', 'Ruhetag'],
          ['bg-red-500', 'Ausgelassen'],
        ] as const
      ).map(([color, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`size-3 rounded-sm ${color}`} /> {label}
        </span>
      ))}
    </div>
  )
}

/** Das ganze Jahr auf einen Blick: eine Spalte pro Woche, ein Kästchen pro Tag (Montag oben). */
export function YearHeatmap({
  statuses,
  today,
  firstYear,
  workoutCount,
}: {
  statuses: Map<string, DayStatus>
  today: string
  firstYear: number
  workoutCount: (year: number) => number
}) {
  const currentYear = Number(today.slice(0, 4))
  const [year, setYear] = useState(currentYear)

  const { cells, labels, cols } = useMemo(() => {
    const jan1 = `${year}-01-01`
    const offset = (parseLocalDate(jan1).getDay() + 6) % 7
    const cells: { date: string; x: number; y: number }[] = []
    const labels: { text: string; x: number }[] = []
    for (let i = 0, date = jan1; date.startsWith(String(year)); i++, date = addDays(date, 1)) {
      const index = offset + i
      const x = Math.floor(index / 7) * STEP
      cells.push({ date, x, y: TOP + (index % 7) * STEP })
      if (date.endsWith('-01')) labels.push({ text: MONTHS[Number(date.slice(5, 7)) - 1], x })
    }
    return { cells, labels, cols: Math.ceil((offset + cells.length) / 7) }
  }, [year])

  const count = workoutCount(year)
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-1">
        {firstYear < currentYear && (
          <button className="-ml-2 flex size-9 items-center justify-center disabled:opacity-30" disabled={year <= firstYear} onClick={() => setYear(year - 1)} aria-label="Vorheriges Jahr">
            <IconBack className="size-5" />
          </button>
        )}
        <span className="text-2xl font-bold tabular-nums">{year}</span>
        {firstYear < currentYear && (
          <button className="flex size-9 items-center justify-center disabled:opacity-30" disabled={year >= currentYear} onClick={() => setYear(year + 1)} aria-label="Nächstes Jahr">
            <IconChevron className="size-5" />
          </button>
        )}
        <span className="ml-auto text-zinc-500 tabular-nums">
          {count} {count === 1 ? 'Training' : 'Trainings'}
        </span>
      </div>
      <svg viewBox={`0 0 ${cols * STEP - (STEP - CELL)} ${TOP + 7 * STEP - (STEP - CELL)}`} className="h-auto w-full" role="img" aria-label={`Trainingstage ${year}`}>
        {labels.map((l) => (
          <text key={l.text} x={l.x} y={16} className="fill-zinc-500 text-[17px]">
            {l.text}
          </text>
        ))}
        {cells.map((c) => {
          const status = statuses.get(c.date)
          const cls = status
            ? STATUS_FILL[status]
            : c.date > today
              ? 'fill-transparent stroke-zinc-300 dark:stroke-zinc-700'
              : 'fill-zinc-200 dark:fill-zinc-800'
          return <rect key={c.date} x={c.x} y={c.y} width={CELL} height={CELL} rx={2} className={cls} />
        })}
      </svg>
      <StatusLegend />
    </div>
  )
}
