import { describe, expect, it } from 'vitest'
import { EQUIPMENT, EQUIPMENT_BY_ID, TIERS } from '../data/equipment'
import { rotateBoxes, sortBackToFront } from './iso'
import { canPlace, clampToFloor, earnedHours, EXPANSION_COSTS, footprint, hasFreeSpot, nextExpansionCost, spentHours, studioSize } from './studio'
import type { StudioItem, Workout } from './types'

const place = (type: string, x: number, y: number, rot = 0): StudioItem => ({ uid: `${type}-${x}-${y}`, type, x, y, rot })

describe('Fläche', () => {
  it('startet mit 4 × 4 und wächst je Erweiterung um 2', () => {
    expect(studioSize(0)).toBe(4)
    expect(studioSize(1)).toBe(6)
    expect(studioSize(EXPANSION_COSTS.length)).toBe(12)
    expect(nextExpansionCost(0)).toBe(5)
    expect(nextExpansionCost(EXPANSION_COSTS.length)).toBeNull()
  })
})

describe('Geräte aufstellen', () => {
  it('Drehen vertauscht Breite und Tiefe', () => {
    expect(footprint({ w: 1, d: 2 }, 0)).toEqual({ w: 1, d: 2 })
    expect(footprint({ w: 1, d: 2 }, 1)).toEqual({ w: 2, d: 1 })
    expect(footprint({ w: 1, d: 2 }, 2)).toEqual({ w: 1, d: 2 })
  })

  it('nichts ragt über die Fläche hinaus', () => {
    expect(canPlace([], EQUIPMENT_BY_ID, 4, 'flachbank', 3, 2, 0)).toBe(true)
    expect(canPlace([], EQUIPMENT_BY_ID, 4, 'flachbank', 3, 3, 0)).toBe(false)
    expect(canPlace([], EQUIPMENT_BY_ID, 4, 'flachbank', -1, 0, 0)).toBe(false)
    expect(canPlace([], EQUIPMENT_BY_ID, 4, 'hyrox-bahn', 0, 0, 0)).toBe(false)
    expect(canPlace([], EQUIPMENT_BY_ID, 6, 'hyrox-bahn', 0, 0, 0)).toBe(true)
  })

  it('Geräte dürfen sich nicht überlappen, direkt nebeneinander ist erlaubt', () => {
    const items = [place('flachbank', 0, 0)]
    expect(canPlace(items, EQUIPMENT_BY_ID, 4, 'wasserspender', 0, 1, 0)).toBe(false)
    expect(canPlace(items, EQUIPMENT_BY_ID, 4, 'wasserspender', 1, 0, 0)).toBe(true)
    expect(canPlace(items, EQUIPMENT_BY_ID, 4, 'wasserspender', 0, 2, 0)).toBe(true)
  })

  it('beim Verschieben blockiert sich ein Gerät nicht selbst', () => {
    const items = [place('flachbank', 0, 0)]
    expect(canPlace(items, EQUIPMENT_BY_ID, 4, 'flachbank', 0, 1, 0)).toBe(false)
    expect(canPlace(items, EQUIPMENT_BY_ID, 4, 'flachbank', 0, 1, 0, items[0].uid)).toBe(true)
  })

  it('unbekannte Geräte lassen sich nicht aufstellen und blockieren nichts', () => {
    expect(canPlace([], EQUIPMENT_BY_ID, 4, 'gibt-es-nicht', 0, 0, 0)).toBe(false)
    expect(canPlace([place('gibt-es-nicht', 0, 0)], EQUIPMENT_BY_ID, 4, 'wasserspender', 0, 0, 0)).toBe(true)
  })

  it('clampToFloor schiebt zurück auf die Fläche', () => {
    expect(clampToFloor(4, { w: 1, d: 2 }, 3, 3)).toEqual({ x: 3, y: 2 })
    expect(clampToFloor(4, { w: 3, d: 3 }, -1, 2)).toEqual({ x: 0, y: 1 })
  })

  it('hasFreeSpot erkennt eine volle Fläche und probiert beide Richtungen', () => {
    expect(hasFreeSpot([], EQUIPMENT_BY_ID, 4, 'hantelplattform')).toBe(true)
    expect(hasFreeSpot([place('hantelplattform', 0, 0)], EQUIPMENT_BY_ID, 4, 'hantelplattform')).toBe(false)
    // Frei ist nur noch ein Winkel aus zwei Streifen: Die Spiegelwand (3 × 1) passt in beide
    expect(hasFreeSpot([place('hantelplattform', 0, 0)], EQUIPMENT_BY_ID, 4, 'spiegelwand')).toBe(true)
  })
})

describe('Stunden', () => {
  const workout = (extra: Partial<Workout>): Workout => ({
    id: 'w',
    date: '2026-11-14',
    kind: 'beine',
    startedAt: null,
    lastEntryAt: null,
    finishedAt: null,
    updatedAt: 1,
    deleted: false,
    exercises: [],
    ...extra,
  })

  it('gesammelt = Dauer aller abgeschlossenen, nicht gelöschten Trainings', () => {
    const h = 3_600_000
    expect(
      earnedHours([
        workout({ id: 'a', startedAt: 0, finishedAt: 1.5 * h }),
        workout({ id: 'alt', startedAt: 0, lastEntryAt: h }),
        workout({ id: 'läuft', liveTracked: true, startedAt: 0 }),
        workout({ id: 'weg', startedAt: 0, finishedAt: 5 * h, deleted: true }),
        workout({ id: 'ohne' }),
      ]),
    ).toBeCloseTo(2.5, 6)
  })

  it('ausgegeben = Geräte plus Erweiterungen; Entfernen gibt die Stunden zurück', () => {
    const items = [place('flachbank', 0, 0), place('boxsack', 2, 0), place('gibt-es-nicht', 3, 3)]
    expect(spentHours({ level: 0, items }, EQUIPMENT_BY_ID)).toBe(3.5)
    expect(spentHours({ level: 2, items }, EQUIPMENT_BY_ID)).toBe(18.5)
    expect(spentHours({ level: 0, items: items.slice(1) }, EQUIPMENT_BY_ID)).toBe(2.5)
  })
})

describe('Gerätekatalog', () => {
  it('hat eindeutige IDs, gültige Stufen und Preise', () => {
    expect(new Set(EQUIPMENT.map((e) => e.id)).size).toBe(EQUIPMENT.length)
    const tiers = new Set<string>(TIERS.map((t) => t.id))
    for (const e of EQUIPMENT) {
      expect(tiers.has(e.tier), e.id).toBe(true)
      expect(e.cost, e.id).toBeGreaterThan(0)
      expect(Number.isInteger(e.w) && Number.isInteger(e.d) && e.w > 0 && e.d > 0, e.id).toBe(true)
    }
  })

  it('jedes Gerät bleibt innerhalb seiner Grundfläche', () => {
    for (const e of EQUIPMENT) {
      for (const [x, y, z, w, d, h] of e.boxes) {
        const where = `${e.id} [${x}, ${y}, ${z}]`
        expect(x >= 0 && x + w <= e.w + 1e-9, where).toBe(true)
        expect(y >= 0 && y + d <= e.d + 1e-9, where).toBe(true)
        expect(z >= 0 && w > 0 && d > 0 && h > 0, where).toBe(true)
      }
    }
  })

  it('jedes Gerät passt auf die größte Fläche', () => {
    for (const e of EQUIPMENT) expect(hasFreeSpot([], EQUIPMENT_BY_ID, studioSize(99), e.id), e.id).toBe(true)
  })
})

describe('Zeichnen', () => {
  it('vier Vierteldrehungen ergeben wieder das Original, gedreht bleibt alles in der Grundfläche', () => {
    for (const e of EQUIPMENT) {
      const original = rotateBoxes(e.boxes, e.w, e.d, 0)
      const full = rotateBoxes(e.boxes, e.w, e.d, 4)
      full.forEach((b, i) => {
        expect(b.x, e.id).toBeCloseTo(original[i].x, 9)
        expect(b.y, e.id).toBeCloseTo(original[i].y, 9)
        expect([b.w, b.d], e.id).toEqual([original[i].w, original[i].d])
      })
      for (const b of rotateBoxes(e.boxes, e.w, e.d, 1)) {
        expect(b.x >= -1e-9 && b.y >= -1e-9 && b.x + b.w <= e.d + 1e-9 && b.y + b.d <= e.w + 1e-9, e.id).toBe(true)
      }
    }
  })

  it('eine Vierteldrehung dreht wirklich (Position und Größe)', () => {
    const [b] = rotateBoxes([[0, 0, 0, 1, 0.5, 1, '#000000']], 1, 2, 1)
    expect(b).toMatchObject({ x: 1.5, y: 0, w: 0.5, d: 1 })
  })

  it('hinten und unten wird zuerst gezeichnet', () => {
    const box = (name: string, x: number, y: number, z: number) => ({ name, x, y, z, w: 1, d: 1, h: 1 })
    const order = sortBackToFront([box('vorn', 1, 1, 0), box('oben', 0, 0, 1), box('hinten', 0, 0, 0), box('links', 0, 1, 0)]).map((b) => b.name)
    expect(order.indexOf('hinten')).toBeLessThan(order.indexOf('oben'))
    expect(order.indexOf('hinten')).toBeLessThan(order.indexOf('vorn'))
    expect(order.indexOf('oben')).toBeLessThan(order.indexOf('vorn'))
    expect(order.indexOf('links')).toBeLessThan(order.indexOf('vorn'))
  })
})
