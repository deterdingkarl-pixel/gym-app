import { describe, expect, it } from 'vitest'
import { estimate1RM, formatNumber, fromDisplayWeight, parseDecimal, toDisplayWeight } from './numbers'

describe('parseDecimal', () => {
  it('akzeptiert Komma und Punkt', () => {
    expect(parseDecimal('47,5')).toBe(47.5)
    expect(parseDecimal('47.5')).toBe(47.5)
    expect(parseDecimal(' 90 ')).toBe(90)
    expect(parseDecimal('5,')).toBe(5)
  })
  it('leer oder ungültig → null', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal(',')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('-5')).toBeNull()
    expect(parseDecimal('1,2,3')).toBeNull()
  })
})

describe('formatNumber', () => {
  it('deutsche Schreibweise', () => {
    expect(formatNumber(47.5)).toBe('47,5')
    expect(formatNumber(240)).toBe('240')
    expect(formatNumber(null)).toBe('')
  })
})

describe('Einheiten', () => {
  it('kg bleibt unverändert, lb wird umgerechnet', () => {
    expect(toDisplayWeight(100, 'kg')).toBe(100)
    expect(toDisplayWeight(100, 'lb')).toBe(220.5)
    expect(fromDisplayWeight(220.46226218, 'lb')).toBeCloseTo(100, 5)
  })
})

describe('estimate1RM (Epley)', () => {
  it('rechnet korrekt', () => {
    expect(estimate1RM(100, 1)).toBe(100)
    expect(estimate1RM(90, 4)).toBeCloseTo(102, 5)
    expect(estimate1RM(100, 0)).toBe(0)
  })
})
