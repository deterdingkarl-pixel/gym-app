export type Category = 'beine' | 'arme' | 'brust'
export type WorkoutKind = Category | 'frei'

export const CATEGORIES: { id: Category; name: string }[] = [
  { id: 'beine', name: 'Beine' },
  { id: 'arme', name: 'Arme & Schulter' },
  { id: 'brust', name: 'Brust & Rücken' },
]

export const KIND_NAMES: Record<WorkoutKind, string> = {
  beine: 'Beine',
  arme: 'Arme & Schulter',
  brust: 'Brust & Rücken',
  frei: 'Freies Training',
}

export const MUSCLES = [
  'Beine',
  'Waden',
  'Gesäß',
  'Brust',
  'Rücken',
  'Schultern',
  'Bizeps',
  'Trizeps',
  'Unterarme',
  'Bauch',
  'Ganzkörper',
] as const
export type Muscle = (typeof MUSCLES)[number]

/** Felder, die jeder synchronisierte Eintrag hat. */
export interface SyncMeta {
  id: string
  /** Zeitpunkt der letzten Änderung (ms seit 1970). Neuere Version gewinnt. */
  updatedAt: number
  /** Gelöschte Einträge bleiben als Markierung erhalten, damit sie nicht wieder auftauchen. */
  deleted: boolean
  /** Nur lokal: Änderung ist noch nicht in der Cloud. */
  dirty?: boolean
}

export interface Exercise extends SyncMeta {
  name: string
  muscle: Muscle
}

export interface TargetSet {
  reps: number | null
  weight: number | null
}

export interface PlanExercise {
  uid: string
  exerciseId: string
  note: string
  sets: TargetSet[]
}

export interface Plan extends SyncMeta {
  category: Category
  name: string
  exercises: PlanExercise[]
}

export interface WorkoutSet {
  weight: number | null
  reps: number | null
  /** Erst „erledigte“ Sätze zählen für Historie, Fortschritt und „letzte Werte“. */
  done: boolean
}

export interface WorkoutExercise {
  uid: string
  exerciseId: string
  sets: WorkoutSet[]
}

export interface Workout extends SyncMeta {
  date: string
  kind: WorkoutKind
  /** Zeitpunkt des ersten Eintrags. */
  startedAt: number | null
  /** Zeitpunkt des letzten Eintrags. */
  lastEntryAt: number | null
  finishedAt: number | null
  exercises: WorkoutExercise[]
}

export interface BodyWeight extends SyncMeta {
  date: string
  weight: number
}

export interface TableMap {
  exercises: Exercise
  plans: Plan
  workouts: Workout
  bodyweights: BodyWeight
}
export type TableName = keyof TableMap
export const TABLES: TableName[] = ['exercises', 'plans', 'workouts', 'bodyweights']
export type AnyRecord = TableMap[TableName]

export function newId(): string {
  return crypto.randomUUID()
}
