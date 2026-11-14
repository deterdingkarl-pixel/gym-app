import { addDays, weekStart } from './date'
import { activeWorkouts, doneSets, hasEntries, isRunning, workoutDuration } from './training'
import type { Muscle, Workout } from './types'

export type DayStatus = 'trained' | 'rest' | 'missed'

/**
 * Status jedes Tages ab dem ersten Eintrag: trainiert, Ruhetag oder ausgelassen.
 * Training geht vor Ruhetag. Der heutige Tag gilt erst als ausgelassen, wenn er vorbei ist.
 */
export function dayStatuses(trained: Set<string>, rest: Set<string>, today: string): Map<string, DayStatus> {
  const result = new Map<string, DayStatus>()
  const first = [...trained, ...rest].sort()[0]
  if (!first) return result
  for (let d = first; d <= today; d = addDays(d, 1)) {
    if (trained.has(d)) result.set(d, 'trained')
    else if (rest.has(d)) result.set(d, 'rest')
    else if (d < today) result.set(d, 'missed')
  }
  return result
}

/** Dauer eines abgeschlossenen Trainings in ms. Ein laufendes Training zählt erst nach dem Stoppen. */
export function completedDuration(w: Workout): number {
  return isRunning(w) ? 0 : (workoutDuration(w, 0) ?? 0)
}

export interface Totals {
  workouts: number
  durationMs: number
  /** Summe aus Gewicht × Wiederholungen aller erledigten Sätze, in kg */
  volume: number
  reps: number
}

const emptyTotals = (): Totals => ({ workouts: 0, durationMs: 0, volume: 0, reps: 0 })

function addWorkout(t: Totals, w: Workout) {
  t.workouts++
  t.durationMs += completedDuration(w)
  for (const s of w.exercises.flatMap(doneSets)) {
    t.reps += s.reps ?? 0
    t.volume += (s.weight ?? 0) * (s.reps ?? 0)
  }
}

const inRange = (workouts: Workout[], from: string, to: string) =>
  activeWorkouts(workouts).filter((w) => hasEntries(w) && w.date >= from && w.date <= to)

/** Summen aller Trainings im Zeitraum (beide Tage eingeschlossen). */
export function periodTotals(workouts: Workout[], from: string, to: string): Totals {
  const totals = emptyTotals()
  for (const w of inRange(workouts, from, to)) addWorkout(totals, w)
  return totals
}

export interface WeekTotals extends Totals {
  /** Montag der Woche */
  week: string
}

/** Summen pro Woche (Mo–So) für alle Wochen, die den Zeitraum berühren. Auch leere Wochen sind enthalten. */
export function weeklyTotals(workouts: Workout[], from: string, to: string): WeekTotals[] {
  const weeks = new Map<string, WeekTotals>()
  for (let week = weekStart(from); week <= to; week = addDays(week, 7)) weeks.set(week, { week, ...emptyTotals() })
  for (const w of inRange(workouts, weekStart(from), to)) {
    const totals = weeks.get(weekStart(w.date))
    if (totals) addWorkout(totals, w)
  }
  return [...weeks.values()]
}

export const RADAR_GROUPS = ['Beine', 'Brust', 'Rücken', 'Schultern', 'Arme', 'Core'] as const
type RadarGroup = (typeof RADAR_GROUPS)[number]

const GROUP_OF: Record<Muscle, RadarGroup | null> = {
  Beine: 'Beine',
  Waden: 'Beine',
  Gesäß: 'Beine',
  Brust: 'Brust',
  Rücken: 'Rücken',
  Schultern: 'Schultern',
  Bizeps: 'Arme',
  Trizeps: 'Arme',
  Unterarme: 'Arme',
  Bauch: 'Core',
  Ganzkörper: null,
}

/** Erledigte Sätze je Muskelgruppe im Zeitraum, in der Reihenfolge von RADAR_GROUPS. */
export function muscleSets(workouts: Workout[], muscleOf: (exerciseId: string) => Muscle | undefined, from: string, to: string): number[] {
  const counts = RADAR_GROUPS.map(() => 0)
  for (const w of inRange(workouts, from, to)) {
    for (const e of w.exercises) {
      const muscle = muscleOf(e.exerciseId)
      const group = muscle ? GROUP_OF[muscle] : null
      if (group) counts[RADAR_GROUPS.indexOf(group)] += doneSets(e).length
    }
  }
  return counts
}
