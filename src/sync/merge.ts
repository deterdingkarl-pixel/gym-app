import type { SyncMeta } from '../lib/types'

/**
 * Kernregel des Abgleichs – gilt pro Eintrag, nie für „alles auf einmal“:
 * Eine eingehende Version (aus der Cloud oder aus einem Backup) ersetzt die lokale
 * nur, wenn sie STRIKT neuer ist. Ältere oder gleich alte Versionen werden ignoriert.
 *
 * Gibt den zu speichernden Eintrag zurück oder `null`, wenn lokal alles bleibt.
 */
export function resolveIncoming<T extends SyncMeta>(local: T | undefined, incoming: T, markDirty = false): T | null {
  if (local && incoming.updatedAt <= local.updatedAt) return null
  return { ...incoming, dirty: markDirty }
}

/** Entfernt lokale Hilfsfelder, bevor ein Eintrag in die Cloud oder ins Backup geht. */
export function stripLocal<T extends SyncMeta>(record: T): T {
  const copy = { ...record }
  delete copy.dirty
  return copy
}
