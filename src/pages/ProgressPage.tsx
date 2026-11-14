import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { IconChevron } from '../components/Icons'
import { StatsView } from '../components/StatsView'
import { Segmented } from '../components/ui'
import { formatShortDate } from '../lib/date'
import { formatNumber, toDisplayWeight } from '../lib/numbers'
import { progressGroups } from '../lib/stats'
import type { WorkoutKind } from '../lib/types'
import { useStore } from '../state/store'

type View = 'statistik' | 'uebungen'

/** Fortschritt: Statistik über die Zeit oder der Verlauf jeder einzelnen Übung. */
export function ProgressPage() {
  // Die Auswahl steht in der Adresse, damit „Zurück“ aus einer Übung wieder dort landet
  const [params, setParams] = useSearchParams()
  const view: View = params.get('ansicht') === 'uebungen' ? 'uebungen' : 'statistik'

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold tracking-tight">Fortschritt</h1>
      <Segmented<View>
        value={view}
        options={[
          ['statistik', 'Statistik'],
          ['uebungen', 'Übungen'],
        ]}
        onChange={(ansicht) => setParams({ ansicht }, { replace: true })}
      />
      {view === 'statistik' ? <StatsView /> : <ExerciseList plan={params.get('plan')} onPlan={(plan) => setParams({ ansicht: 'uebungen', plan }, { replace: true })} />}
    </div>
  )
}

/** Je Trainingsplan ein Reiter mit allen Übungen, Antippen öffnet den Verlauf der Übung. */
function ExerciseList({ plan, onPlan }: { plan: string | null; onPlan: (plan: WorkoutKind) => void }) {
  const { data, exerciseById, settings } = useStore()
  const unit = settings.unit
  const groups = useMemo(() => progressGroups(data.plans, data.workouts), [data.plans, data.workouts])
  const group = groups.find((g) => g.kind === plan) ?? groups[0]
  const w = (kg: number) => formatNumber(toDisplayWeight(kg, unit), 1)

  return (
    <>
      <Segmented<WorkoutKind> value={group.kind} options={groups.map((g) => [g.kind, g.name])} onChange={onPlan} />
      <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
        {group.exercises.map(({ exerciseId, points }) => {
          const name = exerciseById.get(exerciseId)?.name ?? 'Unbekannte Übung'
          const last = points.at(-1)
          if (!last)
            return (
              <li key={exerciseId} className="flex min-h-16 flex-col justify-center px-4 py-2">
                <div className="font-medium text-zinc-400">{name}</div>
                <div className="text-sm text-zinc-400">Noch nicht trainiert</div>
              </li>
            )
          const previous = points.at(-2)
          const change = previous ? last.bestWeight - previous.bestWeight : 0
          return (
            <li key={exerciseId}>
              <Link to={`/fortschritt/${exerciseId}`} className="flex min-h-16 items-center gap-3 px-4 py-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{name}</div>
                  <div className="text-sm text-zinc-500 tabular-nums">
                    {w(last.bestWeight)} {unit} × {last.bestWeightReps} · {formatShortDate(last.date)}
                  </div>
                </div>
                {change !== 0 && (
                  <span className="shrink-0 text-sm font-medium text-zinc-600 tabular-nums dark:text-zinc-300">
                    {change > 0 ? '+' : '−'}
                    {w(Math.abs(change))} {unit}
                  </span>
                )}
                <IconChevron className="size-5 shrink-0 text-zinc-400" />
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
