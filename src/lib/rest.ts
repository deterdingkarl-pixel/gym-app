// Pausen-Timer zwischen den Sätzen. Wie bei der Trainingsdauer zählt nichts mit:
// gespeichert wird nur, wann die Pause endet. So stimmt die Anzeige auch nach dem Schließen der App.

export interface RestTimer {
  workoutId: string
  startedAt: number
  endsAt: number
}

/** Auswahl in den Einstellungen (Sekunden) */
export const REST_CHOICES = [60, 90, 120, 150, 180, 240] as const
export const DEFAULT_REST_SECONDS = 120
/** So lange bleibt „Pause vorbei“ sichtbar, danach verschwindet die Anzeige von selbst */
export const REST_OVER_VISIBLE_MS = 2 * 60_000

export function startRest(workoutId: string, now: number, seconds: number): RestTimer {
  return { workoutId, startedAt: now, endsAt: now + Math.max(0, seconds) * 1000 }
}

/** Restzeit in ms; negativ = Pause ist seit so vielen ms vorbei */
export function restRemaining(t: RestTimer, now: number): number {
  return t.endsAt - now
}

/** Pause verlängern oder verkürzen. Kürzer als „jetzt vorbei“ geht nicht. */
export function adjustRest(t: RestTimer, deltaSeconds: number, now: number): RestTimer {
  return { ...t, endsAt: Math.max(now, t.endsAt + deltaSeconds * 1000) }
}

/** Soll die Anzeige noch zu sehen sein? Nur für das laufende Training und nicht ewig nach dem Ende. */
export function restVisible(t: RestTimer | null, runningWorkoutId: string | undefined, now: number): t is RestTimer {
  return t !== null && t.workoutId === runningWorkoutId && now - t.endsAt < REST_OVER_VISIBLE_MS
}

/** Einstellungswert prüfen (alte oder kaputte Werte fallen auf den Standard zurück) */
export function validRestSeconds(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 15 && v <= 600 ? Math.round(v) : DEFAULT_REST_SECONDS
}
