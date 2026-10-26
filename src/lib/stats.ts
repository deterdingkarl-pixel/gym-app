import { addDays, weekStart } from './date'
import { estimate1RM } from './numbers'
import { activeWorkouts, doneSets, hasEntries } from './training'
import type { Workout } from './types'

/** Alle Trainingstage (verschiedene Daten mit mindestens einem erledigten Satz). */
export function trainingDays(workouts: Workout[]): Set<string> {
  return new Set(activeWorkouts(workouts).filter(hasEntries).map((w) => w.date))
}

/**
 * Wochenserie: Anzahl aufeinanderfolgender Wochen (Mo–So) mit mindestens `goal` Trainingstagen.
 * Die laufende Woche zählt mit, sobald das Ziel erreicht ist – unterbricht die Serie aber nicht, solange sie läuft.
 */
export function weekStreak(days: Iterable<string>, today: string, goal = 4): number {
  const perWeek = new Map<string, number>()
  for (const d of new Set(days)) {
    const w = weekStart(d)
    perWeek.set(w, (perWeek.get(w) ?? 0) + 1)
  }
  let week = weekStart(today)
  let streak = (perWeek.get(week) ?? 0) >= goal ? 1 : 0
  week = addDays(week, -7)
  while ((perWeek.get(week) ?? 0) >= goal) {
    streak++
    week = addDays(week, -7)
  }
  return streak
}

export function daysInWeek(days: Set<string>, today: string): number {
  const start = weekStart(today)
  let n = 0
  for (let i = 0; i < 7; i++) if (days.has(addDays(start, i))) n++
  return n
}

export interface ProgressPoint {
  date: string
  workoutId: string
  bestWeight: number
  bestWeightReps: number
  best1RM: number
}

/** Verlauf einer Übung: pro Training der schwerste Satz und das beste geschätzte 1RM. Älteste zuerst. */
export function exerciseProgress(workouts: Workout[], exerciseId: string): ProgressPoint[] {
  const points: ProgressPoint[] = []
  for (const w of activeWorkouts(workouts)) {
    const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap(doneSets)
    const valid = sets.filter((s) => s.weight !== null && s.reps !== null && s.reps > 0) as { weight: number; reps: number }[]
    if (valid.length === 0) continue
    let best = valid[0]
    for (const s of valid) if (s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps)) best = s
    points.push({
      date: w.date,
      workoutId: w.id,
      bestWeight: best.weight,
      bestWeightReps: best.reps,
      best1RM: Math.max(...valid.map((s) => estimate1RM(s.weight, s.reps))),
    })
  }
  return points.reverse()
}

export interface PersonalRecords {
  heaviest: { weight: number; reps: number; date: string } | null
  best1RM: { value: number; date: string } | null
}

export function personalRecords(points: ProgressPoint[]): PersonalRecords {
  let heaviest: PersonalRecords['heaviest'] = null
  let best1RM: PersonalRecords['best1RM'] = null
  for (const p of points) {
    if (!heaviest || p.bestWeight > heaviest.weight || (p.bestWeight === heaviest.weight && p.bestWeightReps > heaviest.reps))
      heaviest = { weight: p.bestWeight, reps: p.bestWeightReps, date: p.date }
    if (!best1RM || p.best1RM > best1RM.value) best1RM = { value: p.best1RM, date: p.date }
  }
  return { heaviest, best1RM }
}

/** IDs aller Übungen, die mindestens einmal mit erledigtem Satz trainiert wurden. */
export function trainedExerciseIds(workouts: Workout[]): Map<string, Workout['kind']> {
  // Übung → Kategorie des neuesten Trainings, in dem sie vorkam (für die Gruppierung)
  const result = new Map<string, Workout['kind']>()
  for (const w of activeWorkouts(workouts))
    for (const e of w.exercises) if (!result.has(e.exerciseId) && doneSets(e).length > 0) result.set(e.exerciseId, w.kind)
  return result
}
