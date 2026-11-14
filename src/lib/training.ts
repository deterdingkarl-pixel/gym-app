import { parseLocalDate } from './date'
import type { Plan, TargetSet, Workout, WorkoutExercise, WorkoutKind } from './types'

/** Reihenfolge „neuestes Training zuerst“: nach Datum, dann nach Startzeit. */
export function compareWorkoutsNewestFirst(a: Workout, b: Workout): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return (b.startedAt ?? b.updatedAt) - (a.startedAt ?? a.updatedAt)
}

export function activeWorkouts(workouts: Workout[]): Workout[] {
  return workouts.filter((w) => !w.deleted).sort(compareWorkoutsNewestFirst)
}

export function doneSets(ex: WorkoutExercise): TargetSet[] {
  return ex.sets.filter((s) => s.done && (s.weight !== null || s.reps !== null)).map(({ weight, reps }) => ({ weight, reps }))
}

/** Hat das Training mindestens einen erledigten Satz? */
export function hasEntries(w: Workout): boolean {
  return w.exercises.some((e) => doneSets(e).length > 0)
}

/**
 * „Letzte Werte“: die erledigten Sätze dieser Übung aus dem neuesten anderen Training.
 * Kommt ausschließlich aus der Historie – der Plan wird dafür nie verändert.
 */
export function lastSetsFor(workouts: Workout[], exerciseId: string, excludeWorkoutId?: string): TargetSet[] | null {
  for (const w of activeWorkouts(workouts)) {
    if (w.id === excludeWorkoutId) continue
    const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap(doneSets)
    if (sets.length > 0) return sets
  }
  return null
}

/**
 * Vorbelegung für eine Übung: letzte Werte, sonst Plan-Zielwerte, sonst ein leerer Satz.
 * Wurden letztes Mal weniger Sätze eingetragen als im Plan stehen, bleiben die übrigen Plan-Sätze erhalten.
 */
export function prefillSets(workouts: Workout[], exerciseId: string, fallback: TargetSet[] | undefined, excludeWorkoutId?: string) {
  const last = lastSetsFor(workouts, exerciseId, excludeWorkoutId) ?? []
  const source = [...last, ...(fallback ?? []).slice(last.length)]
  const sets = source.length > 0 ? source : [{ weight: null, reps: null }]
  return sets.map((s) => ({ weight: s.weight, reps: s.reps, done: false }))
}

/** Neues (noch nicht gespeichertes) Training aus einem Plan. */
export function buildDraft(opts: {
  id: string
  kind: WorkoutKind
  date: string
  plan?: Plan
  workouts: Workout[]
  newUid: () => string
}): Workout {
  const { id, kind, date, plan, workouts, newUid } = opts
  return {
    id,
    kind,
    date,
    startedAt: null,
    lastEntryAt: null,
    finishedAt: null,
    updatedAt: 0,
    deleted: false,
    exercises: (plan?.exercises ?? []).map((pe) => ({
      uid: newUid(),
      exerciseId: pe.exerciseId,
      sets: prefillSets(workouts, pe.exerciseId, pe.sets, id),
    })),
  }
}

/** Heutiges, nicht gelöschtes Training dieser Kategorie (zum Weitermachen). */
export function findOpenWorkout(workouts: Workout[], kind: WorkoutKind, date: string): Workout | undefined {
  return activeWorkouts(workouts).find((w) => w.kind === kind && w.date === date)
}

/**
 * Läuft die Zeitmessung? Nur ausdrücklich gestartete Trainings laufen, und zwar bis sie gestoppt werden.
 * Ältere Trainings ohne `liveTracked` gelten als beendet (Ende = letzter Eintrag).
 */
export function isRunning(w: Workout): boolean {
  return w.liveTracked === true && !w.deleted && w.startedAt !== null && w.finishedAt === null
}

/** Trainingsdauer – immer aus echten Uhrzeiten berechnet, stimmt also auch nach dem Schließen der App. */
export function workoutDuration(w: Workout, now: number): number | null {
  if (w.startedAt === null) return null
  const end = isRunning(w) ? now : (w.finishedAt ?? w.lastEntryAt ?? w.startedAt)
  return Math.max(0, end - w.startedAt)
}

/** Das gerade laufende Training (bei mehreren das zuletzt gestartete). */
export function runningWorkout(workouts: Workout[]): Workout | undefined {
  return workouts.filter(isRunning).sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0))[0]
}

export function startTracking(w: Workout, now: number): Workout {
  return { ...w, liveTracked: true, startedAt: now, lastEntryAt: now, finishedAt: null }
}

/** Stoppt die Zeitmessung. Mit `durationMs` zählt diese Dauer statt der gemessenen (z. B. Stoppen vergessen). */
export function stopTracking(w: Workout, now: number, durationMs?: number): Workout {
  const start = w.startedAt ?? now
  return { ...w, startedAt: start, finishedAt: durationMs === undefined ? now : start + Math.max(0, durationMs) }
}

/** Setzt ein gestopptes Training fort. Die Pause zählt nicht mit: Der Start rückt um die Pause nach hinten. */
export function resumeTracking(w: Workout, now: number): Workout {
  const elapsed = workoutDuration(w, now) ?? 0
  return { ...w, liveTracked: true, startedAt: now - elapsed, lastEntryAt: now, finishedAt: null }
}

/** Dauer von Hand setzen (Nachtragen oder Korrektur). 0 löscht die Dauer. */
export function withDuration(w: Workout, durationMs: number): Workout {
  if (durationMs <= 0) return { ...w, liveTracked: false, startedAt: null, lastEntryAt: null, finishedAt: null }
  const start = w.startedAt ?? parseLocalDate(w.date).getTime() + 12 * 3600_000
  return { ...w, startedAt: start, finishedAt: start + durationMs }
}

/** Ab hier fragt die App nach, ob das Stoppen vergessen wurde */
export const FORGOT_IDLE_MS = 45 * 60_000
export const FORGOT_TOTAL_MS = 150 * 60_000

/** Läuft das Training verdächtig lange: kein Eintrag seit 45 Minuten oder insgesamt über 2,5 Stunden? */
export function looksForgotten(w: Workout, now: number): boolean {
  if (!isRunning(w) || w.startedAt === null) return false
  const lastEntry = w.lastEntryAt ?? w.startedAt
  return now - lastEntry > FORGOT_IDLE_MS || now - w.startedAt > FORGOT_TOTAL_MS
}

/** Dauer bis zum letzten Eintrag (0, wenn seit dem Start nichts eingetragen wurde) */
export function durationUntilLastEntry(w: Workout): number {
  if (w.startedAt === null || w.lastEntryAt === null) return 0
  return Math.max(0, w.lastEntryAt - w.startedAt)
}
