import { addDays } from './date'

/** Antwort des Server-Bausteins /api/garmin (Rohdaten von Garmin je Bereich). */
export interface GarminSnapshot {
  fetchedAt: number
  results: Record<string, unknown>
  errors: Record<string, number>
}

export interface GarminDay {
  date: string
  steps: number | null
  stepGoal: number | null
  restingHr: number | null
  sleepSeconds: number | null
  sleepScore: number | null
  stress: number | null
  bodyBattery: number | null
}

export interface GarminActivity {
  id: string
  name: string
  date: string | null
  durationSeconds: number | null
  distanceMeters: number | null
  averageHr: number | null
  calories: number | null
}

/**
 * Neue Antwort über den gespeicherten Stand legen: Bereiche, die diesmal fehlgeschlagen sind,
 * behalten ihren letzten Wert, statt zu verschwinden.
 */
export function mergeSnapshot(previous: GarminSnapshot | null | undefined, next: GarminSnapshot): GarminSnapshot {
  return { ...next, results: { ...previous?.results, ...next.results } }
}

function at(source: unknown, path: string): unknown {
  let current = source
  for (const part of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

/** Erste gültige Zahl. Garmin meldet „keine Daten“ teils mit negativen Werten (z. B. Stress −1). */
function num(source: unknown, ...paths: string[]): number | null {
  for (const path of paths) {
    const value = at(source, path)
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  }
  return null
}

function str(source: unknown, ...paths: string[]): string | null {
  for (const path of paths) {
    const value = at(source, path)
    if (typeof value === 'string' && value !== '') return value
  }
  return null
}

function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  const data = at(value, 'data')
  return Array.isArray(data) ? data : []
}

function latestBodyBattery(report: unknown): number | null {
  const values = at(report, 'bodyBatteryValuesArray')
  if (!Array.isArray(values)) return null
  for (let i = values.length - 1; i >= 0; i--) {
    const level = Array.isArray(values[i]) ? values[i][1] : null
    if (typeof level === 'number' && level >= 0) return level
  }
  return null
}

/**
 * Macht aus den Garmin-Rohdaten eine Zeile pro Kalendertag (neuester Tag zuerst).
 * Fehlt ein Wert oder ändert Garmin ein Feld, bleibt er null – die App zeigt dann „–“ statt abzustürzen.
 */
export function garminDays(results: Record<string, unknown>, start: string, end: string): GarminDay[] {
  const days = new Map<string, GarminDay>()
  for (let date = end; date >= start; date = addDays(date, -1)) {
    days.set(date, { date, steps: null, stepGoal: null, restingHr: null, sleepSeconds: null, sleepScore: null, stress: null, bodyBattery: null })
  }
  // Ein Wert wird nur gesetzt, wenn der Bereich wirklich eine Zahl liefert, damit Bereiche sich ergänzen
  const apply = (source: unknown, dateValue: string | null, patch: (day: GarminDay) => void) => {
    const day = dateValue ? days.get(dateValue.slice(0, 10)) : undefined
    if (day && source !== undefined) patch(day)
  }
  const keep = (current: number | null, next: number | null) => next ?? current

  for (const row of list(results.summaries)) {
    apply(row, str(row, 'calendarDate'), (day) => {
      day.steps = keep(day.steps, num(row, 'movement.steps.value'))
      day.stepGoal = keep(day.stepGoal, num(row, 'movement.steps.goal'))
      day.restingHr = keep(day.restingHr, num(row, 'heartRate.restingValue'))
      day.stress = keep(day.stress, num(row, 'stress.avgLevel'))
      day.bodyBattery = keep(day.bodyBattery, num(row, 'bodyBattery.latestValue'))
    })
  }
  for (const row of list(results.steps)) {
    apply(row, str(row, 'calendarDate'), (day) => {
      day.steps = keep(day.steps, num(row, 'totalSteps'))
      day.stepGoal = keep(day.stepGoal, num(row, 'stepGoal'))
    })
  }
  for (const row of list(results.stress)) {
    apply(row, str(row, 'calendarDate'), (day) => {
      day.stress = keep(day.stress, num(row, 'values.overallStressLevel'))
    })
  }
  for (const row of list(results.sleep)) {
    apply(row, str(row, 'calendarDate'), (day) => {
      day.sleepSeconds = keep(day.sleepSeconds, num(row, 'sleepTimeSeconds'))
      day.sleepScore = keep(day.sleepScore, num(row, 'sleepScores.overall.value'))
    })
  }
  for (const row of list(results.bodyBattery)) {
    // Nur Ersatz: Die Einzelwerte sind Stichproben, der Wert aus der Tageszusammenfassung ist genauer
    apply(row, str(row, 'date'), (day) => {
      day.bodyBattery = day.bodyBattery ?? latestBodyBattery(row)
    })
  }
  const heart = results.heartRate
  apply(heart, str(heart, 'calendarDate'), (day) => {
    day.restingHr = keep(day.restingHr, num(heart, 'restingHeartRate'))
  })
  return [...days.values()]
}

export function garminActivities(results: Record<string, unknown>): GarminActivity[] {
  return list(results.activities).map((row, i) => ({
    id: String(at(row, 'activityId') ?? i),
    name: str(row, 'activityName', 'activityType.typeKey') ?? 'Aktivität',
    date: str(row, 'startTimeLocal')?.slice(0, 10) ?? null,
    durationSeconds: num(row, 'duration'),
    distanceMeters: num(row, 'distance'),
    averageHr: num(row, 'averageHR'),
    calories: num(row, 'calories'),
  }))
}
