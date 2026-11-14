import { useMemo, useRef, useState } from 'react'
import { IconDown, IconUp } from '../components/Icons'
import { EquipmentThumb, StudioScene } from '../components/Iso'
import { EQUIPMENT, EQUIPMENT_BY_ID, TIERS, type Equipment } from '../data/equipment'
import { formatNumber } from '../lib/numbers'
import { canPlace, clampToFloor, earnedHours, footprint, hasFreeSpot, nextExpansionCost, spentHours, studioSize } from '../lib/studio'
import { runningWorkout } from '../lib/training'
import { newId, STUDIO_ID, type Studio } from '../lib/types'
import { useStore } from '../state/store'

type Mode = { kind: 'place'; type: string; rot: number } | { kind: 'move'; uid: string } | null

/** Guthaben wird abgerundet angezeigt, damit nie mehr dasteht, als wirklich da ist. */
const hours = (n: number) => `${formatNumber(Math.floor(n * 10 + 1e-6) / 10, 1)} h`
const missing = (n: number) => `${formatNumber(Math.ceil(n * 10 - 1e-6) / 10, 1)} h`
const EMPTY_STUDIO: Studio = { id: STUDIO_ID, name: 'Mein Studio', level: 0, items: [], updatedAt: 0, deleted: false }

/** Das eigene Studio: Trainingsstunden sammeln und damit Geräte kaufen, aufstellen und die Fläche erweitern. */
export function StudioPage() {
  const { data, save } = useStore()
  const studio = useMemo(() => data.studio.find((s) => s.id === STUDIO_ID && !s.deleted) ?? EMPTY_STUDIO, [data.studio])
  const earned = useMemo(() => earnedHours(data.workouts), [data.workouts])
  const [mode, setMode] = useState<Mode>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({ basis: true })
  const sceneRef = useRef<HTMLDivElement>(null)

  const size = studioSize(studio.level)
  const spent = spentHours(studio, EQUIPMENT_BY_ID)
  const balance = earned - spent
  const canAfford = (cost: number) => balance + 1e-6 >= cost
  const expansion = nextExpansionCost(studio.level)
  const selectedItem = studio.items.find((i) => i.uid === selected)
  const selectedEq = selectedItem ? EQUIPMENT_BY_ID.get(selectedItem.type) : undefined
  const placingEq = mode?.kind === 'place' ? EQUIPMENT_BY_ID.get(mode.type) : undefined

  const update = (patch: Partial<Studio>) => void save('studio', { ...studio, ...patch })
  const showScene = () => sceneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const pick = (eq: Equipment) => {
    setSelected(null)
    if (!hasFreeSpot(studio.items, EQUIPMENT_BY_ID, size, eq.id)) {
      setMode(null)
      setHint(`Für „${eq.name}“ ist kein Platz mehr. Erweitere die Fläche oder entferne ein Gerät.`)
    } else {
      setMode({ kind: 'place', type: eq.id, rot: 0 })
      setHint(null)
    }
    showScene()
  }

  const onTile = (x: number, y: number) => {
    if (!mode) return setSelected(null)
    const moving = mode.kind === 'move' ? studio.items.find((i) => i.uid === mode.uid) : undefined
    const eq = mode.kind === 'place' ? placingEq : moving && EQUIPMENT_BY_ID.get(moving.type)
    if (!eq) return setMode(null)
    const rot = mode.kind === 'place' ? mode.rot : (moving?.rot ?? 0)
    // Das angetippte Feld wird die Mitte des Geräts
    const fp = footprint(eq, rot)
    const pos = clampToFloor(size, fp, x - Math.floor((fp.w - 1) / 2), y - Math.floor((fp.d - 1) / 2))
    if (!canPlace(studio.items, EQUIPMENT_BY_ID, size, eq.id, pos.x, pos.y, rot, moving?.uid)) {
      return setHint('Hier ist kein Platz. Tippe auf ein anderes Feld oder drehe das Gerät.')
    }
    if (moving) {
      update({ items: studio.items.map((i) => (i.uid === moving.uid ? { ...i, ...pos } : i)) })
    } else {
      const uid = newId()
      update({ items: [...studio.items, { uid, type: eq.id, ...pos, rot }] })
      setSelected(uid)
    }
    setMode(null)
    setHint(null)
  }

  const rotate = () => {
    if (mode?.kind === 'place') return setMode({ ...mode, rot: (mode.rot + 1) % 4 })
    if (!selectedItem || !selectedEq) return
    // Nächste Drehung, die an dieser Stelle passt (eine halbe Drehung passt immer)
    for (const step of [1, 2, 3]) {
      const rot = (selectedItem.rot + step) % 4
      const pos = clampToFloor(size, footprint(selectedEq, rot), selectedItem.x, selectedItem.y)
      if (canPlace(studio.items, EQUIPMENT_BY_ID, size, selectedEq.id, pos.x, pos.y, rot, selectedItem.uid)) {
        setHint(null)
        return update({ items: studio.items.map((i) => (i.uid === selectedItem.uid ? { ...i, ...pos, rot } : i)) })
      }
    }
  }

  const removeSelected = () => {
    if (!selectedItem || !selectedEq) return
    if (!window.confirm(`„${selectedEq.name}“ entfernen? Du bekommst ${hours(selectedEq.cost)} zurück.`)) return
    update({ items: studio.items.filter((i) => i.uid !== selectedItem.uid) })
    setSelected(null)
  }

  const expand = () => {
    if (expansion === null || !canAfford(expansion)) return
    if (!window.confirm(`Fläche für ${hours(expansion)} auf ${size + 2} × ${size + 2} Felder erweitern?`)) return
    update({ level: studio.level + 1 })
    showScene()
  }

  const rename = () => {
    const name = window.prompt('Name deines Studios', studio.name)?.trim()
    if (name) update({ name: name.slice(0, 40) })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight">{studio.name}</h1>
        <button className="min-h-11 shrink-0 text-sm text-zinc-500" onClick={rename}>
          ändern
        </button>
      </div>

      <div className="card">
        <div>
          <span className="text-3xl font-bold tabular-nums">{hours(balance)}</span>
          <span className="ml-2 text-zinc-500">zum Ausgeben</span>
        </div>
        <div className="text-sm text-zinc-500">
          Gesammelt {hours(earned)} · ausgegeben {hours(spent)}
          {runningWorkout(data.workouts) && ' · das laufende Training zählt nach dem Stoppen'}
        </div>
      </div>

      <div ref={sceneRef} className="scroll-mt-16 rounded-2xl bg-zinc-900 p-2">
        <StudioScene
          size={size}
          items={studio.items}
          selectedUid={mode?.kind === 'move' ? mode.uid : selected}
          placing={mode !== null}
          onTile={onTile}
          onItem={(uid) => {
            setSelected(uid)
            setHint(null)
          }}
        />
      </div>

      <div className="card flex flex-col gap-2">
        {mode?.kind === 'place' && placingEq ? (
          <>
            <p>
              <strong>{placingEq.name}</strong> aufstellen: Tippe auf ein freies Feld. Erst dann werden {hours(placingEq.cost)} abgezogen.
            </p>
            <div className="flex gap-2">
              <button className="btn btn-secondary flex-1" onClick={rotate}>
                Drehen
              </button>
              <button className="btn btn-secondary flex-1" onClick={() => setMode(null)}>
                Abbrechen
              </button>
            </div>
          </>
        ) : mode?.kind === 'move' ? (
          <>
            <p>Tippe auf das Feld, auf das das Gerät soll.</p>
            <button className="btn btn-secondary" onClick={() => setMode(null)}>
              Abbrechen
            </button>
          </>
        ) : selectedItem && selectedEq ? (
          <>
            <p className="font-semibold">{selectedEq.name}</p>
            <div className="flex gap-2">
              <button className="btn btn-secondary flex-1 px-2" onClick={() => setMode({ kind: 'move', uid: selectedItem.uid })}>
                Verschieben
              </button>
              <button className="btn btn-secondary flex-1 px-2" onClick={rotate}>
                Drehen
              </button>
              <button className="btn btn-danger flex-1 px-2" onClick={removeSelected}>
                Entfernen
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            {studio.items.length > 0 ? 'Tippe ein Gerät an, um es zu verschieben, zu drehen oder zu entfernen.' : 'Noch leer. Kaufe unten dein erstes Gerät mit deinen Trainingsstunden.'}
          </p>
        )}
        {hint && <p className="text-sm text-red-600 dark:text-red-400">{hint}</p>}
      </div>

      <h2 className="mt-2 text-xl font-bold tracking-tight">Gerätewerkstatt</h2>

      <button className="card flex items-center gap-3 text-left disabled:opacity-60" disabled={expansion === null || !canAfford(expansion)} onClick={expand}>
        <div className="flex-1">
          <div className="font-semibold">Fläche erweitern</div>
          <div className="text-sm text-zinc-500">
            {expansion === null ? `Größte Fläche erreicht (${size} × ${size} Felder)` : `Von ${size} × ${size} auf ${size + 2} × ${size + 2} Felder`}
          </div>
        </div>
        {expansion !== null && <Price cost={expansion} balance={balance} affordable={canAfford(expansion)} />}
      </button>

      {TIERS.map((tier) => {
        const list = EQUIPMENT.filter((e) => e.tier === tier.id)
        const isOpen = open[tier.id] ?? false
        return (
          <section key={tier.id} className="flex flex-col gap-2">
            <button className="card flex items-center gap-3 text-left" onClick={() => setOpen({ ...open, [tier.id]: !isOpen })} aria-expanded={isOpen}>
              <div className="flex-1">
                <div className="font-semibold">{tier.name}</div>
                <div className="text-sm text-zinc-500">
                  {list.length} Geräte · ab {hours(Math.min(...list.map((e) => e.cost)))}
                </div>
              </div>
              {isOpen ? <IconUp className="size-5 text-zinc-400" /> : <IconDown className="size-5 text-zinc-400" />}
            </button>
            {isOpen &&
              list.map((eq) => {
                const owned = studio.items.filter((i) => i.type === eq.id).length
                const affordable = canAfford(eq.cost)
                return (
                  <button key={eq.id} className="card flex items-center gap-3 py-3 text-left disabled:opacity-60" disabled={!affordable} onClick={() => pick(eq)}>
                    <span className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-zinc-100 p-1 dark:bg-zinc-700">
                      <EquipmentThumb eq={eq} className="h-full w-full" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{eq.name}</span>
                      <span className="block text-sm text-zinc-500">
                        {eq.w}×{eq.d} Felder{owned > 0 && ` · ${owned}× im Studio`}
                      </span>
                    </span>
                    <Price cost={eq.cost} balance={balance} affordable={affordable} />
                  </button>
                )
              })}
          </section>
        )
      })}
    </div>
  )
}

function Price({ cost, balance, affordable }: { cost: number; balance: number; affordable: boolean }) {
  if (affordable) return <span className="shrink-0 rounded-xl bg-zinc-900 px-3 py-1.5 font-semibold text-white tabular-nums dark:bg-zinc-100 dark:text-zinc-900">{hours(cost)}</span>
  return (
    <span className="shrink-0 text-right text-sm text-zinc-500 tabular-nums">
      {hours(cost)}
      <span className="block">noch {missing(cost - Math.max(0, balance))}</span>
    </span>
  )
}
