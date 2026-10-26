import { useMemo, useState } from 'react'
import { normalizeName } from '../data/exercises'
import { MUSCLES, type Muscle } from '../lib/types'
import { useStore } from '../state/store'
import { Sheet } from './ui'

/**
 * Die eine Übungsauswahl für die ganze App (Training, Pläne, freies Training):
 * Suche + Filter nach Muskelgruppe + optional „eigene Übung erstellen“.
 */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  title = 'Übung wählen',
}: {
  open: boolean
  onClose: () => void
  onPick: (exerciseId: string) => void
  title?: string
}) {
  const { exercises, createExercise } = useStore()
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<Muscle | ''>('')
  const [newMuscle, setNewMuscle] = useState<Muscle>('Brust')

  const q = normalizeName(query)
  const filtered = useMemo(
    () => exercises.filter((e) => (!muscle || e.muscle === muscle) && (!q || normalizeName(e.name).includes(q))),
    [exercises, muscle, q],
  )
  const groups = useMemo(() => {
    const map = new Map<Muscle, typeof filtered>()
    for (const e of filtered) map.set(e.muscle, [...(map.get(e.muscle) ?? []), e])
    return MUSCLES.filter((m) => map.has(m)).map((m) => [m, map.get(m)!] as const)
  }, [filtered])
  const exactExists = exercises.some((e) => normalizeName(e.name) === q)

  const close = () => {
    setQuery('')
    setMuscle('')
    onClose()
  }
  const pick = (id: string) => {
    onPick(id)
    close()
  }

  return (
    <Sheet open={open} onClose={close} title={title}>
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 mb-3 flex flex-col gap-2 bg-white px-4 pt-4 pb-2 dark:bg-zinc-900">
        <input
          className="field"
          type="search"
          placeholder="Suchen …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <select className="field" value={muscle} onChange={(e) => setMuscle(e.target.value as Muscle | '')} aria-label="Muskelgruppe">
          <option value="">Alle Muskelgruppen</option>
          {MUSCLES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {q && !exactExists && (
        <div className="mb-4 rounded-xl border border-dashed border-zinc-300 p-3 dark:border-zinc-700">
          <p className="mb-2 text-sm text-zinc-500">Eigene Übung „{query.trim()}“ anlegen</p>
          <div className="flex gap-2">
            <select className="field flex-1" value={newMuscle} onChange={(e) => setNewMuscle(e.target.value as Muscle)} aria-label="Muskelgruppe der neuen Übung">
              {MUSCLES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" onClick={async () => pick(await createExercise(query, newMuscle))}>
              Anlegen
            </button>
          </div>
        </div>
      )}

      {groups.length === 0 && <p className="py-6 text-center text-zinc-500">Keine Übung gefunden.</p>}
      {groups.map(([m, list]) => (
        <div key={m} className="mb-3">
          <h3 className="mb-1 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{m}</h3>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {list.map((e) => (
              <li key={e.id}>
                <button className="flex min-h-12 w-full items-center text-left" onClick={() => pick(e.id)}>
                  {e.name}
                  {e.id.startsWith('c-') && <span className="ml-2 text-xs text-zinc-400">eigene</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Sheet>
  )
}
