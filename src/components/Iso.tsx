import { useMemo } from 'react'
import { EQUIPMENT_BY_ID, type Equipment } from '../data/equipment'
import { faces, project, rotateBoxes, screenBounds, shade, sortBackToFront, TILE, type Cuboid } from '../lib/iso'
import { footprint } from '../lib/studio'
import type { StudioItem } from '../lib/types'

const FLOOR = ['#c9a37c', '#bd9770']
const FLOOR_EDGE = '#8f7056'

const sorted = new Map<string, Cuboid[]>()

/** Quader eines Geräts in der gewünschten Drehung, schon in Zeichenreihenfolge. */
function equipmentCuboids(eq: Equipment, rot: number): Cuboid[] {
  const key = `${eq.id}:${((rot % 4) + 4) % 4}`
  let list = sorted.get(key)
  if (!list) {
    list = sortBackToFront(rotateBoxes(eq.boxes, eq.w, eq.d, rot))
    sorted.set(key, list)
  }
  return list
}

function Cuboids({ list, dx = 0, dy = 0 }: { list: Cuboid[]; dx?: number; dy?: number }) {
  return (
    <g stroke="rgba(0,0,0,0.3)" strokeWidth={0.6} strokeLinejoin="round">
      {list.map((c, i) => {
        const f = faces({ ...c, x: c.x + dx, y: c.y + dy })
        return (
          <g key={i}>
            <polygon points={f.left} fill={shade(c.color, 0.82)} />
            <polygon points={f.right} fill={shade(c.color, 0.64)} />
            <polygon points={f.top} fill={c.color} />
          </g>
        )
      })}
    </g>
  )
}

/** Kleines Bild eines Geräts für die Liste. */
export function EquipmentThumb({ eq, className = '' }: { eq: Equipment; className?: string }) {
  const list = equipmentCuboids(eq, 0)
  const b = useMemo(() => screenBounds(list), [list])
  return (
    <svg viewBox={`${b.minX - 2} ${b.minY - 2} ${b.maxX - b.minX + 4} ${b.maxY - b.minY + 4}`} className={className} aria-hidden>
      <Cuboids list={list} />
    </svg>
  )
}

const corners = (x: number, y: number, w: number, d: number, z = 0) =>
  [project(x, y, z), project(x + w, y, z), project(x + w, y + d, z), project(x, y + d, z)].map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')

/** Das Studio von schräg oben. Felder und Geräte lassen sich antippen. */
export function StudioScene({
  size,
  items,
  selectedUid,
  placing,
  onTile,
  onItem,
}: {
  size: number
  items: StudioItem[]
  selectedUid: string | null
  /** true, solange ein Gerät gesetzt oder verschoben wird: Dann zählen Tipps auf Felder, nicht auf Geräte. */
  placing: boolean
  onTile: (x: number, y: number) => void
  onItem: (uid: string) => void
}) {
  const ordered = useMemo(
    () =>
      sortBackToFront(
        items.flatMap((item) => {
          const eq = EQUIPMENT_BY_ID.get(item.type)
          if (!eq) return []
          const fp = footprint(eq, item.rot)
          return [{ x: item.x, y: item.y, z: 0, w: fp.w, d: fp.d, h: 1, item, eq }]
        }),
      ),
    [items],
  )
  const half = size * TILE
  const headroom = 2.4 * TILE
  const slab = faces({ x: 0, y: 0, z: -0.3, w: size, d: size, h: 0.3 })
  const tiles = Array.from({ length: size * size }, (_, i) => ({ x: i % size, y: Math.floor(i / size) }))

  return (
    <svg viewBox={`${-half - 4} ${-headroom} ${2 * half + 8} ${half + headroom + 0.3 * TILE + 4}`} className="h-auto w-full touch-manipulation select-none" role="img" aria-label="Dein Studio">
      <polygon points={slab.left} fill={shade(FLOOR_EDGE, 0.9)} />
      <polygon points={slab.right} fill={shade(FLOOR_EDGE, 0.7)} />
      {tiles.map((t) => (
        <polygon
          key={`${t.x}-${t.y}`}
          points={corners(t.x, t.y, 1, 1)}
          fill={FLOOR[(t.x + t.y) % 2]}
          stroke="rgba(0,0,0,0.12)"
          strokeWidth={0.5}
          className={placing ? 'cursor-pointer' : undefined}
          onClick={() => onTile(t.x, t.y)}
        />
      ))}
      {ordered.map(({ item, eq, w, d }) => (
        <g
          key={item.uid}
          onClick={(e) => {
            e.stopPropagation()
            onItem(item.uid)
          }}
          style={{ pointerEvents: placing ? 'none' : undefined, opacity: placing && item.uid !== selectedUid ? 0.8 : 1 }}
          className="cursor-pointer"
        >
          {item.uid === selectedUid && <polygon points={corners(item.x, item.y, w, d, 0.01)} fill="rgba(250,204,21,0.45)" stroke="#facc15" strokeWidth={2} />}
          <Cuboids list={equipmentCuboids(eq, item.rot)} dx={item.x} dy={item.y} />
        </g>
      ))}
    </svg>
  )
}
