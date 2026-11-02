import { describe, expect, it } from 'vitest'
import { garminActivities, garminDays, mergeSnapshot } from './garmin'

const START = '2026-10-27'
const END = '2026-11-02'

describe('garminDays', () => {
  it('liefert eine Zeile pro Tag, neuester zuerst, auch ohne Daten', () => {
    const days = garminDays({}, START, END)
    expect(days).toHaveLength(7)
    expect(days[0].date).toBe(END)
    expect(days[6].date).toBe(START)
    expect(days[0].steps).toBeNull()
  })

  it('führt die Bereiche pro Tag zusammen', () => {
    const [today] = garminDays(
      {
        summaries: { data: [{ calendarDate: END, movement: { steps: 9120 }, heartRate: { restingValue: 52 } }] },
        steps: [{ calendarDate: END, totalSteps: 9500, stepGoal: 8000 }],
        stress: [{ calendarDate: END, values: { overallStressLevel: 31 } }],
        sleep: [{ calendarDate: END, sleepTimeSeconds: 27000, sleepScores: { overall: { value: 78 } } }],
        bodyBattery: [{ date: END, bodyBatteryValuesArray: [[1, 34], [2, 61], [3, null]] }],
      },
      START,
      END,
    )
    expect(today).toEqual({ date: END, steps: 9500, stepGoal: 8000, restingHr: 52, sleepSeconds: 27000, sleepScore: 78, stress: 31, bodyBattery: 61 })
  })

  it('nimmt den Ruhepuls aus dem Herzfrequenz-Bereich, wenn die Tageszusammenfassung fehlt', () => {
    expect(garminDays({ heartRate: { calendarDate: END, restingHeartRate: 49 } }, START, END)[0].restingHr).toBe(49)
  })

  it('negative Garmin-Werte bedeuten „keine Daten“', () => {
    expect(garminDays({ stress: [{ calendarDate: END, values: { overallStressLevel: -1 } }] }, START, END)[0].stress).toBeNull()
  })

  it('ignoriert Tage außerhalb des Zeitraums und unerwartete Formen', () => {
    const results = { steps: [{ calendarDate: '2020-01-01', totalSteps: 1 }, 'quatsch', null], sleep: { foo: 1 }, stress: 42, bodyBattery: [{ date: END, bodyBatteryValuesArray: 'x' }] }
    const days = garminDays(results, START, END)
    expect(days).toHaveLength(7)
    expect(days.every((d) => d.steps === null && d.bodyBattery === null)).toBe(true)
  })
})

describe('garminActivities', () => {
  it('liest die wichtigsten Felder', () => {
    const [a] = garminActivities({
      activities: [{ activityId: 123, activityName: 'Krafttraining', startTimeLocal: '2026-11-02 18:05:00', duration: 3600.5, distance: 0, averageHR: 110, calories: 400 }],
    })
    expect(a).toEqual({ id: '123', name: 'Krafttraining', date: '2026-11-02', durationSeconds: 3600.5, distanceMeters: 0, averageHr: 110, calories: 400 })
  })

  it('kommt ohne Daten klar', () => {
    expect(garminActivities({})).toEqual([])
    expect(garminActivities({ activities: null })).toEqual([])
  })
})

describe('mergeSnapshot', () => {
  it('behält den alten Wert für Bereiche, die diesmal fehlgeschlagen sind', () => {
    const merged = mergeSnapshot(
      { fetchedAt: 1, results: { sleep: 'alt', steps: 'alt' }, errors: {} },
      { fetchedAt: 2, results: { steps: 'neu' }, errors: { sleep: 500 } },
    )
    expect(merged).toEqual({ fetchedAt: 2, results: { sleep: 'alt', steps: 'neu' }, errors: { sleep: 500 } })
  })
})
