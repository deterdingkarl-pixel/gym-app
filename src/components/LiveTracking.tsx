import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { formatClock, formatDuration, localDate } from '../lib/date'
import { isRunning, resumeTracking, runningWorkout, startTracking, stopTracking, withDuration, workoutDuration } from '../lib/training'
import { KIND_NAMES, type Workout } from '../lib/types'
import { useStore } from '../state/store'
import { NumberField, Sheet } from './ui'

/** Aktuelle Uhrzeit, die sich im Takt erneuert. Die Dauer wird immer aus Start und Jetzt berechnet, nie mitgezählt. */
export function useNow(intervalMs: number, active = true): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!active) return
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs, active])
  return now
}

/** Leiste über der Navigation: zeigt das laufende Training auf jeder Seite der App. */
export function LiveBar() {
  const { data } = useStore()
  const running = runningWorkout(data.workouts)
  const now = useNow(1000, running !== undefined)
  const navigate = useNavigate()
  const [stopping, setStopping] = useState(false)
  if (!running) return null
  return (
    <>
      <div className="fixed inset-x-0 z-30 px-3" style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 0.5rem)' }}>
        <div className="mx-auto flex max-w-3xl items-center gap-2 rounded-2xl bg-zinc-900 py-1.5 pr-1.5 pl-4 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
          <button className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left" onClick={() => navigate(`/workout/${running.id}`)}>
            <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-emerald-400 dark:bg-emerald-600" />
            <span className="min-w-0 flex-1 truncate font-medium">{KIND_NAMES[running.kind]}</span>
            <span className="text-lg font-semibold tabular-nums">{formatClock(workoutDuration(running, now) ?? 0)}</span>
          </button>
          <button className="btn bg-white/15 dark:bg-black/10" onClick={() => setStopping(true)}>
            Stopp
          </button>
        </div>
      </div>
      {stopping && <StopTrackingSheet workout={running} onClose={() => setStopping(false)} />}
    </>
  )
}

/** Rückfrage beim Stoppen. Die Dauer lässt sich anpassen, falls das Stoppen vergessen wurde. */
export function StopTrackingSheet({ workout, onClose }: { workout: Workout; onClose: () => void }) {
  const { save } = useStore()
  const now = useNow(1000)
  const [minutes, setMinutes] = useState<number | null>(null)
  const measured = workoutDuration(workout, now) ?? 0
  const start = workout.startedAt
  const lastEntry = workout.lastEntryAt
  const untilLastEntry = start !== null && lastEntry !== null && now - lastEntry > 20 * 60_000 ? lastEntry - start : 0
  const duration = minutes !== null ? minutes * 60_000 : measured

  const stop = async () => {
    await save('workouts', stopTracking(workout, Date.now(), minutes !== null ? minutes * 60_000 : undefined))
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title="Training beenden">
      <div className="flex flex-col gap-3">
        <div className="text-center">
          <div className="text-4xl font-bold tabular-nums">{formatClock(measured)}</div>
          <div className="text-sm text-zinc-500">gemessene Zeit</div>
        </div>
        {untilLastEntry > 60_000 && (
          <button className="btn btn-secondary py-2 text-sm" onClick={() => setMinutes(Math.round(untilLastEntry / 60_000))}>
            Stoppen vergessen? Nur bis zum letzten Eintrag zählen ({formatDuration(untilLastEntry)})
          </button>
        )}
        <div className="flex items-center gap-3">
          <span className="flex-1 text-sm text-zinc-500">Dauer anpassen (Minuten)</span>
          <div className="w-28">
            <NumberField
              label="Dauer in Minuten"
              decimal={false}
              muted={minutes === null}
              value={minutes ?? Math.round(measured / 60_000)}
              onChange={setMinutes}
            />
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => void stop()}>
          Beenden · {formatDuration(duration)}
        </button>
        <button className="btn btn-secondary" onClick={onClose}>
          Weiter trainieren
        </button>
      </div>
    </Sheet>
  )
}

function DurationSheet({ workout, onChange, onClose }: { workout: Workout; onChange: (w: Workout) => void; onClose: () => void }) {
  const current = workoutDuration(workout, 0)
  const [minutes, setMinutes] = useState<number | null>(current !== null ? Math.round(current / 60_000) : null)
  return (
    <Sheet open onClose={onClose} title="Trainingsdauer">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-zinc-500">Für nachgetragene Trainings oder wenn die Zeitmessung nicht gestimmt hat. 0 löscht die Dauer.</p>
        <div className="flex items-center gap-3">
          <span className="flex-1">Dauer in Minuten</span>
          <div className="w-28">
            <NumberField label="Dauer in Minuten" decimal={false} value={minutes} onChange={setMinutes} />
          </div>
        </div>
        <button
          className="btn btn-primary"
          disabled={minutes === null}
          onClick={() => {
            onChange(withDuration(workout, (minutes ?? 0) * 60_000))
            onClose()
          }}
        >
          Speichern
        </button>
      </div>
    </Sheet>
  )
}

/** Zeitmessung im Trainings-Editor: starten, laufende Uhr, stoppen, fortsetzen oder Dauer von Hand setzen. */
export function TrackingControls({ workout, onChange }: { workout: Workout; onChange: (w: Workout) => void }) {
  const { data } = useStore()
  const running = isRunning(workout)
  const now = useNow(1000, running)
  const [sheet, setSheet] = useState<'stop' | 'duration' | null>(null)
  const duration = workoutDuration(workout, now)

  const start = () => {
    const other = runningWorkout(data.workouts)
    if (other && other.id !== workout.id) {
      window.alert(`Es läuft schon ein Training (${KIND_NAMES[other.kind]}). Stoppe es zuerst.`)
      return
    }
    onChange(duration !== null ? resumeTracking(workout, Date.now()) : startTracking(workout, Date.now()))
  }

  return (
    <>
      {running ? (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-3xl font-bold tabular-nums">{formatClock(duration ?? 0)}</div>
            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
              <span className="size-2 animate-pulse rounded-full bg-emerald-500" /> Training läuft
            </div>
          </div>
          <button className="btn btn-primary min-h-12 px-6" onClick={() => setSheet('stop')}>
            Stopp
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {workout.date === localDate() && (
            <button className="btn btn-primary min-h-14 text-lg" onClick={start}>
              {duration !== null ? 'Zeitmessung fortsetzen' : 'Training starten'}
            </button>
          )}
          <button className="min-h-11 text-left text-sm text-zinc-500" onClick={() => setSheet('duration')}>
            {duration !== null ? (
              <>
                Dauer: <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatDuration(duration)}</span> · ändern
              </>
            ) : (
              'Dauer von Hand eintragen'
            )}
          </button>
        </div>
      )}
      {sheet === 'stop' && <StopTrackingSheet workout={workout} onClose={() => setSheet(null)} />}
      {sheet === 'duration' && <DurationSheet workout={workout} onChange={onChange} onClose={() => setSheet(null)} />}
    </>
  )
}
