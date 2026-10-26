import { Link } from 'react-router'
import { IconChevron } from '../components/Icons'
import { Empty } from '../components/ui'
import { formatDate, formatDuration, parseLocalDate } from '../lib/date'
import { activeWorkouts, doneSets, workoutDuration } from '../lib/training'
import { KIND_NAMES } from '../lib/types'
import { useStore } from '../state/store'

export function HistoryPage() {
  const { data, exerciseById } = useStore()
  const workouts = activeWorkouts(data.workouts)
  const now = Date.now()

  const months = new Map<string, typeof workouts>()
  for (const w of workouts) {
    const key = w.date.slice(0, 7)
    months.set(key, [...(months.get(key) ?? []), w])
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold tracking-tight">Verlauf</h1>
      {workouts.length === 0 && <Empty>Noch keine Trainings eingetragen.</Empty>}
      {[...months].map(([month, list]) => (
        <section key={month}>
          <h2 className="mb-1 px-1 text-sm font-semibold text-zinc-500">
            {parseLocalDate(`${month}-01`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </h2>
          <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
            {list.map((w) => {
              const exercises = w.exercises.filter((e) => doneSets(e).length > 0)
              const sets = exercises.reduce((n, e) => n + doneSets(e).length, 0)
              const dur = workoutDuration(w, now)
              return (
                <li key={w.id}>
                  <Link to={`/workout/${w.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {KIND_NAMES[w.kind]} <span className="font-normal text-zinc-500">· {formatDate(w.date)}</span>
                      </div>
                      <div className="truncate text-sm text-zinc-500">
                        {sets === 0
                          ? 'Keine erledigten Sätze'
                          : `${exercises.length} ${exercises.length === 1 ? 'Übung' : 'Übungen'} · ${sets} ${sets === 1 ? 'Satz' : 'Sätze'}${dur ? ` · ${formatDuration(dur)}` : ''} · ${exercises
                              .map((e) => exerciseById.get(e.exerciseId)?.name)
                              .join(', ')}`}
                      </div>
                    </div>
                    <IconChevron className="size-5 shrink-0 text-zinc-400" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
