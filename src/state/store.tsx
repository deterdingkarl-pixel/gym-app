import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BUILTIN_EXERCISES, normalizeName } from '../data/exercises'
import { missingSeedPlans } from '../data/seedPlans'
import type { Unit } from '../lib/numbers'
import { TABLES, newId, type AnyRecord, type Exercise, type Muscle, type TableMap, type TableName } from '../lib/types'
import { createBackup, importBackup, parseBackup } from '../sync/backup'
import { countPending, syncOnce } from '../sync/engine'
import { idbStore, requestPersistentStorage } from '../sync/idb'
import { supabase, supabaseRemote } from '../sync/supabase'

export type Theme = 'system' | 'light' | 'dark'
export interface Settings {
  unit: Unit
  theme: Theme
}
const DEFAULT_SETTINGS: Settings = { unit: 'kg', theme: 'system' }

/** none = noch nicht entschieden (Willkommen-Seite), guest = nur lokal, user = angemeldet */
export type Mode = 'none' | 'guest' | 'user'

export interface SyncState {
  status: 'idle' | 'syncing' | 'error' | 'offline' | 'local'
  lastSyncAt: number | null
  pending: number
  error: string | null
}

type Data = { [K in TableName]: TableMap[K][] }

interface Store {
  ready: boolean
  data: Data
  /** Eingebaute + eigene (nicht gelöschte) Übungen */
  exercises: Exercise[]
  /** Alle Übungen inkl. gelöschter eigener – für Namen in alten Trainings */
  exerciseById: Map<string, Exercise>
  settings: Settings
  mode: Mode
  email: string | null
  sync: SyncState
  /** Zählt bei jedem erfolgreichen Speichern hoch (für die „Gespeichert“-Anzeige). */
  savedAt: number
  cloudAvailable: boolean
  save<K extends TableName>(kind: K, record: TableMap[K]): Promise<void>
  remove<K extends TableName>(kind: K, id: string): Promise<void>
  createExercise(name: string, muscle: Muscle): Promise<string>
  setSettings(patch: Partial<Settings>): Promise<void>
  startGuest(): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string): Promise<'signed-in' | 'confirm-email'>
  signOut(): Promise<void>
  syncNow(full?: boolean): Promise<void>
  exportBackup(): Promise<string>
  importBackupText(text: string): Promise<number>
}

const Ctx = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore außerhalb von StoreProvider')
  return s
}

const EMPTY: Data = { exercises: [], plans: [], workouts: [], bodyweights: [] }

async function loadAll(): Promise<Data> {
  const data = { ...EMPTY }
  for (const t of TABLES) (data as Record<TableName, AnyRecord[]>)[t] = await idbStore.getAll(t)
  return data
}

async function seedPlans() {
  const existing = new Set((await idbStore.getAll('plans')).map((p) => p.id))
  const missing = missingSeedPlans(existing)
  if (missing.length) await idbStore.putMany('plans', missing)
}

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#f4f4f5')
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [data, setData] = useState<Data>(EMPTY)
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS)
  const [mode, setMode] = useState<Mode>('none')
  const [email, setEmail] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState(0)
  const [sync, setSync] = useState<SyncState>({ status: 'local', lastSyncAt: null, pending: 0, error: null })

  const dataRef = useRef(data)
  dataRef.current = data
  const modeRef = useRef(mode)
  modeRef.current = mode
  const syncing = useRef(false)
  const syncAgain = useRef(false)
  const syncTimer = useRef<number | undefined>(undefined)

  const refreshPending = useCallback(async () => {
    const pending = await countPending(idbStore)
    setSync((s) => ({ ...s, pending }))
  }, [])

  // --- Abgleich -------------------------------------------------------------
  const runSync = useCallback(async () => {
    if (!supabase || modeRef.current !== 'user') return
    if (syncing.current) {
      syncAgain.current = true
      return
    }
    if (!navigator.onLine) {
      setSync((s) => ({ ...s, status: 'offline' }))
      return
    }
    syncing.current = true
    setSync((s) => ({ ...s, status: 'syncing' }))
    try {
      do {
        syncAgain.current = false
        const res = await syncOnce(idbStore, supabaseRemote(supabase))
        if (res.changedKinds.size > 0) {
          const next = { ...dataRef.current }
          for (const k of res.changedKinds) (next as Record<TableName, AnyRecord[]>)[k] = await idbStore.getAll(k)
          setData(next)
        }
      } while (syncAgain.current)
      const pending = await countPending(idbStore)
      setSync({ status: 'idle', lastSyncAt: Date.now(), pending, error: null })
    } catch (e) {
      const pending = await countPending(idbStore)
      setSync((s) => ({ ...s, status: navigator.onLine ? 'error' : 'offline', pending, error: (e as Error).message }))
    } finally {
      syncing.current = false
    }
  }, [])

  const scheduleSync = useCallback(
    (delay = 1500) => {
      window.clearTimeout(syncTimer.current)
      syncTimer.current = window.setTimeout(() => void runSync(), delay)
    },
    [runSync],
  )

  // --- Start ----------------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await seedPlans()
      const [loaded, storedSettings, storedMode] = await Promise.all([
        loadAll(),
        idbStore.getMeta<Settings>('settings'),
        idbStore.getMeta<Mode>('mode'),
      ])
      if (cancelled) return
      setData(loaded)
      const s = { ...DEFAULT_SETTINGS, ...storedSettings }
      setSettingsState(s)
      applyTheme(s.theme)

      let m: Mode = storedMode ?? 'none'
      if (supabase) {
        const { data: session } = await supabase.auth.getSession()
        if (session.session) {
          m = 'user'
          setEmail(session.session.user.email ?? null)
        } else if (m === 'user') {
          m = 'none' // Sitzung abgelaufen → neu anmelden; lokale Daten bleiben erhalten
        }
      } else if (m === 'none' || m === 'user') {
        m = 'guest'
      }
      setMode(m)
      await refreshPending()
      setReady(true)
      void requestPersistentStorage()
    })()
    return () => {
      cancelled = true
    }
  }, [refreshPending])

  // Abgleich beim Anmelden, beim Zurückkehren in die App, bei wiederhergestelltem Netz und jede Minute
  useEffect(() => {
    if (mode !== 'user') return
    scheduleSync(0)
    const onVisible = () => document.visibilityState === 'visible' && scheduleSync(0)
    const onOnline = () => scheduleSync(0)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    const interval = window.setInterval(() => document.visibilityState === 'visible' && void runSync(), 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      window.clearInterval(interval)
    }
  }, [mode, scheduleSync, runSync])

  useEffect(() => {
    if (settings.theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [settings.theme])

  // --- Speichern ------------------------------------------------------------
  const save = useCallback(
    async <K extends TableName>(kind: K, record: TableMap[K]) => {
      const list = dataRef.current[kind] as AnyRecord[]
      const prev = list.find((r) => r.id === record.id)
      // updatedAt immer streng steigend, auch wenn zwei Änderungen in derselben Millisekunde passieren
      const updatedAt = Math.max(Date.now(), (prev?.updatedAt ?? 0) + 1)
      const next = { ...record, updatedAt, dirty: true } as AnyRecord
      const nextList = prev ? list.map((r) => (r.id === record.id ? next : r)) : [...list, next]
      const nextData = { ...dataRef.current, [kind]: nextList }
      dataRef.current = nextData
      setData(nextData)
      await idbStore.putMany(kind, [next])
      setSavedAt(Date.now())
      setSync((s) => ({ ...s, pending: s.pending + (prev?.dirty ? 0 : 1) }))
      scheduleSync()
    },
    [scheduleSync],
  )

  const remove = useCallback(
    async <K extends TableName>(kind: K, id: string) => {
      const rec = (dataRef.current[kind] as AnyRecord[]).find((r) => r.id === id)
      if (rec) await save(kind, { ...rec, deleted: true } as TableMap[K])
    },
    [save],
  )

  const customExercises = useMemo(() => data.exercises.filter((e) => !e.deleted), [data.exercises])
  const exercises = useMemo(
    () => [...BUILTIN_EXERCISES, ...customExercises].sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [customExercises],
  )
  const exerciseById = useMemo(() => new Map([...data.exercises, ...BUILTIN_EXERCISES].map((e) => [e.id, e])), [data.exercises])

  const createExercise = useCallback(
    async (name: string, muscle: Muscle) => {
      const norm = normalizeName(name)
      const existing = exercises.find((e) => normalizeName(e.name) === norm)
      if (existing) return existing.id
      const id = `c-${newId()}`
      await save('exercises', { id, name: name.trim(), muscle, updatedAt: 0, deleted: false })
      return id
    },
    [exercises, save],
  )

  const setSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch }
      applyTheme(next.theme)
      void idbStore.setMeta('settings', next)
      return next
    })
  }, [])

  // --- Konto ----------------------------------------------------------------
  const startGuest = useCallback(async () => {
    await idbStore.setMeta('mode', 'guest')
    setMode('guest')
  }, [])

  const afterLogin = useCallback(
    async (userEmail: string | null, userId: string) => {
      const owner = await idbStore.getMeta<string>('owner')
      if (owner && owner !== userId) {
        // Daten eines anderen Kontos auf diesem Gerät nie vermischen
        await idbStore.clearAll()
        await seedPlans()
        setData(await loadAll())
      } else if (!owner && (await countPending(idbStore)) > 0) {
        const keep = window.confirm(
          'Auf diesem Gerät gibt es Daten aus dem Gastmodus. Sollen sie in dein Konto übernommen werden?\n\nOK = übernehmen, Abbrechen = verwerfen',
        )
        if (!keep) {
          await idbStore.clearAll()
          await seedPlans()
          setData(await loadAll())
        }
      }
      await idbStore.setMeta('owner', userId)
      await idbStore.setMeta('mode', 'user')
      setEmail(userEmail)
      setMode('user')
      await refreshPending()
    },
    [refreshPending],
  )

  const signIn = useCallback(
    async (mail: string, password: string) => {
      if (!supabase) throw new Error('Cloud ist nicht eingerichtet.')
      const { data: res, error } = await supabase.auth.signInWithPassword({ email: mail, password })
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-Mail oder Passwort falsch.' : error.message)
      await afterLogin(res.user.email ?? null, res.user.id)
    },
    [afterLogin],
  )

  const signUp = useCallback(
    async (mail: string, password: string) => {
      if (!supabase) throw new Error('Cloud ist nicht eingerichtet.')
      const { data: res, error } = await supabase.auth.signUp({ email: mail, password })
      if (error) throw new Error(error.message)
      if (!res.session || !res.user) return 'confirm-email' as const
      await afterLogin(res.user.email ?? null, res.user.id)
      return 'signed-in' as const
    },
    [afterLogin],
  )

  const signOut = useCallback(async () => {
    if (modeRef.current === 'user') {
      await runSync()
      const pending = await countPending(idbStore)
      if (
        pending > 0 &&
        !window.confirm(
          `${pending} Änderung(en) sind noch nicht in der Cloud und gehen beim Abmelden verloren.\nTipp: Vorher in den Einstellungen ein Backup exportieren.\n\nTrotzdem abmelden?`,
        )
      )
        return
      await supabase?.auth.signOut()
    } else if (!window.confirm('Gastmodus beenden? Alle Daten auf diesem Gerät werden entfernt. Vorher ein Backup exportieren!')) {
      return
    }
    const keepSettings = await idbStore.getMeta<Settings>('settings')
    await idbStore.clearAll()
    if (keepSettings) await idbStore.setMeta('settings', keepSettings)
    await seedPlans()
    setData(await loadAll())
    setEmail(null)
    setMode(supabase ? 'none' : 'guest')
    setSync({ status: 'local', lastSyncAt: null, pending: 0, error: null })
  }, [runSync])

  const syncNow = useCallback(
    async (full = false) => {
      if (full) await idbStore.setMeta('syncCursor', null)
      await runSync()
    },
    [runSync],
  )

  const exportBackup = useCallback(async () => JSON.stringify(await createBackup(idbStore), null, 2), [])

  const importBackupText = useCallback(
    async (text: string) => {
      const count = await importBackup(idbStore, parseBackup(text))
      setData(await loadAll())
      await refreshPending()
      scheduleSync(0)
      return count
    },
    [refreshPending, scheduleSync],
  )

  const value: Store = {
    ready,
    data,
    exercises,
    exerciseById,
    settings,
    mode,
    email,
    sync,
    savedAt,
    cloudAvailable: supabase !== null,
    save,
    remove,
    createExercise,
    setSettings,
    startGuest,
    signIn,
    signUp,
    signOut,
    syncNow,
    exportBackup,
    importBackupText,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
