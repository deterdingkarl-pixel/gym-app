import { completedDuration } from './activity'
import { activeWorkouts } from './training'
import type { Studio, StudioItem, Workout } from './types'

export interface Footprint {
  w: number
  d: number
}

/** Was die Regeln über ein Gerät wissen müssen (der Katalog liegt in src/data/equipment.ts). */
export interface Placeable extends Footprint {
  id: string
  /** Preis in Stunden */
  cost: number
}

export const START_SIZE = 4
/** Preis je Erweiterung in Stunden. Jede Erweiterung macht die Fläche um 2 Felder breiter und tiefer. */
export const EXPANSION_COSTS = [5, 10, 15, 25]

export const studioSize = (level: number) => START_SIZE + 2 * Math.min(Math.max(level, 0), EXPANSION_COSTS.length)
export const nextExpansionCost = (level: number): number | null => EXPANSION_COSTS[level] ?? null

export function footprint(eq: Footprint, rot: number): Footprint {
  return rot % 2 === 0 ? { w: eq.w, d: eq.d } : { w: eq.d, d: eq.w }
}

/** Schiebt eine Position so, dass die Grundfläche möglichst ganz auf der Fläche liegt. */
export function clampToFloor(size: number, fp: Footprint, x: number, y: number): { x: number; y: number } {
  return { x: Math.max(0, Math.min(x, size - fp.w)), y: Math.max(0, Math.min(y, size - fp.d)) }
}

/** Passt das Gerät an diese Stelle: innerhalb der Fläche und ohne ein anderes Gerät zu berühren? */
export function canPlace(
  items: StudioItem[],
  catalog: Map<string, Placeable>,
  size: number,
  type: string,
  x: number,
  y: number,
  rot: number,
  ignoreUid?: string,
): boolean {
  const eq = catalog.get(type)
  if (!eq) return false
  const fp = footprint(eq, rot)
  if (x < 0 || y < 0 || x + fp.w > size || y + fp.d > size) return false
  return !items.some((item) => {
    const other = catalog.get(item.type)
    if (item.uid === ignoreUid || !other) return false
    const o = footprint(other, item.rot)
    return x < item.x + o.w && item.x < x + fp.w && y < item.y + o.d && item.y < y + fp.d
  })
}

/** Gibt es für dieses Gerät überhaupt noch eine freie Stelle (in irgendeiner Drehung)? */
export function hasFreeSpot(items: StudioItem[], catalog: Map<string, Placeable>, size: number, type: string): boolean {
  for (const rot of [0, 1]) {
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        if (canPlace(items, catalog, size, type, x, y, rot)) return true
      }
    }
  }
  return false
}

/** Ausgegebene Stunden: Preise aller Geräte im Studio plus alle bisherigen Erweiterungen. */
export function spentHours(studio: Pick<Studio, 'level' | 'items'>, catalog: Map<string, Placeable>): number {
  const items = studio.items.reduce((sum, item) => sum + (catalog.get(item.type)?.cost ?? 0), 0)
  return items + EXPANSION_COSTS.slice(0, studio.level).reduce((sum, cost) => sum + cost, 0)
}

/** Gesammelte Stunden: die Dauer aller abgeschlossenen Trainings. */
export function earnedHours(workouts: Workout[]): number {
  return activeWorkouts(workouts).reduce((sum, w) => sum + completedDuration(w), 0) / 3_600_000
}
