import { describe, expect, it } from 'vitest'
import { DEFAULT_REST_SECONDS, REST_OVER_VISIBLE_MS, adjustRest, restRemaining, restVisible, startRest, validRestSeconds } from './rest'

const T0 = 1_000_000

describe('Pausen-Timer', () => {
  it('endet nach der eingestellten Zeit', () => {
    const t = startRest('w1', T0, 90)
    expect(restRemaining(t, T0)).toBe(90_000)
    expect(restRemaining(t, T0 + 30_000)).toBe(60_000)
    expect(restRemaining(t, T0 + 100_000)).toBe(-10_000)
  })

  it('lässt sich verlängern und verkürzen, aber nicht in die Vergangenheit', () => {
    const t = startRest('w1', T0, 90)
    expect(adjustRest(t, 15, T0).endsAt).toBe(T0 + 105_000)
    expect(adjustRest(t, -15, T0).endsAt).toBe(T0 + 75_000)
    expect(adjustRest(t, -300, T0 + 10_000).endsAt).toBe(T0 + 10_000)
  })

  it('ist nur beim laufenden Training und kurz nach dem Ende sichtbar', () => {
    const t = startRest('w1', T0, 60)
    expect(restVisible(t, 'w1', T0)).toBe(true)
    expect(restVisible(t, 'w2', T0)).toBe(false)
    expect(restVisible(t, undefined, T0)).toBe(false)
    expect(restVisible(null, 'w1', T0)).toBe(false)
    expect(restVisible(t, 'w1', T0 + 60_000 + REST_OVER_VISIBLE_MS - 1)).toBe(true)
    expect(restVisible(t, 'w1', T0 + 60_000 + REST_OVER_VISIBLE_MS)).toBe(false)
  })

  it('fällt bei ungültiger Einstellung auf den Standard zurück', () => {
    expect(validRestSeconds(90)).toBe(90)
    expect(validRestSeconds(undefined)).toBe(DEFAULT_REST_SECONDS)
    expect(validRestSeconds('120')).toBe(DEFAULT_REST_SECONDS)
    expect(validRestSeconds(5)).toBe(DEFAULT_REST_SECONDS)
    expect(validRestSeconds(Number.NaN)).toBe(DEFAULT_REST_SECONDS)
  })
})
