import { useMemo, useState } from 'react'
import { LineChart } from '../components/LineChart'
import { Empty } from '../components/ui'
import { formatDate } from '../lib/date'
import { formatNumber, toDisplayWeight } from '../lib/numbers'
import { exerciseProgress, personalRecords, trainedExerciseIds } from '../lib/stats'
import { KIND_NAMES, type WorkoutKind } from '../lib/types'
import { useStore } from '../state/store'

const KIND_ORDER: WorkoutKind[] = ['beine', 'arme', 'brust', 'frei']

export function ProgressPage() {
  const { data, exerciseById, settings } = useStore()
  const unit = settings.unit
  const trained = useMemo(() => trainedExerciseIds(data.workouts), [data.workouts])
  const groups = KIND_ORDER.map((k) => ({
    kind: k,
    ids: [...trained]
      .filter(([, kind]) => kind === k)
      .map(([id]) => id)
      .sort((a, b) => (exerciseById.get(a)?.name ?? '').localeCompare(exerciseById.get(b)?.name ?? '', 'de')),
  })).filter((g) => g.ids.length > 0)

  const [selected, setSelected] = useState<string>('')
  const exerciseId = trained.has(selected) ? selected : (groups[0]?.ids[0] ?? '')
  const points = useMemo(() => (exerciseId ? exerciseProgress(data.workouts, exerciseId) : []), [data.workouts, exerciseId])
  const pr = personalRecords(points)
  const w = (kg: number) => formatNumber(toDisplayWeight(kg, unit), 1)

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-bold tracking-tight">Fortschritt</h1>
      {groups.length === 0 ? (
        <Empty>Sobald du Sätze eingetragen hast, siehst du hier deinen Verlauf.</Empty>
      ) : (
        <>
          <select className="field" value={exerciseId} onChange={(e) => setSelected(e.target.value)} aria-label="Übung">
            {groups.map((g) => (
              <optgroup key={g.kind} label={KIND_NAMES[g.kind]}>
                {g.ids.map((id) => (
                  <option key={id} value={id}>
                    {exerciseById.get(id)?.name ?? id}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-3">
            <div className="card">
              <div className="text-sm text-zinc-500">Schwerster Satz</div>
              <div className="text-xl font-semibold tabular-nums">
                {pr.heaviest ? `${w(pr.heaviest.weight)} ${unit} × ${pr.heaviest.reps}` : '–'}
              </div>
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
            <Empty>Für einen Verlauf braucht es mindestens zwei Trainings dieser Übung.</Empty>
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
