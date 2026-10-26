import { describe, expect, it } from 'vitest'
import { addDays, formatDate, isValidLocalDate, localDate, weekStart } from './date'

describe('localDate', () => {
  it('nutzt die lokale Zeit, nicht UTC (Training kurz nach Mitternacht)', () => {
    // 00:30 Uhr lokale Zeit am 27.10. – in UTC wäre es je nach Zeitzone noch der 26.10.
    const d = new Date(2026, 9, 27, 0, 30)
    expect(localDate(d)).toBe('2026-10-27')
  })
  it('kurz vor Mitternacht bleibt derselbe Tag', () => {
    expect(localDate(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01')
  })
})

describe('Datumsrechnung', () => {
  it('addDays über Monats- und Jahresgrenzen', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('addDays über die Zeitumstellung hinweg', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
  })
  it('weekStart liefert den Montag', () => {
    expect(weekStart('2026-10-26')).toBe('2026-10-26') // Montag
    expect(weekStart('2026-11-01')).toBe('2026-10-26') // Sonntag
    expect(weekStart('2026-10-28')).toBe('2026-10-26') // Mittwoch
  })
  it('isValidLocalDate', () => {
    expect(isValidLocalDate('2026-02-29')).toBe(false)
    expect(isValidLocalDate('2028-02-29')).toBe(true)
    expect(isValidLocalDate('26.10.2026')).toBe(false)
  })
  it('formatDate auf Deutsch', () => {
    expect(formatDate('2026-10-26')).toBe('Mo, 26.10.2026')
  })
})
