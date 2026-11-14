// Isometrische Darstellung für das Studio: Alles besteht aus Quadern in Kachel-Einheiten.

/** Ein Quader: Position (x, y, z), Größe (w, d, h) und Farbe. */
export type Box = [x: number, y: number, z: number, w: number, d: number, h: number, color: string]

export interface Extent {
  x: number
  y: number
  z: number
  w: number
  d: number
  h: number
}

export interface Cuboid extends Extent {
  color: string
}

/** Halbe Kachelbreite in SVG-Einheiten. */
export const TILE = 32

/** Projektion auf den Bildschirm: x läuft nach rechts unten, y nach links unten, z nach oben. */
export function project(x: number, y: number, z: number): [number, number] {
  return [(x - y) * TILE, ((x + y) * TILE) / 2 - z * TILE]
}

/** Dreht die Quader eines Geräts mit Grundfläche w × d um `rot` Vierteldrehungen. */
export function rotateBoxes(boxes: Box[], w: number, d: number, rot: number): Cuboid[] {
  let list: Cuboid[] = boxes.map(([x, y, z, bw, bd, h, color]) => ({ x, y, z, w: bw, d: bd, h, color }))
  let depth = d
  let width = w
  for (let i = 0; i < ((rot % 4) + 4) % 4; i++) {
    const currentDepth = depth
    list = list.map((b) => ({ ...b, x: currentDepth - (b.y + b.d), y: b.x, w: b.d, d: b.w }))
    ;[width, depth] = [depth, width]
  }
  return list
}

const EPS = 1e-6

/** −1: a muss vor b gezeichnet werden (a liegt dahinter oder darunter), 1: umgekehrt, 0: egal. */
function order(a: Extent, b: Extent): number {
  const aBehind = a.x + a.w <= b.x + EPS || a.y + a.d <= b.y + EPS
  const bBehind = b.x + b.w <= a.x + EPS || b.y + b.d <= a.y + EPS
  if (aBehind !== bBehind) return aBehind ? -1 : 1
  if (aBehind) return 0
  if (a.z + a.h <= b.z + EPS) return -1
  if (b.z + b.h <= a.z + EPS) return 1
  return 0
}

/** Sortiert so, dass weiter hinten Liegendes zuerst gezeichnet wird. Wo es egal ist, bleibt die Reihenfolge der Liste. */
export function sortBackToFront<T extends Extent>(boxes: T[]): T[] {
  const n = boxes.length
  const after: number[][] = boxes.map(() => [])
  const waiting = new Array<number>(n).fill(0)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const o = order(boxes[i], boxes[j])
      if (o < 0) {
        after[i].push(j)
        waiting[j]++
      } else if (o > 0) {
        after[j].push(i)
        waiting[i]++
      }
    }
  }
  const done = new Array<boolean>(n).fill(false)
  const result: T[] = []
  while (result.length < n) {
    let next = -1
    for (let i = 0; i < n; i++) {
      if (!done[i] && waiting[i] === 0) {
        next = i
        break
      }
    }
    if (next < 0) next = done.indexOf(false) // Kreis in den Bedingungen: Reihenfolge der Liste behalten
    done[next] = true
    result.push(boxes[next])
    for (const j of after[next]) waiting[j]--
  }
  return result
}

const points = (corners: [number, number, number][]) => corners.map(([x, y, z]) => project(x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ')

/** Die drei sichtbaren Flächen eines Quaders als SVG-Polygonpunkte. */
export function faces(c: Extent): { top: string; left: string; right: string } {
  const x1 = c.x + c.w
  const y1 = c.y + c.d
  const z1 = c.z + c.h
  return {
    top: points([[c.x, c.y, z1], [x1, c.y, z1], [x1, y1, z1], [c.x, y1, z1]]),
    left: points([[c.x, y1, z1], [x1, y1, z1], [x1, y1, c.z], [c.x, y1, c.z]]),
    right: points([[x1, c.y, z1], [x1, y1, z1], [x1, y1, c.z], [x1, c.y, c.z]]),
  }
}

/** Bildschirm-Rahmen um alle Quader. */
export function screenBounds(list: Extent[]): { minX: number; minY: number; maxX: number; maxY: number } {
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  for (const c of list) {
    for (const x of [c.x, c.x + c.w]) {
      for (const y of [c.y, c.y + c.d]) {
        for (const z of [c.z, c.z + c.h]) {
          const [sx, sy] = project(x, y, z)
          b.minX = Math.min(b.minX, sx)
          b.maxX = Math.max(b.maxX, sx)
          b.minY = Math.min(b.minY, sy)
          b.maxY = Math.max(b.maxY, sy)
        }
      }
    }
  }
  return b
}

/** Farbe abdunkeln (#rrggbb, Faktor 0–1). */
export function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16)
  const part = (shift: number) => Math.round(((n >> shift) & 255) * factor)
  return `rgb(${part(16)},${part(8)},${part(0)})`
}
