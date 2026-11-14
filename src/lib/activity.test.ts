import { describe, expect, it } from 'vitest'
import { completedDuration, dayStatuses, muscleSets, periodTotals, weeklyTotals } from './activity'
import { startTracking } from './training'
import type { Muscle, Workout } from './types'

const HOUR = 3_600_000

function workout(id: string, date: string, sets: [number, number, boolean?][] = [[100, 5]], extra: Partial<Workout> = {}): Workout {
  return {
    id,
    date,
    kind: 'beine',
    startedAt: 1000,
    lastEntryAt: null,
    finishedAt: 1000 + HOUR,
    updatedAt: 1,
    deleted: false,
    exercises: [{ uid: id, exerciseId: 'beinpresse', sets: sets.map(([weight, reps, done = true]) => ({ weight, reps, done })) }],
    ...extra,
  }
}

describe('dayStatuses – trainiert, Ruhetag, ausgelassen', () => {
  const today = '2026-11-14'
  const statuses = dayStatuses(new Set(['2026-11-10', '2026-11-12']), new Set(['2026-11-11', '2026-11-12']), today)

  it('Training und Ruhetag sind eingetragen, Training geht vor', () => {
    expect(statuses.get('2026-11-10')).toBe('trained')
    expect(statuses.get('2026-11-11')).toBe('rest')
    expect(statuses.get('2026-11-12')).toBe('trained')
  })

  it('ein Tag ohne beides ist ausgelassen', () => {
    expect(statuses.get('2026-11-13')).toBe('missed')
  })

  it('heute ist erst ausgelassen, wenn der Tag vorbei ist', () => {
    expect(statuses.has(today)).toBe(false)
    expect(dayStatuses(new Set(['2026-11-10']), new Set(), '2026-11-15').get(today)).toBe('missed')
  })

  it('vor dem ersten Eintrag gibt es keine ausgelassenen Tage', () => {
    expect(statuses.has('2026-11-09')).toBe(false)
    expect(dayStatuses(new Set(), new Set(), today).size).toBe(0)
  })

  it('ein Ruhetag heute zählt sofort', () => {
    expect(dayStatuses(new Set(), new Set([today]), today).get(today)).toBe('rest')
  })
})

describe('Summen', () => {
  const workouts = [
    workout('a', '2026-11-02', [[100, 5], [80, 10], [999, 9, false]]),
    workout('b', '2026-11-04', [[50, 10]]),
    workout('c', '2026-11-11', [[60, 10]]),
    workout('leer', '2026-11-12', [[60, 10, false]]),
    workout('weg', '2026-11-12', [[60, 10]], { deleted: true }),
  ]

  it('periodTotals zählt nur erledigte Sätze nicht gelöschter Trainings im Zeitraum', () => {
    expect(periodTotals(workouts, '2026-11-02', '2026-11-08')).toEqual({ workouts: 2, durationMs: 2 * HOUR, volume: 500 + 800 + 500, reps: 25 })
    expect(periodTotals(workouts, '2026-11-09', '2026-11-14').workouts).toBe(1)
  })

  it('weeklyTotals liefert jede Woche ab Montag, auch leere', () => {
    const weeks = weeklyTotals(workouts, '2026-10-28', '2026-11-14')
    expect(weeks.map((w) => w.week)).toEqual(['2026-10-26', '2026-11-02', '2026-11-09'])
    expect(weeks.map((w) => w.workouts)).toEqual([0, 2, 1])
    expect(weeks[1].volume).toBe(1800)
  })

  it('ein laufendes Training zählt noch keine Dauer', () => {
    const running = startTracking(workout('r', '2026-11-14'), 5000)
    expect(completedDuration(running)).toBe(0)
    expect(completedDuration(workout('x', '2026-11-14'))).toBe(HOUR)
  })

  it('muscleSets zählt erledigte Sätze je Gruppe', () => {
    const muscles: Record<string, Muscle> = { beinpresse: 'Beine', waden: 'Waden', curl: 'Bizeps' }
    const set = { weight: 1, reps: 1, done: true }
    const list = [
      workout('a', '2026-11-02', [[1, 1], [1, 1]]),
      workout('b', '2026-11-03', [], {
        exercises: [
          { uid: 'x', exerciseId: 'waden', sets: [set] },
          { uid: 'y', exerciseId: 'curl', sets: [set] },
          { uid: 'z', exerciseId: 'unbekannt', sets: [set] },
        ],
      }),
    ]
    // Reihenfolge: Beine, Brust, Rücken, Schultern, Arme, Core
    expect(muscleSets(list, (id) => muscles[id], '2026-11-01', '2026-11-30')).toEqual([3, 0, 0, 0, 1, 0])
  })
})
