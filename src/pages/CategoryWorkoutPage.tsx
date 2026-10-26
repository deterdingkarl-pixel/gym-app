import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { WorkoutEditor } from '../components/WorkoutEditor'
import { localDate } from '../lib/date'
import { buildDraft, findOpenWorkout } from '../lib/training'
import { newId, type Workout, type WorkoutKind } from '../lib/types'
import { useStore } from '../state/store'
import { NotFoundPage } from './NotFoundPage'

const KINDS: WorkoutKind[] = ['beine', 'arme', 'brust', 'frei']

/**
 * Training nach Kategorie: setzt das heutige Training fort oder bereitet ein neues vor.
 * Ein neues Training wird erst gespeichert, wenn du etwas einträgst oder änderst.
 */
export function CategoryWorkoutPage() {
  const { kind } = useParams()
  if (!KINDS.includes(kind as WorkoutKind)) return <NotFoundPage />
  return <CategoryWorkout key={kind} kind={kind as WorkoutKind} />
}

function CategoryWorkout({ kind }: { kind: WorkoutKind }) {
  const { data, save } = useStore()
  const navigate = useNavigate()
  const [draft] = useState<Workout>(() => {
    const today = localDate()
    const open = findOpenWorkout(data.workouts, kind, today)
    if (open) return open
    const plan = kind === 'frei' ? undefined : data.plans.find((p) => !p.deleted && p.category === kind)
    return buildDraft({ id: newId(), kind, date: today, plan, workouts: data.workouts, newUid: newId })
  })
  const stored = data.workouts.find((w) => w.id === draft.id)
  const workout = stored ?? draft

  return (
    <WorkoutEditor
      workout={workout}
      onChange={(next) => void save('workouts', next)}
      onFinish={() => {
        if (stored && workout.startedAt !== null && workout.finishedAt === null)
          void save('workouts', { ...workout, finishedAt: Date.now() })
        navigate('/')
      }}
    />
  )
}
