import { useState } from 'react'
import { useParams } from 'react-router'
import { ExercisePicker } from '../components/ExercisePicker'
import { IconDown, IconMinus, IconPlus, IconTrash, IconUp } from '../components/Icons'
import { NumberField, PageHeader, SavedIndicator } from '../components/ui'
import { fromDisplayWeight, toDisplayWeight } from '../lib/numbers'
import { newId, type Plan, type PlanExercise, type TargetSet } from '../lib/types'
import { useStore } from '../state/store'
import { NotFoundPage } from './NotFoundPage'

/**
 * Plan bearbeiten. Die Zielwerte hier sind nur der Startwert für Übungen ohne Historie –
 * danach schlägt das Training immer die Werte vom letzten Mal vor.
 */
export function PlanEditPage() {
  const { id } = useParams()
  const { data, save, exerciseById, settings } = useStore()
  const [picking, setPicking] = useState(false)
  const plan = data.plans.find((p) => p.id === id && !p.deleted)
  if (!plan) return <NotFoundPage text="Diesen Plan gibt es nicht." />
  const unit = settings.unit

  const update = (exercises: PlanExercise[]) => void save('plans', { ...plan, exercises } satisfies Plan)
  const updateEx = (i: number, patch: Partial<PlanExercise>) => update(plan.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  const updateSet = (i: number, s: number, patch: Partial<TargetSet>) =>
    updateEx(i, { sets: plan.exercises[i].sets.map((x, k) => (k === s ? { ...x, ...patch } : x)) })
  const move = (i: number, dir: -1 | 1) => {
    const list = [...plan.exercises]
    const j = i + dir
    if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    update(list)
  }

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={plan.name} back right={<SavedIndicator />} />
      <p className="px-1 text-sm text-zinc-500">
        Zielwerte gelten nur, bis du eine Übung zum ersten Mal trainiert hast. Danach schlägt die App die Werte vom letzten Training vor.
      </p>

      {plan.exercises.map((ex, i) => (
        <section key={ex.uid} className="card flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <h2 className="min-w-0 flex-1 text-lg leading-tight font-semibold">{exerciseById.get(ex.exerciseId)?.name ?? 'Unbekannte Übung'}</h2>
            <button className="flex size-11 items-center justify-center text-zinc-500 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Nach oben">
              <IconUp className="size-5" />
            </button>
            <button
              className="flex size-11 items-center justify-center text-zinc-500 disabled:opacity-30"
              disabled={i === plan.exercises.length - 1}
              onClick={() => move(i, 1)}
              aria-label="Nach unten"
            >
              <IconDown className="size-5" />
            </button>
            <button
              className="flex size-11 items-center justify-center text-zinc-500"
              aria-label="Übung aus Plan entfernen"
              onClick={() => window.confirm('Übung aus dem Plan entfernen?') && update(plan.exercises.filter((_, j) => j !== i))}
            >
              <IconTrash className="size-5" />
            </button>
          </div>

          <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
            <span className="text-center text-xs text-zinc-400">#</span>
            <span className="text-center text-xs text-zinc-400">Gewicht ({unit})</span>
            <span className="text-center text-xs text-zinc-400">Wdh.</span>
            {ex.sets.map((s, k) => (
              <div key={k} className="contents">
                <span className="text-center text-sm text-zinc-400">{k + 1}</span>
                <NumberField
                  label={`Satz ${k + 1} Zielgewicht`}
                  value={toDisplayWeight(s.weight, unit)}
                  onChange={(v) => updateSet(i, k, { weight: fromDisplayWeight(v, unit) })}
                />
                <NumberField label={`Satz ${k + 1} Ziel-Wiederholungen`} decimal={false} value={s.reps} onChange={(v) => updateSet(i, k, { reps: v })} />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-secondary flex-1 text-sm"
              onClick={() => updateEx(i, { sets: [...ex.sets, { ...(ex.sets[ex.sets.length - 1] ?? { weight: null, reps: null }) }] })}
            >
              <IconPlus className="size-4" /> Satz
            </button>
            <button className="btn btn-secondary flex-1 text-sm" disabled={ex.sets.length <= 1} onClick={() => updateEx(i, { sets: ex.sets.slice(0, -1) })}>
              <IconMinus className="size-4" /> Satz
            </button>
          </div>
          <input
            className="field"
            placeholder="Notiz (z. B. Sitzhöhe 4)"
            value={ex.note}
            onChange={(e) => updateEx(i, { note: e.target.value })}
            aria-label="Notiz zur Übung"
          />
        </section>
      ))}

      <button className="btn btn-secondary" onClick={() => setPicking(true)}>
        <IconPlus className="size-5" /> Übung hinzufügen
      </button>
      <ExercisePicker
        open={picking}
        title="Übung zum Plan hinzufügen"
        onClose={() => setPicking(false)}
        onPick={(exerciseId) =>
          update([...plan.exercises, { uid: newId(), exerciseId, note: '', sets: [{ weight: null, reps: null }, { weight: null, reps: null }] }])
        }
      />
    </div>
  )
}
