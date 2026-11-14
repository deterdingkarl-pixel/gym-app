import { Link } from 'react-router'
import { IconChevron } from '../components/Icons'
import { formatDate, localDate } from '../lib/date'
import { activeWorkouts, hasEntries, runningWorkout } from '../lib/training'
import { CATEGORIES, type WorkoutKind } from '../lib/types'
import { useStore } from '../state/store'

export function TrainingHomePage() {
  const { data } = useStore()
  const today = localDate()
  const workouts = activeWorkouts(data.workouts).filter(hasEntries)
  const running = runningWorkout(data.workouts)
  const status = (kind: WorkoutKind) => {
    if (running?.kind === kind) return 'Läuft gerade'
    const last = workouts.find((w) => w.kind === kind)
    if (last?.date === today) return 'Heute begonnen – weitermachen'
    return last ? `Zuletzt: ${formatDate(last.date)}` : 'Noch nicht trainiert'
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold tracking-tight">Training</h1>
      {CATEGORIES.map((c) => (
        <Link key={c.id} to={`/training/${c.id}`} className="card flex min-h-24 items-center gap-3 active:scale-[0.99]">
          <div className="flex-1">
            <div className="text-xl font-semibold">{c.name}</div>
            <div className="mt-0.5 text-sm text-zinc-500">{status(c.id)}</div>
          </div>
          <IconChevron className="size-6 text-zinc-400" />
        </Link>
      ))}
      <Link to="/training/frei" className="card flex min-h-16 items-center gap-3 active:scale-[0.99]">
        <div className="flex-1">
          <div className="font-semibold">Freies Training</div>
          <div className="text-sm text-zinc-500">{running?.kind === 'frei' ? 'Läuft gerade' : 'Für alles außerhalb der drei Pläne'}</div>
        </div>
        <IconChevron className="size-6 text-zinc-400" />
      </Link>
    </div>
  )
}
