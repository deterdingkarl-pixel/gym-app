import { useMemo, useState } from 'react'
import { PageHeader, Sheet } from '../components/ui'
import { normalizeName } from '../data/exercises'
import { MUSCLES, type Exercise, type Muscle } from '../lib/types'
import { useStore } from '../state/store'

export function ExercisesPage() {
  const { exercises, data, save, remove, createExercise } = useStore()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | ''>('')
  const [editing, setEditing] = useState<Exercise | 'new' | null>(null)

  const q = normalizeName(query)
  const list = useMemo(
    () => exercises.filter((e) => (!muscle || e.muscle === muscle) && (!q || normalizeName(e.name).includes(q))),
    [exercises, muscle, q],
  )

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title="Übungen"
        back
        right={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            Neu
          </button>
        }
      />
      <input className="field" type="search" placeholder="Suchen …" value={query} onChange={(e) => setQuery(e.target.value)} />
      <select className="field" value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle | '')} aria-label="Muskelgruppe">
        <option value="">Alle Muskelgruppen</option>
        {MUSCLES.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      <p className="px-1 text-sm text-zinc-500">{list.length} Übungen · eigene Übungen kannst du antippen und bearbeiten</p>
      <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
        {list.map((e) => {
          const custom = e.id.startsWith('c-')
          return (
            <li key={e.id}>
              <button
                className="flex min-h-12 w-full items-center gap-2 px-4 py-2 text-left disabled:opacity-100"
                disabled={!custom}
                onClick={() => setEditing(e)}
              >
                <span className="flex-1">{e.name}</span>
                {custom && <span className="text-xs text-zinc-400">eigene</span>}
                <span className="text-sm text-zinc-500">{e.muscle}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {editing && (
        <ExerciseForm
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          isNameTaken={(name, ownId) => exercises.some((e) => e.id !== ownId && normalizeName(e.name) === normalizeName(name))}
          onSave={async (name, m) => {
            if (editing === 'new') await createExercise(name, m)
            else await save('exercises', { ...editing, name: name.trim(), muscle: m })
            setEditing(null)
          }}
          onDelete={
            editing === 'new'
              ? undefined
              : async () => {
                  const used = data.workouts.some((w) => !w.deleted && w.exercises.some((x) => x.exerciseId === editing.id))
                  const inPlan = data.plans.some((p) => !p.deleted && p.exercises.some((x) => x.exerciseId === editing.id))
                  const msg = inPlan
                    ? 'Diese Übung steht in einem Plan. Bitte erst dort entfernen.'
                    : `„${editing.name}“ löschen?${used ? ' Alte Trainings behalten den Namen.' : ''}`
                  if (inPlan) return window.alert(msg)
                  if (!window.confirm(msg)) return
                  await remove('exercises', editing.id)
                  setEditing(null)
                }
          }
        />
      )}
    </div>
  )
}

function ExerciseForm({
  initial,
  onClose,
  onSave,
  onDelete,
  isNameTaken,
}: {
  initial: Exercise | null
  onClose: () => void
  onSave: (name: string, muscle: Muscle) => Promise<void>
  onDelete?: () => Promise<void>
  isNameTaken: (name: string, ownId?: string) => boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [muscle, setMuscle] = useState<Muscle>(initial?.muscle ?? 'Brust')
  const taken = name.trim() !== '' && isNameTaken(name, initial?.id)
  return (
    <Sheet open onClose={onClose} title={initial ? 'Übung bearbeiten' : 'Neue Übung'}>
      <div className="flex flex-col gap-3">
        <input className="field" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Name" />
        {taken && <p className="text-sm text-red-600">Eine Übung mit diesem Namen gibt es schon.</p>}
        <select className="field" value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle)} aria-label="Muskelgruppe">
          {MUSCLES.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <button className="btn btn-primary" disabled={!name.trim() || taken} onClick={() => void onSave(name, muscle)}>
          Speichern
        </button>
        {onDelete && (
          <button className="btn btn-danger" onClick={() => void onDelete()}>
            Löschen
          </button>
        )}
      </div>
    </Sheet>
  )
}
