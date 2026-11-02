import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Empty, PageHeader } from '../components/ui'
import { addDays, formatDate, formatDuration, formatShortDate, localDate } from '../lib/date'
import { garminActivities, garminDays, mergeSnapshot, type GarminSnapshot } from '../lib/garmin'
import { formatNumber } from '../lib/numbers'
import { useStore } from '../state/store'
import { idbStore } from '../sync/idb'
import { supabase } from '../sync/supabase'

const CACHE_KEY = 'garminSnapshot'
const REFRESH_MS = 5 * 60_000
const RANGE_DAYS = 7

const MESSAGES: Record<string, string> = {
  'no-key': 'Der Garmin-Schlüssel ist noch nicht hinterlegt. Trage ihn in Vercel als GARMIN_API_KEY ein.',
  'not-configured': 'Garmin ist auf dem Server noch nicht eingerichtet (GARMIN_ALLOWED_EMAIL fehlt in Vercel).',
  forbidden: 'Dieses Konto darf die Garmin-Daten nicht abrufen. Melde dich mit der hinterlegten E-Mail an.',
  'key-invalid': 'Garmin lehnt den Schlüssel ab. Vermutlich ist er abgelaufen oder wurde gelöscht. Erstelle in Garmin Connect einen neuen und trage ihn in Vercel ein.',
  'rate-limited': 'Garmin bremst gerade die Abfragen. Versuche es später noch einmal.',
  'garmin-unreachable': 'Garmin antwortet gerade nicht. Versuche es später noch einmal.',
  offline: 'Keine Verbindung. Du siehst den zuletzt geladenen Stand.',
}
const UNKNOWN_ERROR = 'Die Garmin-Daten konnten nicht geladen werden.'

async function requestSnapshot(start: string, end: string): Promise<GarminSnapshot> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
  if (!data.session) throw new Error('forbidden')
  let res: Response
  try {
    res = await fetch(`/api/garmin?start=${start}&end=${end}`, { headers: { Authorization: `Bearer ${data.session.access_token}` } })
  } catch {
    throw new Error('offline')
  }
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.results) throw new Error(body?.code ?? 'unknown')
  return body
}

const value = (n: number | null, digits = 0) => (n === null ? '–' : formatNumber(n, digits))
const sleep = (seconds: number | null) => (seconds === null ? '–' : formatDuration(seconds * 1000))

function Stat({ label, main, sub }: { label: string; main: string; sub?: string }) {
  return (
    <div className="card">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{main}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  )
}

/** Garmin-Daten: holt beim Öffnen, beim Zurückkehren in die App und alle 5 Minuten neu. Zeigt sonst den gespeicherten Stand. */
export function GarminPage() {
  const { mode } = useStore()
  const [snapshot, setSnapshot] = useState<GarminSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  const snapshotRef = useRef<GarminSnapshot | null>(null)
  const today = localDate()
  const start = addDays(today, -(RANGE_DAYS - 1))

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    try {
      const next = mergeSnapshot(snapshotRef.current, await requestSnapshot(addDays(localDate(), -(RANGE_DAYS - 1)), localDate()))
      snapshotRef.current = next
      setSnapshot(next)
      setError(null)
      await idbStore.setMeta(CACHE_KEY, next)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mode !== 'user') return
    void idbStore.getMeta<GarminSnapshot>(CACHE_KEY).then((stored) => {
      if (stored && !snapshotRef.current) {
        snapshotRef.current = stored
        setSnapshot(stored)
      }
      void refresh()
    })
    const onVisible = () => document.visibilityState === 'visible' && void refresh()
    document.addEventListener('visibilitychange', onVisible)
    const interval = window.setInterval(() => document.visibilityState === 'visible' && void refresh(), REFRESH_MS)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(interval)
    }
  }, [mode, refresh])

  const days = useMemo(() => garminDays(snapshot?.results ?? {}, start, today), [snapshot, start, today])
  const activities = useMemo(() => garminActivities(snapshot?.results ?? {}), [snapshot])

  if (mode !== 'user') return <Empty>Garmin-Daten gibt es nur mit Konto. Melde dich dafür in den Einstellungen an.</Empty>

  const now = days[0]
  const missing = snapshot ? Object.keys(snapshot.errors).length : 0

  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title="Garmin"
        right={
          <button className="btn btn-secondary" disabled={loading} onClick={() => void refresh()}>
            {loading ? 'Lädt …' : 'Aktualisieren'}
          </button>
        }
      />
      {error && <p className="card text-sm text-red-600 dark:text-red-400">{MESSAGES[error] ?? UNKNOWN_ERROR}</p>}
      {snapshot && (
        <p className="px-1 text-sm text-zinc-500">
          Abgerufen: {new Date(snapshot.fetchedAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr. So
          aktuell wie die letzte Synchronisierung deiner Uhr.
          {missing > 0 && ` ${missing} Bereich(e) konnten diesmal nicht geladen werden.`}
        </p>
      )}
      {!snapshot && !error && <Empty>Lade Garmin-Daten …</Empty>}

      {snapshot && (
        <>
          <h2 className="px-1 font-semibold">Heute</h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Schritte" main={value(now.steps)} sub={now.stepGoal !== null ? `Ziel ${value(now.stepGoal)}` : undefined} />
            <Stat label="Ruhepuls" main={value(now.restingHr)} sub="Schläge/Min." />
            <Stat label="Schlaf" main={sleep(now.sleepSeconds)} sub={now.sleepScore !== null ? `Bewertung ${value(now.sleepScore)}` : undefined} />
            <Stat label="Stress" main={value(now.stress)} sub="0–100" />
            <Stat label="Body Battery" main={value(now.bodyBattery)} sub="0–100" />
          </div>

          <h2 className="px-1 font-semibold">Letzte {RANGE_DAYS} Tage</h2>
          <div className="card p-0">
            <div className="grid grid-cols-[3.5rem_repeat(4,minmax(0,1fr))] gap-x-2 border-b border-zinc-100 px-4 py-2 text-right text-xs text-zinc-500 dark:border-zinc-800">
              <span className="text-left">Tag</span>
              <span>Schritte</span>
              <span>Puls</span>
              <span>Schlaf</span>
              <span>Stress</span>
            </div>
            {days.map((d) => (
              <div key={d.date} className="grid min-h-11 grid-cols-[3.5rem_repeat(4,minmax(0,1fr))] items-center gap-x-2 border-b border-zinc-100 px-4 text-right text-sm tabular-nums last:border-0 dark:border-zinc-800">
                <span className="text-left text-zinc-500">{formatShortDate(d.date)}</span>
                <span>{value(d.steps)}</span>
                <span>{value(d.restingHr)}</span>
                <span>{d.sleepSeconds === null ? '–' : `${formatNumber(d.sleepSeconds / 3600, 1)} h`}</span>
                <span>{value(d.stress)}</span>
              </div>
            ))}
          </div>

          <h2 className="px-1 font-semibold">Letzte Aktivitäten</h2>
          {activities.length === 0 ? (
            <Empty>Keine Aktivitäten gefunden.</Empty>
          ) : (
            <ul className="card divide-y divide-zinc-100 p-0 dark:divide-zinc-800">
              {activities.map((a) => (
                <li key={a.id} className="px-4 py-3">
                  <div className="font-medium">{a.name}</div>
                  <div className="text-sm text-zinc-500 tabular-nums">
                    {[
                      a.date && formatDate(a.date),
                      a.durationSeconds !== null && formatDuration(a.durationSeconds * 1000),
                      a.distanceMeters ? `${formatNumber(a.distanceMeters / 1000, 2)} km` : null,
                      a.averageHr !== null && `Ø ${value(a.averageHr)} Puls`,
                      a.calories !== null && `${value(a.calories)} kcal`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
