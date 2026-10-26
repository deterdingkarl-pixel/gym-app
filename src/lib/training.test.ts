import { describe, expect, it } from 'vitest'
import { SEED_PLANS, missingSeedPlans } from '../data/seedPlans'
import { buildDraft, findOpenWorkout, lastSetsFor, workoutDuration } from './training'
import type { Workout } from './types'

function workout(p: Partial<Workout> & { id: string; date: string }): Workout {
  return {
    kind: 'beine',
    startedAt: null,
    lastEntryAt: null,
    finishedAt: null,
    updatedAt: 1,
    deleted: false,
    exercises: [],
    ...p,
  }
}

const set = (weight: number, reps: number, done = true) => ({ weight, reps, done })

describe('lastSetsFor – „letzte Werte“ aus der Historie', () => {
  const history = [
    workout({ id: 'a', date: '2026-10-01', exercises: [{ uid: '1', exerciseId: 'beinpresse', sets: [set(200, 10), set(200, 8)] }] }),
    workout({ id: 'b', date: '2026-10-08', exercises: [{ uid: '2', exerciseId: 'beinpresse', sets: [set(240, 10), set(240, 6)] }] }),
  ]

  it('nimmt das neueste Training', () => {
    expect(lastSetsFor(history, 'beinpresse')).toEqual([
      { weight: 240, reps: 10 },
      { weight: 240, reps: 6 },
    ])
  })

  it('ignoriert das aktuelle Training (Zwischenstände beim Tippen zählen nicht)', () => {
    expect(lastSetsFor(history, 'beinpresse', 'b')).toEqual([
      { weight: 200, reps: 10 },
      { weight: 200, reps: 8 },
    ])
  })

  it('ignoriert gelöschte Trainings und nicht erledigte Sätze', () => {
    const h = [
      ...history,
      workout({ id: 'c', date: '2026-10-15', deleted: true, exercises: [{ uid: '3', exerciseId: 'beinpresse', sets: [set(999, 1)] }] }),
      workout({ id: 'd', date: '2026-10-20', exercises: [{ uid: '4', exerciseId: 'beinpresse', sets: [set(500, 1, false)] }] }),
    ]
    expect(lastSetsFor(h, 'beinpresse')?.[0].weight).toBe(240)
  })

  it('übernimmt die Satzanzahl vom letzten Mal (z. B. 3 statt 2)', () => {
    const h = [workout({ id: 'e', date: '2026-10-22', exercises: [{ uid: '5', exerciseId: 'beinpresse', sets: [set(1, 1), set(2, 2), set(3, 3)] }] })]
    expect(lastSetsFor(h, 'beinpresse')).toHaveLength(3)
  })

  it('am selben Tag zählt die spätere Einheit', () => {
    const h = [
      workout({ id: 'x', date: '2026-10-22', startedAt: 1000, exercises: [{ uid: '6', exerciseId: 'latzug', sets: [set(80, 6)] }] }),
      workout({ id: 'y', date: '2026-10-22', startedAt: 2000, exercises: [{ uid: '7', exerciseId: 'latzug', sets: [set(86, 6)] }] }),
    ]
    expect(lastSetsFor(h, 'latzug')?.[0].weight).toBe(86)
  })

  it('ohne Historie → null', () => {
    expect(lastSetsFor(history, 'latzug')).toBeNull()
  })
})

describe('buildDraft', () => {
  let n = 0
  const newUid = () => `u${n++}`
  const plan = SEED_PLANS.find((p) => p.id === 'plan-beine')!

  it('ohne Historie: Startwerte aus dem Plan, alles noch nicht erledigt', () => {
    const d = buildDraft({ id: 'w', kind: 'beine', date: '2026-10-26', plan, workouts: [], newUid })
    expect(d.exercises).toHaveLength(6)
    expect(d.exercises[0].sets).toEqual([
      { weight: 90, reps: 4, done: false },
      { weight: 86, reps: 5, done: false },
    ])
  })

  it('mit Historie: Werte vom letzten Training, Plan bleibt unverändert', () => {
    const before = JSON.stringify(plan)
    const h = [workout({ id: 'a', date: '2026-10-20', exercises: [{ uid: '1', exerciseId: 'beinbeuger-liegend', sets: [set(92.5, 5), set(88, 5)] }] })]
    const d = buildDraft({ id: 'w', kind: 'beine', date: '2026-10-26', plan, workouts: h, newUid })
    expect(d.exercises[0].sets[0]).toEqual({ weight: 92.5, reps: 5, done: false })
    expect(d.exercises[1].sets[0]).toEqual({ weight: 240, reps: 10, done: false })
    expect(JSON.stringify(plan)).toBe(before)
  })
})

describe('findOpenWorkout', () => {
  it('findet das heutige Training derselben Kategorie zum Weitermachen', () => {
    const h = [workout({ id: 'a', date: '2026-10-26' }), workout({ id: 'b', date: '2026-10-26', kind: 'arme' })]
    expect(findOpenWorkout(h, 'beine', '2026-10-26')?.id).toBe('a')
    expect(findOpenWorkout(h, 'brust', '2026-10-26')).toBeUndefined()
  })
})

describe('workoutDuration', () => {
  const start = 1_000_000
  it('läuft weiter, solange das Training aktiv ist', () => {
    const w = workout({ id: 'a', date: 'x', startedAt: start, lastEntryAt: start + 10 * 60_000 })
    expect(workoutDuration(w, start + 30 * 60_000)).toBe(30 * 60_000)
  })
  it('endet beim letzten Eintrag, wenn die App lange geschlossen war', () => {
    const w = workout({ id: 'a', date: 'x', startedAt: start, lastEntryAt: start + 50 * 60_000 })
    expect(workoutDuration(w, start + 10 * 3600_000)).toBe(50 * 60_000)
  })
  it('endet bei „Fertig“', () => {
    const w = workout({ id: 'a', date: 'x', startedAt: start, lastEntryAt: start + 50 * 60_000, finishedAt: start + 55 * 60_000 })
    expect(workoutDuration(w, start + 60 * 60_000)).toBe(55 * 60_000)
  })
  it('vor dem ersten Eintrag → null', () => {
    expect(workoutDuration(workout({ id: 'a', date: 'x' }), start)).toBeNull()
  })
})

describe('Startplan', () => {
  it('wird nur angelegt, wenn er fehlt – nie doppelt', () => {
    expect(missingSeedPlans(new Set())).toHaveLength(3)
    expect(missingSeedPlans(new Set(['plan-beine', 'plan-arme', 'plan-brust']))).toHaveLength(0)
    expect(missingSeedPlans(new Set(['plan-arme'])).map((p) => p.id)).toEqual(['plan-beine', 'plan-brust'])
  })
  it('hat updatedAt 0, damit jede Cloud-Version gewinnt', () => {
    expect(SEED_PLANS.every((p) => p.updatedAt === 0 && !p.dirty)).toBe(true)
  })
  it('enthält genau Karls Werte', () => {
    const brust = SEED_PLANS.find((p) => p.id === 'plan-brust')!
    expect(brust.exercises.map((e) => e.exerciseId)).toContain('enges-latziehen')
    expect(brust.exercises.find((e) => e.exerciseId === 'enges-rudern')!.sets).toEqual([{ reps: 5, weight: 100 }])
    const arme = SEED_PLANS.find((p) => p.id === 'plan-arme')!
    expect(arme.exercises[0].sets[0]).toEqual({ reps: 7, weight: 47.5 })
  })
})
