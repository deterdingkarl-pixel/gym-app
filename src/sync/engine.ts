import { TABLES, type AnyRecord, type TableName } from '../lib/types'
import { resolveIncoming, stripLocal } from './merge'

/** So liegt ein Eintrag in der Cloud-Tabelle "records". */
export interface RemoteRow {
  kind: TableName
  id: string
  data: AnyRecord
  updated_at: number
  deleted: boolean
  server_updated_at?: string
}

export interface Remote {
  /** Alle Zeilen, die die Cloud nach `since` (Server-Zeit) gespeichert hat. */
  pull(since: string | null): Promise<RemoteRow[]>
  push(rows: RemoteRow[]): Promise<void>
}

export interface LocalStore {
  get(kind: TableName, id: string): Promise<AnyRecord | undefined>
  getAll(kind: TableName): Promise<AnyRecord[]>
  /** Schreibt Einträge unverändert (ohne updatedAt anzufassen). */
  putMany(kind: TableName, records: AnyRecord[]): Promise<void>
  getMeta<T>(key: string): Promise<T | undefined>
  setMeta(key: string, value: unknown): Promise<void>
}

export const CURSOR_KEY = 'syncCursor'
/** Sicherheitsabstand: wir holen immer ein Stück überlappend, doppelt holen schadet nicht. */
const OVERLAP_MS = 60_000

export interface SyncResult {
  pulled: number
  applied: number
  pushed: number
  changedKinds: Set<TableName>
}

/**
 * Ein Abgleich: erst holen, dann hochladen.
 * - Holen: jede Cloud-Zeile wird einzeln mit `resolveIncoming` geprüft. Ein Fehler beim Holen
 *   bricht ab, BEVOR lokal irgendetwas geändert wurde.
 * - Hochladen: alle lokal geänderten Einträge. Die „noch nicht hochgeladen“-Markierung wird nur
 *   entfernt, wenn der Eintrag sich während des Hochladens nicht weiter verändert hat.
 */
export async function syncOnce(local: LocalStore, remote: Remote): Promise<SyncResult> {
  const result: SyncResult = { pulled: 0, applied: 0, pushed: 0, changedKinds: new Set() }

  // 1) Holen
  const cursor = await local.getMeta<string>(CURSOR_KEY)
  const since = cursor ? new Date(new Date(cursor).getTime() - OVERLAP_MS).toISOString() : null
  const rows = await remote.pull(since)
  result.pulled = rows.length

  let newCursor = cursor ?? null
  const byKind = new Map<TableName, AnyRecord[]>()
  for (const row of rows) {
    if (!TABLES.includes(row.kind)) continue
    const incoming = { ...row.data, id: row.id, updatedAt: row.updated_at, deleted: row.deleted } as AnyRecord
    const current = await local.get(row.kind, row.id)
    const resolved = resolveIncoming(current, incoming)
    if (resolved) {
      const list = byKind.get(row.kind) ?? []
      list.push(resolved)
      byKind.set(row.kind, list)
    }
    if (row.server_updated_at && (!newCursor || row.server_updated_at > newCursor)) newCursor = row.server_updated_at
  }
  for (const [kind, list] of byKind) {
    await local.putMany(kind, list)
    result.applied += list.length
    result.changedKinds.add(kind)
  }
  if (newCursor) await local.setMeta(CURSOR_KEY, newCursor)

  // 2) Hochladen
  const pending: RemoteRow[] = []
  for (const kind of TABLES) {
    for (const rec of await local.getAll(kind)) {
      if (!rec.dirty) continue
      const clean = stripLocal(rec)
      pending.push({ kind, id: rec.id, data: clean, updated_at: rec.updatedAt, deleted: rec.deleted })
    }
  }
  for (let i = 0; i < pending.length; i += 200) {
    const batch = pending.slice(i, i + 200)
    await remote.push(batch)
    for (const row of batch) {
      const current = await local.get(row.kind, row.id)
      if (current && current.dirty && current.updatedAt === row.updated_at) {
        await local.putMany(row.kind, [{ ...current, dirty: false }])
      }
    }
    result.pushed += batch.length
  }
  return result
}

export async function countPending(local: LocalStore): Promise<number> {
  let n = 0
  for (const kind of TABLES) for (const rec of await local.getAll(kind)) if (rec.dirty) n++
  return n
}
