import { useEffect, useState, type ReactNode } from 'react'
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
 * Hält den getippten Text lokal (z. B. „47,“), meldet nach außen nur gültige Zahlen oder null.
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
  const [text, setText] = useState(formatNumber(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(formatNumber(value))
  }, [value, focused])
  return (
    <input
      aria-label={label}
      className={`field text-center tabular-nums ${muted ? 'text-zinc-400 dark:text-zinc-500' : ''} ${className}`}
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="next"
      autoComplete="off"
      value={text}
      onFocus={(e) => {
        setFocused(true)
        e.currentTarget.select()
      }}
      onBlur={() => {
        setFocused(false)
        setText(formatNumber(value))
      }}
      onChange={(e) => {
        const raw = decimal ? e.target.value : e.target.value.replace(/[^\d]/g, '')
        if (raw !== '' && parseDecimal(raw) === null) return
        setText(raw)
        onChange(parseDecimal(raw))
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

export function Empty({ children }: { children: ReactNode }) {
  return <p className="card text-center text-zinc-500">{children}</p>
}
