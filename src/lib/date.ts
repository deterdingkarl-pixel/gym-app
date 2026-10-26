// Alle Datumswerte sind lokale Kalendertage im Format YYYY-MM-DD.
// Niemals toISOString() für Tage verwenden – das wäre UTC und kann den falschen Tag liefern.

const pad = (n: number) => String(n).padStart(2, '0')

export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function isValidLocalDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  return localDate(parseLocalDate(s)) === s
}

export function addDays(s: string, n: number): string {
  const d = parseLocalDate(s)
  d.setDate(d.getDate() + n)
  return localDate(d)
}

/** Montag der Woche, in der der Tag liegt. */
export function weekStart(s: string): string {
  const d = parseLocalDate(s)
  const offset = (d.getDay() + 6) % 7 // Mo=0 … So=6
  return addDays(s, -offset)
}

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

export function formatDate(s: string): string {
  const d = parseLocalDate(s)
  return `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
}

export function formatShortDate(s: string): string {
  const d = parseLocalDate(s)
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h} h ${pad(m)} min` : `${m} min`
}
