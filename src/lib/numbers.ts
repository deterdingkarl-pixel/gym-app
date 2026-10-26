/** Liest Zahlen mit Komma oder Punkt als Dezimaltrenner. Leer/ungültig → null. */
export function parseDecimal(input: string): number | null {
  const s = input.trim().replace(',', '.')
  if (s === '' || !/^\d*\.?\d*$/.test(s) || s === '.') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Deutsche Schreibweise, max. 2 Nachkommastellen, ohne überflüssige Nullen. */
export function formatNumber(n: number | null | undefined, maxDigits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return ''
  return n.toLocaleString('de-DE', { maximumFractionDigits: maxDigits, useGrouping: false })
}

export type Unit = 'kg' | 'lb'
const LB_PER_KG = 2.2046226218

export function toDisplayWeight(kg: number | null, unit: Unit): number | null {
  if (kg === null) return null
  return unit === 'kg' ? kg : Math.round(kg * LB_PER_KG * 10) / 10
}

export function fromDisplayWeight(value: number | null, unit: Unit): number | null {
  if (value === null) return null
  return unit === 'kg' ? value : value / LB_PER_KG
}

/** Geschätztes 1RM nach Epley. */
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}
