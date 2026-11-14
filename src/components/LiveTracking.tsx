import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { formatClock, formatDuration, localDate } from '../lib/date'
import { adjustRest, restRemaining, restVisible, type RestTimer } from '../lib/rest'
import {
  durationUntilLastEntry,
  isRunning,
  looksForgotten,
  resumeTracking,
  runningWorkout,
  startTracking,
  stopTracking,
  withDuration,
  workoutDuration,
} from '../lib/training'
import { KIND_NAMES, type Workout } from '../lib/types'
import { setRestTimer, unlockAudio, useRestTimer } from '../state/restTimer'
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

/** Leiste über der Navigation: laufendes Training, Pausen-Timer und Hinweis bei vergessenem Stopp – auf jeder Seite. */
export function LiveBar() {
  const { data, save } = useStore()
  const running = runningWorkout(data.workouts)
  const now = useNow(1000, running !== undefined)
  const navigate = useNavigate()
  const [stopping, setStopping] = useState(false)
  const rest = useRestTimer()
  const [snooze, setSnooze] = useState(readSnooze)
  const stackRef = useRef<HTMLDivElement>(null)
  const hasRunning = running !== undefined

  // Höhe der Leiste an den Seiteninhalt weitergeben, damit nichts darunter verschwindet
  useLayoutEffect(() => {
    const el = stackRef.current
    if (!el) return
    const root = document.documentElement
    const update = () => root.style.setProperty('--live-h', `${el.offsetHeight}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasRunning])

  if (!running) return null
  const showRest = restVisible(rest, running.id, now)
  const forgotten = looksForgotten(running, now) && !(snooze !== null && snooze.id === running.id && now < snooze.until)
  const untilLast = durationUntilLastEntry(running)

  const snoozeFor30 = () => {
    const s = { id: running.id, until: Date.now() + 30 * 60_000 }
    writeSnooze(s)
    setSnooze(s)
  }

  const stopAtLastEntry = async () => {
    await save('workouts', stopTracking(running, Date.now(), untilLast))
    setRestTimer(null)
  }

  return (
    <>
      <div
        ref={stackRef}
        className="fixed inset-x-0 z-30 flex flex-col gap-2 px-3"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom) + 0.5rem)' }}
      >
        {forgotten && (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 rounded-2xl bg-amber-100 p-3 text-amber-950 shadow-lg dark:bg-amber-900 dark:text-amber-50">
            <div>
              <div className="font-semibold">Stoppen vergessen?</div>
              <div className="text-sm">
                {KIND_NAMES[running.kind]} läuft seit {formatDuration(workoutDuration(running, now) ?? 0)}
                {running.lastEntryAt !== null && `, letzter Eintrag vor ${formatDuration(now - running.lastEntryAt)}`}.
              </div>
            </div>
            {untilLast > 60_000 && (
              <button
                className="btn bg-amber-950 py-2 text-sm text-white dark:bg-amber-50 dark:text-amber-950"
                onClick={() => void stopAtLastEntry()}
              >
                Bis zum letzten Eintrag beenden ({formatDuration(untilLast)})
              </button>
            )}
            <div className="flex gap-2">
              <button className="btn flex-1 bg-amber-950/10 py-2 text-sm dark:bg-white/15" onClick={() => setStopping(true)}>
                Anders beenden
              </button>
              <button className="btn flex-1 bg-amber-950/10 py-2 text-sm dark:bg-white/15" onClick={snoozeFor30}>
                Läuft noch
              </button>
            </div>
          </div>
        )}
        {showRest && <RestPill rest={rest} now={now} />}
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-2xl bg-zinc-900 py-1.5 pr-1.5 pl-4 text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
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

/** Pause zwischen den Sätzen: Countdown, ±15 Sekunden, beenden. */
function RestPill({ rest, now }: { rest: RestTimer; now: number }) {
  // `now` tickt nur jede Sekunde und kann kurz vor dem Pausenstart liegen: nie mehr als die volle Pause zeigen
  const left = Math.min(restRemaining(rest, now), rest.endsAt - rest.startedAt)
  const over = left <= 0
  const small = 'btn min-w-12 px-2 text-sm bg-zinc-100 dark:bg-zinc-700'
  return (
    <div
      role="timer"
      className={`mx-auto flex w-full max-w-3xl items-center gap-1.5 rounded-2xl py-1.5 pr-1.5 pl-4 shadow-lg ${
        over ? 'bg-emerald-600 text-white' : 'bg-white text-zinc-900 dark:bg-zinc-800 dark:text-white'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-xs opacity-70">{over ? 'Pause vorbei' : 'Pause'}</div>
        <div className={`text-2xl leading-tight font-bold tabular-nums ${over ? 'animate-pulse' : ''}`}>
          {over ? 'Nächster Satz' : formatClock(left + 999)}
        </div>
      </div>
      {!over && (
        <>
          <button className={small} aria-label="Pause 15 Sekunden kürzer" onClick={() => setRestTimer(adjustRest(rest, -15, Date.now()))}>
            −15
          </button>
          <button className={small} aria-label="Pause 15 Sekunden länger" onClick={() => setRestTimer(adjustRest(rest, 15, Date.now()))}>
            +15
          </button>
        </>
      )}
      <button
        className={`btn px-3 text-sm ${over ? 'bg-white/20' : 'bg-zinc-100 dark:bg-zinc-700'}`}
        aria-label={over ? 'Hinweis schließen' : 'Pause beenden'}
        onClick={() => setRestTimer(null)}
      >
        {over ? 'OK' : 'Ende'}
      </button>
    </div>
  )
}

// „Läuft noch“ beim Hinweis auf vergessenes Stoppen: 30 Minuten Ruhe, nur auf diesem Gerät
const SNOOZE_KEY = 'gym-app-forgot-snooze'
type Snooze = { id: string; until: number }

function readSnooze(): Snooze | null {
  try {
    const s = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? 'null') as Snooze | null
    return s !== null && typeof s.until === 'number' && typeof s.id === 'string' ? s : null
  } catch {
    return null
  }
}

function writeSnooze(s: Snooze) {
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(s))
  } catch {
    // dann gilt „Läuft noch“ nur, solange die App offen ist
  }
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
    setRestTimer(null)
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
    unlockAudio()
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
