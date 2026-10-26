import { TABLES, type AnyRecord, type TableMap, type TableName } from '../lib/types'
import type { LocalStore } from './engine'
import { resolveIncoming, stripLocal } from './merge'

export interface BackupFile {
  app: 'gym-app'
  version: 1
  exportedAt: string
  data: { [K in TableName]: TableMap[K][] }
}

export async function createBackup(local: LocalStore, now = new Date()): Promise<BackupFile> {
  const data = {} as BackupFile['data']
  for (const kind of TABLES) {
    const all = await local.getAll(kind)
    ;(data as Record<TableName, AnyRecord[]>)[kind] = all.map(stripLocal)
  }
  return { app: 'gym-app', version: 1, exportedAt: now.toISOString(), data }
}

export function parseBackup(text: string): BackupFile {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.')
  }
  const b = parsed as Partial<BackupFile>
  if (!b || b.app !== 'gym-app' || b.version !== 1 || typeof b.data !== 'object' || !b.data)
    throw new Error('Das ist keine Gym-App-Sicherung.')
  for (const kind of TABLES) {
    const list = (b.data as Record<string, unknown>)[kind]
    if (list === undefined) continue
    if (!Array.isArray(list)) throw new Error(`Ungültige Daten in „${kind}“.`)
    for (const r of list) {
      const rec = r as Partial<AnyRecord>
      if (typeof rec?.id !== 'string' || typeof rec.updatedAt !== 'number' || typeof rec.deleted !== 'boolean')
        throw new Error(`Ungültiger Eintrag in „${kind}“.`)
    }
  }
  return b as BackupFile
}

/**
 * Import überschreibt nie neuere Daten: pro Eintrag gewinnt die neuere Version
 * (auch eine Lösch-Markierung aus dem Backup zählt nur, wenn sie neuer ist).
 * Übernommene Einträge werden als „noch nicht hochgeladen“ markiert, damit sie in die Cloud gehen.
 */
export async function importBackup(local: LocalStore, backup: BackupFile): Promise<number> {
  let count = 0
  for (const kind of TABLES) {
    const incoming = (backup.data[kind] ?? []) as AnyRecord[]
    const toWrite: AnyRecord[] = []
    for (const rec of incoming) {
      const resolved = resolveIncoming(await local.get(kind, rec.id), rec, true)
      if (resolved) toWrite.push(resolved)
    }
    if (toWrite.length) await local.putMany(kind, toWrite)
    count += toWrite.length
  }
  return count
}
