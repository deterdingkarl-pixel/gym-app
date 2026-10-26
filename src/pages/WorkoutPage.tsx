import { useNavigate, useParams } from 'react-router'
import { IconTrash } from '../components/Icons'
import { WorkoutEditor } from '../components/WorkoutEditor'
import { useStore } from '../state/store'
import { NotFoundPage } from './NotFoundPage'

/** Ein gespeichertes Training ansehen und bearbeiten (aus dem Verlauf). */
export function WorkoutPage() {
  const { id } = useParams()
  const { data, save, remove } = useStore()
  const navigate = useNavigate()
  const workout = data.workouts.find((w) => w.id === id && !w.deleted)
  if (!workout) return <NotFoundPage text="Dieses Training gibt es nicht (mehr)." />

  return (
    <div className="flex flex-col gap-3">
      <WorkoutEditor workout={workout} onChange={(next) => void save('workouts', next)} />
      <button
        className="btn btn-danger"
        onClick={async () => {
          if (!window.confirm('Dieses Training wirklich löschen?')) return
          await remove('workouts', workout.id)
          navigate('/verlauf', { replace: true })
        }}
      >
        <IconTrash className="size-5" /> Training löschen
      </button>
    </div>
  )
}
