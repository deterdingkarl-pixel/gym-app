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
  scheduleSignal(t)
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

/** Pause starten – wird beim Abhaken eines Satzes aufgerufen (also direkt nach einem Fingertipp). */
export function beginRest(workoutId: string, seconds: number) {
  unlockAudio()
  setRestTimer(startRest(workoutId, Date.now(), seconds))
}

// --- Ton am Ende der Pause -------------------------------------------------
// Das iPhone erlaubt Töne nur nach einem Fingertipp und nur, solange die App offen ist.
// Der Ton wird im Voraus auf der Audio-Uhr geplant, damit er pünktlich kommt.
let ctx: AudioContext | null = null
let planned: OscillatorNode[] = []

export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state !== 'running') void ctx.resume()
  } catch {
    ctx = null
  }
}

function scheduleSignal(t: RestTimer | null) {
  for (const o of planned) {
    try {
      o.stop()
    } catch {
      // schon beendet
    }
  }
  planned = []
  if (!t || !ctx) return
  const delay = (t.endsAt - Date.now()) / 1000
  if (delay <= 0) return
  const start = ctx.currentTime + delay
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    const at = start + i * 0.3
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(0.4, at + 0.02)
    gain.gain.linearRampToValueAtTime(0, at + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(at)
    osc.stop(at + 0.2)
    planned.push(osc)
  }
  // Wo es geht (nicht am iPhone), zusätzlich vibrieren
  window.setTimeout(() => {
    if (current === t) navigator.vibrate?.([200, 100, 200])
  }, delay * 1000)
}

// Kommt die App zurück in den Vordergrund, den Ton neu planen (das iPhone hält die Audio-Uhr im Hintergrund an)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx) {
      void ctx.resume().then(() => scheduleSignal(current))
    }
  })
}
