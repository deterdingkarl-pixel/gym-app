import { useMemo, useState } from 'react'
import { muscleSets, periodTotals, RADAR_GROUPS, weeklyTotals, type Totals } from '../lib/activity'
import { addDays, formatDuration, formatShortDate, localDate } from '../lib/date'
import { formatNumber, toDisplayWeight } from '../lib/numbers'
import { activeWorkouts, hasEntries } from '../lib/training'
import { useStore } from '../state/store'
import { BarChart, RadarChart } from './Charts'
import { Empty, Segmented } from './ui'

type Range = '4w' | '3m' | '12m' | 'all'
type Metric = 'duration' | 'volume' | 'reps'

const RANGE_DAYS: Record<Exclude<Range, 'all'>, number> = { '4w': 28, '3m': 91, '12m': 364 }

const compact = (v: number) => (v >= 10_000 ? `${formatNumber(v / 1000, 0)}k` : v >= 1000 ? `${formatNumber(v / 1000, 1)}k` : formatNumber(v, 0))

function Change({ diff, text }: { diff: number; text: string }) {
  if (diff === 0) return <span className="text-zinc-500">→ gleich</span>
  return <span className={diff > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{diff > 0 ? '↑' : '↓'} {text}</span>
}

/** Statistik über einen wählbaren Zeitraum: Wochenbalken, Summen mit Vergleich zum Zeitraum davor, Muskelverteilung. */
export function StatsView() {
  const { data, exerciseById, settings } = useStore()
  const unit = settings.unit
  const [range, setRange] = useState<Range>('3m')
  const [metric, setMetric] = useState<Metric>('volume')
  const today = localDate()

  const stats = useMemo(() => {
    const first = activeWorkouts(data.workouts).filter(hasEntries).at(-1)?.date
    if (!first) return null
    const from = range === 'all' ? first : addDays(today, -(RANGE_DAYS[range] - 1))
    const previous = range === 'all' ? null : { from: addDays(from, -RANGE_DAYS[range]), to: addDays(from, -1) }
    const muscleOf = (id: string) => exerciseById.get(id)?.muscle
    return {
      weeks: weeklyTotals(data.workouts, from, today),
      totals: periodTotals(data.workouts, from, today),
      previousTotals: previous && periodTotals(data.workouts, previous.from, previous.to),
      muscles: muscleSets(data.workouts, muscleOf, from, today),
      previousMuscles: previous ? muscleSets(data.workouts, muscleOf, previous.from, previous.to) : undefined,
    }
  }, [data.workouts, exerciseById, range, today])

  if (!stats) return <Empty>Sobald du Sätze eingetragen hast, siehst du hier deine Statistik.</Empty>

  const valueOf = (t: Totals) => (metric === 'duration' ? t.durationMs / 3_600_000 : metric === 'volume' ? (toDisplayWeight(t.volume, unit) ?? 0) : t.reps)
  const format = (v: number) => (metric === 'duration' ? `${formatNumber(v, 1)} h` : metric === 'volume' ? `${compact(v)} ${unit}` : compact(v))
  const { totals, previousTotals } = stats

  return (
    <>
      <select className="field" value={range} onChange={(e) => setRange(e.target.value as Range)} aria-label="Zeitraum">
        <option value="4w">Letzte 4 Wochen</option>
        <option value="3m">Letzte 3 Monate</option>
        <option value="12m">Letzte 12 Monate</option>
        <option value="all">Gesamte Zeit</option>
      </select>

      <div className="card flex flex-col gap-3">
        <div>
          <span className="text-2xl font-bold tabular-nums">{format(valueOf(stats.weeks.at(-1)!))}</span>
          <span className="ml-2 text-zinc-500">diese Woche</span>
        </div>
        <BarChart bars={stats.weeks.map((w) => ({ label: formatShortDate(w.week), value: valueOf(w) }))} format={format} />
        <Segmented<Metric>
          value={metric}
          options={[
            ['duration', 'Dauer'],
            ['volume', 'Volumen'],
            ['reps', 'Wdh.'],
          ]}
          onChange={setMetric}
        />
        {metric === 'volume' && <p className="text-sm text-zinc-500">Volumen = Gewicht × Wiederholungen aller erledigten Sätze, pro Woche.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-sm text-zinc-500">Trainings</div>
          <div className="text-2xl font-bold tabular-nums">{totals.workouts}</div>
          {previousTotals && (
            <div className="text-sm">
              <Change diff={totals.workouts - previousTotals.workouts} text={String(Math.abs(totals.workouts - previousTotals.workouts))} />
            </div>
          )}
        </div>
        <div className="card">
          <div className="text-sm text-zinc-500">Dauer</div>
          <div className="text-2xl font-bold tabular-nums">{formatDuration(totals.durationMs)}</div>
          {previousTotals && (
            <div className="text-sm">
              <Change diff={totals.durationMs - previousTotals.durationMs} text={formatDuration(Math.abs(totals.durationMs - previousTotals.durationMs))} />
            </div>
          )}
        </div>
      </div>
      {previousTotals && <p className="px-1 text-sm text-zinc-500">Pfeile: Vergleich mit dem gleich langen Zeitraum davor.</p>}

      <div className="card flex flex-col gap-2">
        <h2 className="font-semibold">Muskelverteilung</h2>
        <RadarChart axes={RADAR_GROUPS} current={stats.muscles} previous={stats.previousMuscles} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-emerald-500" /> Dieser Zeitraum
          </span>
          {stats.previousMuscles && (
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-zinc-400" /> Zeitraum davor
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500">Gezählt werden erledigte Sätze je Muskelgruppe.</p>
      </div>
    </>
  )
}
