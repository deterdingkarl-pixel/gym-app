import { TABLES, type AnyRecord, type TableName } from '../lib/types'
import type { LocalStore } from './engine'

// Lokale Datenbank im Browser (IndexedDB). Eine Tabelle pro Datentyp, plus "meta" für Einstellungen/Sync-Stand.
const DB_NAME = 'gym-app'
const DB_VERSION = 1

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Speichern abgebrochen'))
  })
}

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION)
    r.onupgradeneeded = () => {
      const db = r.result
      for (const t of TABLES) if (!db.objectStoreNames.contains(t)) db.createObjectStore(t, { keyPath: 'id' })
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta')
    }
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
  return dbPromise
}

export const idbStore: LocalStore & { clearAll(): Promise<void> } = {
  async get(kind: TableName, id: string) {
    const db = await open()
    return req<AnyRecord | undefined>(db.transaction(kind).objectStore(kind).get(id))
  },
  async getAll(kind: TableName) {
    const db = await open()
    return req<AnyRecord[]>(db.transaction(kind).objectStore(kind).getAll())
  },
  async putMany(kind: TableName, records: AnyRecord[]) {
    const db = await open()
    const tx = db.transaction(kind, 'readwrite')
    const store = tx.objectStore(kind)
    for (const r of records) store.put(r)
    await done(tx)
  },
  async getMeta<T>(key: string) {
    const db = await open()
    return req<T | undefined>(db.transaction('meta').objectStore('meta').get(key))
  },
  async setMeta(key: string, value: unknown) {
    const db = await open()
    const tx = db.transaction('meta', 'readwrite')
    tx.objectStore('meta').put(value, key)
    await done(tx)
  },
  async clearAll() {
    const db = await open()
    const tx = db.transaction([...TABLES, 'meta'], 'readwrite')
    for (const t of [...TABLES, 'meta']) tx.objectStore(t).clear()
    await done(tx)
  },
}

/** Bittet den Browser, die Daten nicht automatisch zu löschen (wichtig für Safari). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
