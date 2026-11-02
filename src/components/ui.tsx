import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { parseDecimal, formatNumber } from '../lib/numbers'
import { useStore } from '../state/store'
import { IconBack, IconClose } from './Icons'

export function PageHeader({ title, back, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="mb-3 flex min-h-11 items-center gap-2">
      {back && (
        <button className="-ml-2 flex size-11 items-center justify-center rounded-full" onClick={() => navigate(-1)} aria-label="Zurück">
          <IconBack />
        </button>
      )}
      <h1 className="min-w-0 flex-1 truncate text-2xl font-bold tracking-tight">{title}</h1>
      {right}
    </div>
  )
}

/**
 * Zahlenfeld mit passender iPhone-Tastatur. Komma und Punkt erlaubt.
 * Der bisherige Wert steht als graue Vorgabe im Feld, solange nichts getippt wurde: Das erste Zeichen
 * ersetzt ihn, ohne dass man etwas löschen oder markieren muss. Feld wieder leeren = bisheriger Wert bleibt.
 * `muted`: Wert ist nur ein Vorschlag und bleibt auch ohne Fokus grau.
 */
export function NumberField({
  value,
  onChange,
  decimal = true,
  className = '',
  muted = false,
  label,
}: {
  value: number | null
  onChange: (v: number | null) => void
  decimal?: boolean
  className?: string
  muted?: boolean
  label: string
}) {
  // Getippter Text seit dem Antippen (z. B. „47,“); null = noch nichts getippt
  const [typed, setTyped] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const valueAtFocus = useRef(value)
  const hint = formatNumber(focused ? valueAtFocus.current : value)
  return (
    <input
      aria-label={label}
      className={`field text-center tabular-nums placeholder:text-zinc-500 dark:placeholder:text-zinc-400 ${className}`}
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="next"
      autoComplete="off"
      placeholder={hint}
      value={typed ?? (focused || muted ? '' : hint)}
      onFocus={() => {
        valueAtFocus.current = value
        setFocused(true)
      }}
      onBlur={() => {
        setFocused(false)
        setTyped(null)
      }}
      onChange={(e) => {
        const raw = decimal ? e.target.value : e.target.value.replace(/[^\d]/g, '')
        if (raw !== '' && parseDecimal(raw) === null) return
        setTyped(raw)
        onChange(raw === '' ? valueAtFocus.current : parseDecimal(raw))
      }}
    />
  )
}

/** Dezente „Gespeichert“-Rückmeldung nach jedem Autosave. */
export function SavedIndicator() {
  const { savedAt } = useStore()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!savedAt) return
    setVisible(true)
    const t = window.setTimeout(() => setVisible(false), 1500)
    return () => window.clearTimeout(t)
  }, [savedAt])
  return (
    <span className={`text-sm text-zinc-500 transition-opacity ${visible ? 'opacity-100' : 'opacity-0'}`} aria-live="polite">
      ✓ Gespeichert
    </span>
  )
}

/** Unteres Blatt (auf dem Desktop mittig) für Auswahlen und Formulare. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="pb-safe flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="flex size-11 items-center justify-center" onClick={onClose} aria-label="Schließen">
            <IconClose />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="grid rounded-xl bg-zinc-200 p-1 dark:bg-zinc-800" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          className={`min-h-10 rounded-lg px-1 text-sm leading-tight font-medium ${value === v ? 'bg-white shadow-sm dark:bg-zinc-600' : 'text-zinc-600 dark:text-zinc-400'}`}
          onClick={() => onChange(v)}
          aria-pressed={value === v}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="card text-center text-zinc-500">{children}</p>
}
