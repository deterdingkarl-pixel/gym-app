import { useEffect, useMemo, useState } from 'react'
import { formatDuration, isValidLocalDate, localDate } from '../lib/date'
import { fromDisplayWeight, toDisplayWeight } from '../lib/numbers'
import { isRunning, prefillSets, workoutDuration } from '../lib/training'
import { KIND_NAMES, newId, type Workout, type WorkoutSet } from '../lib/types'
import { useStore } from '../state/store'
import { ExercisePicker } from './ExercisePicker'
import { IconCheck, IconMinus, IconPlus, IconSwap, IconTrash } from './Icons'
import { NumberField, SavedIndicator } from './ui'

/**
 * Markiert Start und letzten Eintrag – Grundlage für die Trainingsdauer.
 * Nur für ein Training, das heute live läuft; Nachtragen und spätere Korrekturen ändern die Dauer nicht.
 */
function touch(w: Workout, now = Date.now()): Workout {
  if (w.finishedAt !== null) return w
  if (w.startedAt === null) return w.date === localDate(new Date(now)) ? { ...w, startedAt: now, lastEntryAt: now } : w
  return isRunning(w, now) ? { ...w, lastEntryAt: now } : w
}

export function WorkoutEditor({ workout, onChange, onFinish }: { workout: Workout; onChange: (w: Workout) => void; onFinish?: () => void }) {
  const { exerciseById, settings, data } = useStore()
  const unit = settings.unit
  const [picker, setPicker] = useState<{ mode: 'add' } | { mode: 'swap'; index: number } | null>(null)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(t)
  }, [])

  const notes = useMemo(() => {
    const plan = data.plans.find((p) => !p.deleted && p.category === workout.kind)
    return new Map((plan?.exercises ?? []).map((e) => [e.exerciseId, e.note]))
  }, [data.plans, workout.kind])

  const duration = workoutDuration(workout, now)

  const updateSets = (exIndex: number, fn: (sets: WorkoutSet[]) => WorkoutSet[], markEntry: boolean) => {
    const exercises = workout.exercises.map((e, i) => (i === exIndex ? { ...e, sets: fn(e.sets) } : e))
    const next = { ...workout, exercises }
    onChange(markEntry ? touch(next) : next)
  }

  const setValue = (exIndex: number, setIndex: number, patch: Partial<WorkoutSet>) =>
    updateSets(exIndex, (sets) => sets.map((s, i) => (i === setIndex ? { ...s, ...patch, done: true } : s)), true)

  const toggleDone = (exIndex: number, setIndex: number) => {
    const becomesDone = !workout.exercises[exIndex].sets[setIndex].done
    updateSets(exIndex, (sets) => sets.map((s, i) => (i === setIndex ? { ...s, done: becomesDone } : s)), becomesDone)
  }

  const onPick = (exerciseId: string) => {
    if (!picker) return
    const sets = prefillSets(data.workouts, exerciseId, undefined, workout.id)
    if (picker.mode === 'add') {
      onChange({ ...workout, exercises: [...workout.exercises, { uid: newId(), exerciseId, sets }] })
    } else {
      onChange({
        ...workout,
        exercises: workout.exercises.map((e, i) => (i === picker.index ? { ...e, exerciseId, sets } : e)),
      })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="card flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{KIND_NAMES[workout.kind]}</h1>
          <SavedIndicator />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="field max-w-44"
            aria-label="Datum"
            value={workout.date}
            onChange={(e) => isValidLocalDate(e.target.value) && onChange({ ...workout, date: e.target.value })}
          />
          <span className="text-zinc-500 tabular-nums">{duration !== null ? `⏱ ${formatDuration(duration)}` : 'Noch kein Satz'}</span>
        </div>
      </div>

      {workout.exercises.length === 0 && (
        <p className="card text-center text-zinc-500">Noch keine Übung. Füge unten eine hinzu.</p>
      )}

      {workout.exercises.map((ex, exIndex) => {
        const info = exerciseById.get(ex.exerciseId)
        const note = notes.get(ex.exerciseId)
        return (
          <section key={ex.uid} className="card">
            <div className="mb-2 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg leading-tight font-semibold">{info?.name ?? 'Unbekannte Übung'}</h2>
                {note && <p className="mt-0.5 text-sm text-zinc-500">{note}</p>}
              </div>
              <button
                className="flex size-11 items-center justify-center rounded-xl text-zinc-500"
                aria-label="Übung tauschen"
                onClick={() => setPicker({ mode: 'swap', index: exIndex })}
              >
                <IconSwap className="size-5" />
              </button>
              <button
                className="flex size-11 items-center justify-center rounded-xl text-zinc-500"
                aria-label="Übung entfernen"
                onClick={() =>
                  window.confirm(`„${info?.name}“ aus diesem Training entfernen?`) &&
                  onChange({ ...workout, exercises: workout.exercises.filter((_, i) => i !== exIndex) })
                }
              >
                <IconTrash className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] items-center gap-2">
              <span className="text-center text-xs text-zinc-400">#</span>
              <span className="text-center text-xs text-zinc-400">Gewicht ({unit})</span>
              <span className="text-center text-xs text-zinc-400">Wdh.</span>
              <span />
              {ex.sets.map((s, setIndex) => (
                <div key={setIndex} className="contents">
                  <span className="text-center text-sm text-zinc-400">{setIndex + 1}</span>
                  <NumberField
                    label={`Satz ${setIndex + 1} Gewicht`}
                    muted={!s.done}
                    value={toDisplayWeight(s.weight, unit)}
                    onChange={(v) => setValue(exIndex, setIndex, { weight: fromDisplayWeight(v, unit) })}
                  />
                  <NumberField
                    label={`Satz ${setIndex + 1} Wiederholungen`}
                    decimal={false}
                    muted={!s.done}
                    value={s.reps}
                    onChange={(v) => setValue(exIndex, setIndex, { reps: v })}
                  />
                  <button
                    className={`flex size-11 items-center justify-center rounded-xl ${
                      s.done ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                    }`}
                    aria-label={s.done ? `Satz ${setIndex + 1} erledigt – zurücknehmen` : `Satz ${setIndex + 1} als erledigt markieren`}
                    aria-pressed={s.done}
                    onClick={() => toggleDone(exIndex, setIndex)}
                  >
                    <IconCheck className="size-6" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-2 flex gap-2">
              <button
                className="btn btn-secondary flex-1 text-sm"
                onClick={() =>
                  updateSets(exIndex, (sets) => [...sets, { ...(sets[sets.length - 1] ?? { weight: null, reps: null }), done: false }], false)
                }
              >
                <IconPlus className="size-4" /> Satz
              </button>
              <button
                className="btn btn-secondary flex-1 text-sm"
                disabled={ex.sets.length <= 1}
                onClick={() => updateSets(exIndex, (sets) => sets.slice(0, -1), false)}
              >
                <IconMinus className="size-4" /> Satz
              </button>
            </div>
          </section>
        )
      })}

      <button className="btn btn-secondary" onClick={() => setPicker({ mode: 'add' })}>
        <IconPlus className="size-5" /> Übung hinzufügen
      </button>
      {onFinish && (
        <button className="btn btn-primary" onClick={onFinish}>
          Fertig
        </button>
      )}

      <p className="px-1 text-center text-sm text-zinc-500">
        Grau = Vorschlag vom letzten Mal. Ein Satz zählt, sobald du ✓ tippst oder einen Wert änderst. Alles wird automatisch gespeichert.
      </p>

      <ExercisePicker
        open={picker !== null}
        title={picker?.mode === 'swap' ? 'Übung tauschen' : 'Übung hinzufügen'}
        onClose={() => setPicker(null)}
        onPick={onPick}
      />
    </div>
  )
}
