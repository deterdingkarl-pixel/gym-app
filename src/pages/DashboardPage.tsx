import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { IconBack, IconChevron } from '../components/Icons'
import { Sheet } from '../components/ui'
import { YearHeatmap } from '../components/YearHeatmap'
import { dayStatuses, type DayStatus } from '../lib/activity'
import { addDays, formatDate, localDate, parseLocalDate, weekStart } from '../lib/date'
import { formatNumber, toDisplayWeight } from '../lib/numbers'
import { daysInWeek, trainingDays, weekStreak } from '../lib/stats'
import { activeWorkouts, doneSets, hasEntries } from '../lib/training'
import { KIND_NAMES, restDayId } from '../lib/types'
import { useStore } from '../state/store'

const GOAL = 4

const DAY_CLASS: Record<DayStatus, string> = {
  trained: 'bg-emerald-500 font-semibold text-white',
  rest: 'bg-emerald-500/30',
  missed: 'bg-red-500 font-semibold text-white',
}
const STATUS_TEXT: Record<DayStatus, string> = { trained: 'Trainiert', rest: 'Ruhetag', missed: 'Ausgelassen' }

export function DashboardPage() {
  const { data, settings, exerciseById, save, remove } = useStore()
  const today = localDate()
  const [picked, setPicked] = useState<string | null>(null)

  const workouts = useMemo(() => activeWorkouts(data.workouts).filter(hasEntries), [data.workouts])
  const days = useMemo(() => trainingDays(data.workouts), [data.workouts])
  const rest = useMemo(() => new Set(data.restdays.filter((r) => !r.deleted).map((r) => r.date)), [data.restdays])
  const statuses = useMemo(() => dayStatuses(days, rest, today), [days, rest, today])

  const streak = weekStreak(days, today, GOAL)
  const thisWeek = daysInWeek(days, today)
  const last = workouts[0]
  const month = today.slice(0, 7)
  const monthCount = [...days].filter((d) => d.startsWith(month)).length
  const weight = data.bodyweights.filter((b) => !b.deleted).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.updatedAt - a.updatedAt))[0]
  const firstYear = Number(([...statuses.keys()][0] ?? today).slice(0, 4))
  const pickedStatus = picked ? statuses.get(picked) : undefined

  const toggleRest = (date: string) =>
    void (rest.has(date) ? remove('restdays', restDayId(date)) : save('restdays', { id: restDayId(date), date, updatedAt: 0, deleted: false }))

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold tracking-tight">Übersicht</h1>

      {!statuses.has(today) && (
        <div className="card flex items-center gap-3">
          <span className="flex-1 text-sm text-zinc-500">Heute ist noch nichts eingetragen.</span>
          <button className="btn btn-secondary" onClick={() => toggleRest(today)}>
            Ruhetag eintragen
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="text-sm text-zinc-500">Wochenserie</div>
          <div className="text-3xl font-bold tabular-nums">{streak}</div>
          <div className="text-xs text-zinc-500">Wochen mit ≥ {GOAL} Tagen</div>
        </div>
        <div className="card">
          <div className="text-sm text-zinc-500">Diese Woche</div>
          <div className="text-3xl font-bold tabular-nums">
            {thisWeek}
            <span className="text-lg font-normal text-zinc-400"> / {GOAL}</span>
          </div>
          <div className="mt-1 flex gap-1">
            {Array.from({ length: GOAL }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < thisWeek ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
            ))}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-zinc-500">Trainingstage im Monat</div>
          <div className="text-3xl font-bold tabular-nums">{monthCount}</div>
        </div>
        <div className="card">
          <div className="text-sm text-zinc-500">Körpergewicht</div>
          <div className="text-3xl font-bold tabular-nums">
            {weight ? formatNumber(toDisplayWeight(weight.weight, settings.unit), 1) : '–'}
            {weight && <span className="text-lg font-normal text-zinc-400"> {settings.unit}</span>}
          </div>
        </div>
      </div>

      <YearHeatmap statuses={statuses} today={today} firstYear={firstYear} workoutCount={(year) => workouts.filter((w) => w.date.startsWith(String(year))).length} />

      <Calendar statuses={statuses} today={today} onPick={setPicked} />
      <p className="px-1 text-sm text-zinc-500">
        Tippe im Kalender auf einen Tag, um einen Ruhetag einzutragen. Ein Tag ohne Training und ohne Ruhetag gilt als ausgelassen.
      </p>

      {last && (
        <Link to={`/workout/${last.id}`} className="card flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-zinc-500">Letzte Einheit</div>
            <div className="font-semibold">
              {KIND_NAMES[last.kind]} · {formatDate(last.date)}
            </div>
            <div className="truncate text-sm text-zinc-500">
              {last.exercises
                .filter((e) => doneSets(e).length > 0)
                .map((e) => exerciseById.get(e.exerciseId)?.name)
                .join(', ')}
            </div>
          </div>
          <IconChevron className="size-5 shrink-0 text-zinc-400" />
        </Link>
      )}
      <Link to="/verlauf" className="btn btn-secondary">
        Alle Trainings ansehen
      </Link>

      {picked && (
        <Sheet open onClose={() => setPicked(null)} title={formatDate(picked)}>
          <div className="flex flex-col gap-3">
            <p className="text-zinc-500">{pickedStatus ? STATUS_TEXT[pickedStatus] : picked === today ? 'Heute noch offen' : 'Kein Eintrag'}</p>
            {workouts
              .filter((w) => w.date === picked)
              .map((w) => (
                <Link key={w.id} to={`/workout/${w.id}`} className="btn btn-secondary justify-between">
                  {KIND_NAMES[w.kind]} <IconChevron className="size-5 text-zinc-400" />
                </Link>
              ))}
            <button className={`btn ${rest.has(picked) ? 'btn-danger' : 'btn-primary'}`} onClick={() => toggleRest(picked)}>
              {rest.has(picked) ? 'Ruhetag entfernen' : 'Als Ruhetag eintragen'}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  )
}

function Calendar({ statuses, today, onPick }: { statuses: Map<string, DayStatus>; today: string; onPick: (date: string) => void }) {
  const [offset, setOffset] = useState(0)
  const base = parseLocalDate(today)
  const first = new Date(base.getFullYear(), base.getMonth() + offset, 1)
  const firstStr = localDate(first)
  const start = weekStart(firstStr)
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const monthKey = firstStr.slice(0, 7)
  const visible = cells.slice(0, cells.findLastIndex((d) => d.startsWith(monthKey)) + 1)
  const rows = Math.ceil(visible.length / 7) * 7

  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <button className="flex size-11 items-center justify-center" onClick={() => setOffset(offset - 1)} aria-label="Vorheriger Monat">
          <IconBack className="size-5" />
        </button>
        <span className="font-semibold">{first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</span>
        <button
          className="flex size-11 items-center justify-center disabled:opacity-30"
          disabled={offset >= 0}
          onClick={() => setOffset(offset + 1)}
          aria-label="Nächster Monat"
        >
          <IconChevron className="size-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => (
          <span key={d}>{d}</span>
        ))}
        {cells.slice(0, rows).map((d) => {
          const status = statuses.get(d)
          const cls = `flex aspect-square items-center justify-center rounded-lg text-sm ${d === today ? 'ring-2 ring-zinc-400' : ''}`
          if (!d.startsWith(monthKey) || d > today)
            return (
              <span key={d} className={`${cls} text-zinc-300 dark:text-zinc-700`}>
                {Number(d.slice(8))}
              </span>
            )
          return (
            <button
              key={d}
              className={`${cls} ${status ? DAY_CLASS[status] : 'text-zinc-700 dark:text-zinc-300'}`}
              onClick={() => onPick(d)}
              aria-label={`${Number(d.slice(8))}. ${status ? STATUS_TEXT[status] : 'kein Eintrag'}`}
            >
              {Number(d.slice(8))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
