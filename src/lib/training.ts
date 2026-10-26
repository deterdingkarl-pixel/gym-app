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

/** Vorbelegung für eine Übung: letzte Werte, sonst Plan-Zielwerte, sonst ein leerer Satz. */
export function prefillSets(workouts: Workout[], exerciseId: string, fallback: TargetSet[] | undefined, excludeWorkoutId?: string) {
  const source = lastSetsFor(workouts, exerciseId, excludeWorkoutId) ?? fallback ?? []
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

/** Läuft das Training noch? Ja, solange nicht beendet und der letzte Eintrag < 3 h her ist. */
export function isRunning(w: Workout, now: number): boolean {
  return w.startedAt !== null && w.finishedAt === null && w.lastEntryAt !== null && now - w.lastEntryAt < 3 * 3600_000
}

/** Trainingsdauer – immer aus echten Uhrzeiten berechnet, stimmt also auch nach dem Schließen der App. */
export function workoutDuration(w: Workout, now: number): number | null {
  if (w.startedAt === null) return null
  const end = isRunning(w, now) ? now : (w.finishedAt ?? w.lastEntryAt ?? w.startedAt)
  return Math.max(0, end - w.startedAt)
}
