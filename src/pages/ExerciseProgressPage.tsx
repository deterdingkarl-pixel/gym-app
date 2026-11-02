import { useMemo } from 'react'
import { useParams } from 'react-router'
import { LineChart } from '../components/LineChart'
import { Empty, PageHeader } from '../components/ui'
import { formatDate } from '../lib/date'
import { formatNumber, toDisplayWeight } from '../lib/numbers'
import { exerciseProgress, personalRecords } from '../lib/stats'
import { useStore } from '../state/store'
import { NotFoundPage } from './NotFoundPage'

/** Verlauf einer einzelnen Übung: Bestleistungen, Diagramm und alle Trainings. */
export function ExerciseProgressPage() {
  const { id = '' } = useParams()
  const { data, exerciseById, settings } = useStore()
  const unit = settings.unit
  const points = useMemo(() => exerciseProgress(data.workouts, id), [data.workouts, id])
  const exercise = exerciseById.get(id)
  if (!exercise) return <NotFoundPage text="Diese Übung gibt es nicht." />
  const pr = personalRecords(points)
  const w = (kg: number) => formatNumber(toDisplayWeight(kg, unit), 1)

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={exercise.name} back />
      {points.length === 0 ? (
        <Empty>Diese Übung hast du noch nicht trainiert.</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <div className="text-sm text-zinc-500">Schwerster Satz</div>
              <div className="text-xl font-semibold tabular-nums">{pr.heaviest ? `${w(pr.heaviest.weight)} ${unit} × ${pr.heaviest.reps}` : '–'}</div>
              {pr.heaviest && <div className="text-xs text-zinc-500">{formatDate(pr.heaviest.date)}</div>}
            </div>
            <div className="card">
              <div className="text-sm text-zinc-500">Bestes 1RM (geschätzt)</div>
              <div className="text-xl font-semibold tabular-nums">{pr.best1RM ? `${w(pr.best1RM.value)} ${unit}` : '–'}</div>
              {pr.best1RM && <div className="text-xs text-zinc-500">{formatDate(pr.best1RM.date)}</div>}
            </div>
          </div>

          {points.length > 1 ? (
            <div className="card">
              <LineChart
                unit={unit}
                series={[
                  {
                    name: 'Gewicht',
                    colorClass: 'text-zinc-900 dark:text-zinc-100',
                    points: points.map((p) => ({ date: p.date, value: toDisplayWeight(p.bestWeight, unit)! })),
                  },
                  {
                    name: 'geschätztes 1RM',
                    colorClass: 'text-zinc-400',
                    dashed: true,
                    points: points.map((p) => ({ date: p.date, value: toDisplayWeight(p.best1RM, unit)! })),
                  },
                ]}
              />
            </div>
          ) : (
            <Empty>Für ein Diagramm braucht es mindestens zwei Trainings dieser Übung.</Empty>
          )}

          <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
            {[...points].reverse().map((p) => (
              <li key={p.workoutId} className="flex min-h-12 items-center gap-3 px-4">
                <span className="flex-1">{formatDate(p.date)}</span>
                <span className="tabular-nums">
                  {w(p.bestWeight)} {unit} × {p.bestWeightReps}
                </span>
                <span className="w-20 text-right text-sm text-zinc-500 tabular-nums">1RM {w(p.best1RM)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
