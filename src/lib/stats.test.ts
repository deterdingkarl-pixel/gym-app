import { describe, expect, it } from 'vitest'
import { addDays } from './date'
import { exerciseProgress, personalRecords, weekStreak } from './stats'
import type { Workout } from './types'

/** n Trainingstage ab Montag `monday` */
const days = (monday: string, n: number) => Array.from({ length: n }, (_, i) => addDays(monday, i))

describe('weekStreak', () => {
  const today = '2026-10-28' // Mittwoch, Woche ab 26.10.

  it('zählt aufeinanderfolgende Wochen mit ≥ 4 Trainingstagen', () => {
    const d = [...days('2026-10-12', 4), ...days('2026-10-19', 5)]
    expect(weekStreak(d, today)).toBe(2)
  })

  it('laufende Woche unterbricht die Serie nicht', () => {
    const d = [...days('2026-10-19', 4), '2026-10-26']
    expect(weekStreak(d, today)).toBe(1)
  })

  it('laufende Woche zählt mit, sobald 4 Tage erreicht sind', () => {
    const d = [...days('2026-10-19', 4), ...days('2026-10-26', 4)]
    expect(weekStreak(d, '2026-10-29')).toBe(2)
  })

  it('eine schwache Woche beendet die Serie', () => {
    const d = [...days('2026-10-05', 4), ...days('2026-10-12', 3), ...days('2026-10-19', 4)]
    expect(weekStreak(d, today)).toBe(1)
  })

  it('zwei Trainings am selben Tag zählen als ein Tag', () => {
    const d = ['2026-10-19', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-21']
    expect(weekStreak(d, today)).toBe(0)
  })

  it('Woche läuft von Montag bis Sonntag', () => {
    // Sa+So der Vorwoche und Mo+Di dieser Woche = je 2 Tage → keine Serie
    const d = ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']
    expect(weekStreak(d, '2026-10-25')).toBe(0)
  })
})

describe('Fortschritt', () => {
  const w = (id: string, date: string, sets: [number, number, boolean?][]): Workout => ({
    id,
    date,
    kind: 'arme',
    startedAt: null,
    lastEntryAt: null,
    finishedAt: null,
    updatedAt: 1,
    deleted: false,
    exercises: [{ uid: id, exerciseId: 'preacher-curl', sets: sets.map(([weight, reps, done = true]) => ({ weight, reps, done })) }],
  })

  it('Verlauf älteste zuerst, nur erledigte Sätze, bester Satz und 1RM', () => {
    const points = exerciseProgress(
      [w('b', '2026-10-08', [[47.5, 7], [45, 7]]), w('a', '2026-10-01', [[45, 8], [99, 1, false]])],
      'preacher-curl',
    )
    expect(points.map((p) => p.date)).toEqual(['2026-10-01', '2026-10-08'])
    expect(points[0].bestWeight).toBe(45)
    expect(points[1].bestWeight).toBe(47.5)
    expect(points[1].best1RM).toBeCloseTo(47.5 * (1 + 7 / 30), 5)
  })

  it('Bestleistungen', () => {
    const pr = personalRecords(
      exerciseProgress([w('a', '2026-10-01', [[50, 3]]), w('b', '2026-10-08', [[47.5, 10]])], 'preacher-curl'),
    )
    expect(pr.heaviest).toEqual({ weight: 50, reps: 3, date: '2026-10-01' })
    expect(pr.best1RM?.date).toBe('2026-10-08')
  })
})
