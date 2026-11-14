import { useSyncExternalStore } from 'react'
import { type RestTimer, startRest } from '../lib/rest'

// Der Pausen-Timer gilt nur für dieses Gerät und wird nicht abgeglichen.
// Er liegt im localStorage, damit er nach dem Schließen der App weiterläuft.
const KEY = 'gym-app-rest-timer'

function read(): RestTimer | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const t = JSON.parse(raw) as RestTimer
    return typeof t?.endsAt === 'number' && typeof t?.workoutId === 'string' ? t : null
  } catch {
    return null
  }
}

let current: RestTimer | null = read()
const listeners = new Set<() => void>()

export function setRestTimer(t: RestTimer | null) {
  current = t
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t))
    else localStorage.removeItem(KEY)
  } catch {
    // ohne Speicher läuft der Timer nur, solange die App offen ist
  }
  for (const l of listeners) l()
}

export function useRestTimer(): RestTimer | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}

/** Pause starten – wird beim Abhaken eines Satzes aufgerufen. */
export function beginRest(workoutId: string, seconds: number) {
  setRestTimer(startRest(workoutId, Date.now(), seconds))
}
