import { describe, expect, it } from 'vitest'
import type { AnyRecord, BodyWeight, TableName } from '../lib/types'
import { createBackup, importBackup, parseBackup } from './backup'
import { CURSOR_KEY, syncOnce, type LocalStore, type Remote, type RemoteRow } from './engine'
import { resolveIncoming } from './merge'

class MemoryLocal implements LocalStore {
  tables = new Map<TableName, Map<string, AnyRecord>>()
  meta = new Map<string, unknown>()
  async get(kind: TableName, id: string) {
    return this.tables.get(kind)?.get(id)
  }
  async getAll(kind: TableName) {
    return [...(this.tables.get(kind)?.values() ?? [])]
  }
  async putMany(kind: TableName, records: AnyRecord[]) {
    const t = this.tables.get(kind) ?? new Map()
    for (const r of records) t.set(r.id, r)
    this.tables.set(kind, t)
  }
  async getMeta<T>(key: string) {
    return this.meta.get(key) as T | undefined
  }
  async setMeta(key: string, value: unknown) {
    this.meta.set(key, value)
  }
}

/** Fake-Cloud mit derselben Schutzregel wie der Datenbank-Trigger (ältere Version wird abgewiesen). */
class MemoryRemote implements Remote {
  rows = new Map<string, RemoteRow>()
  clock = 0
  failPull = false
  onPush?: () => Promise<void>
  async pull(since: string | null) {
    if (this.failPull) throw new Error('Netzwerkfehler')
    return [...this.rows.values()].filter((r) => !since || r.server_updated_at! > since)
  }
  async push(rows: RemoteRow[]) {
    await this.onPush?.()
    for (const r of rows) this.store(r)
  }
  store(r: RemoteRow) {
    const key = `${r.kind}:${r.id}`
    const existing = this.rows.get(key)
    if (existing && r.updated_at < existing.updated_at) return
    this.clock++
    this.rows.set(key, { ...r, server_updated_at: new Date(Date.UTC(2026, 0, 1, 0, 0, this.clock)).toISOString() })
  }
}

const bw = (id: string, weight: number, updatedAt: number, extra: Partial<BodyWeight> = {}): BodyWeight => ({
  id,
  date: '2026-10-26',
  weight,
  updatedAt,
  deleted: false,
  ...extra,
})
const row = (r: BodyWeight): RemoteRow => ({ kind: 'bodyweights', id: r.id, data: r, updated_at: r.updatedAt, deleted: r.deleted })

describe('resolveIncoming', () => {
  it('neuere Version gewinnt', () => {
    expect(resolveIncoming(bw('a', 80, 1), bw('a', 81, 2))?.weight).toBe(81)
  })
  it('ältere oder gleich alte Version ändert nichts', () => {
    expect(resolveIncoming(bw('a', 80, 5), bw('a', 81, 2))).toBeNull()
    expect(resolveIncoming(bw('a', 80, 5), bw('a', 81, 5))).toBeNull()
  })
  it('unbekannter Eintrag wird übernommen', () => {
    expect(resolveIncoming(undefined, bw('a', 80, 1))).toMatchObject({ weight: 80, dirty: false })
  })
})

describe('syncOnce', () => {
  it('ALTE CLOUD-DATEN ÜBERSCHREIBEN NIE NEUERE LOKALE (der Fehler der alten Version)', async () => {
    const local = new MemoryLocal()
    const remote = new MemoryRemote()
    remote.store(row(bw('a', 80, 100)))
    await local.putMany('bodyweights', [bw('a', 82, 200, { dirty: true })])

    await syncOnce(local, remote)

    expect((await local.get('bodyweights', 'a')) as BodyWeight).toMatchObject({ weight: 82, dirty: false })
    expect(remote.rows.get('bodyweights:a')!.updated_at).toBe(200)
  })

  it('auch ein nicht markierter, neuerer lokaler Stand bleibt erhalten', async () => {
    const local = new MemoryLocal()
    const remote = new MemoryRemote()
    remote.store(row(bw('a', 80, 100)))
    await local.putMany('bodyweights', [bw('a', 82, 200)])
    await syncOnce(local, remote)
    expect(((await local.get('bodyweights', 'a')) as BodyWeight).weight).toBe(82)
  })

  it('neuere Cloud-Daten (vom anderen Gerät) kommen an', async () => {
    const local = new MemoryLocal()
    const remote = new MemoryRemote()
    await local.putMany('bodyweights', [bw('a', 80, 100)])
    remote.store(row(bw('a', 79, 300)))
    remote.store(row(bw('b', 78, 300)))
    const res = await syncOnce(local, remote)
    expect(((await local.get('bodyweights', 'a')) as BodyWeight).weight).toBe(79)
    expect(await local.get('bodyweights', 'b')).toBeDefined()
    expect(res.changedKinds.has('bodyweights')).toBe(true)
  })

  it('Ladefehler: lokal bleibt alles unverändert, nichts wird als hochgeladen markiert', async () => {
    const local = new MemoryLocal()
    const remote = new MemoryRemote()
    remote.failPull = true
    await local.putMany('bodyweights', [bw('a', 82, 200, { dirty: true })])
    await expect(syncOnce(local, remote)).rejects.toThrow()
    expect(await local.get('bodyweights', 'a')).toMatchObject({ weight: 82, dirty: true })
    expect(remote.rows.size).toBe(0)
  })

  it('Änderung während des Hochladens bleibt als „noch nicht hochgeladen“ markiert', async () => {
    const local = new MemoryLocal()
    const remote = new MemoryRemote()
    await local.putMany('bodyweights', [bw('a', 82, 200, { dirty: true })])
    remote.onPush = async () => {
      // Karl tippt weiter, während der Upload läuft
      await local.putMany('bodyweights', [bw('a', 83, 250, { dirty: true })])
    }
    await syncOnce(local, remote)
    expect(await local.get('bodyweights', 'a')).toMatchObject({ weight: 83, dirty: true })

    remote.onPush = undefined
    await syncOnce(local, remote)
    expect(await local.get('bodyweights', 'a')).toMatchObject({ weight: 83, dirty: false })
    expect(remote.rows.get('bodyweights:a')!.updated_at).toBe(250)
  })

  it('Löschungen werden als Markierung übertragen und kommen nicht zurück', async () => {
    const phone = new MemoryLocal()
    const pc = new MemoryLocal()
    const remote = new MemoryRemote()
    await phone.putMany('bodyweights', [bw('a', 80, 100, { dirty: true })])
    await syncOnce(phone, remote)
    await syncOnce(pc, remote)
    await phone.putMany('bodyweights', [bw('a', 80, 200, { deleted: true, dirty: true })])
    await syncOnce(phone, remote)
    await syncOnce(pc, remote)
    expect(await pc.get('bodyweights', 'a')).toMatchObject({ deleted: true })
  })

  it('zwei Geräte bearbeiten verschiedene Einträge → beide Änderungen bleiben', async () => {
    const phone = new MemoryLocal()
    const pc = new MemoryLocal()
    const remote = new MemoryRemote()
    await phone.putMany('bodyweights', [bw('p', 80, 100, { dirty: true })])
    await pc.putMany('bodyweights', [bw('c', 81, 110, { dirty: true })])
    await syncOnce(phone, remote)
    await syncOnce(pc, remote)
    await syncOnce(phone, remote)
    expect((await phone.getAll('bodyweights')).map((r) => r.id).sort()).toEqual(['c', 'p'])
    expect((await pc.getAll('bodyweights')).map((r) => r.id).sort()).toEqual(['c', 'p'])
  })

  it('Startplan (updatedAt 0) auf neuem Gerät überschreibt nie den bearbeiteten Plan in der Cloud', async () => {
    const local = new MemoryLocal()
    const remote = new MemoryRemote()
    const seed = { id: 'plan-beine', category: 'beine', name: 'Beine', exercises: [], updatedAt: 0, deleted: false } as AnyRecord
    const edited = { ...seed, name: 'Beine (bearbeitet)', updatedAt: 500 } as AnyRecord
    remote.store({ kind: 'plans', id: 'plan-beine', data: edited, updated_at: 500, deleted: false })
    await local.putMany('plans', [seed])
    await syncOnce(local, remote)
    expect(await local.get('plans', 'plan-beine')).toMatchObject({ name: 'Beine (bearbeitet)' })
    expect(remote.rows.get('plans:plan-beine')!.updated_at).toBe(500)
  })

  it('merkt sich den Stand und holt danach nur Neues (mit Überlappung)', async () => {
    const local = new MemoryLocal()
    const remote = new MemoryRemote()
    remote.store(row(bw('a', 80, 100)))
    await syncOnce(local, remote)
    expect(local.meta.get(CURSOR_KEY)).toBeDefined()
    const res = await syncOnce(local, remote)
    expect(res.applied).toBe(0)
  })
})

describe('Backup', () => {
  it('Export → Import auf leerem Gerät stellt alles wieder her und markiert es zum Hochladen', async () => {
    const a = new MemoryLocal()
    await a.putMany('bodyweights', [bw('a', 80, 100)])
    const file = JSON.stringify(await createBackup(a))
    expect(file).not.toContain('dirty')

    const b = new MemoryLocal()
    expect(await importBackup(b, parseBackup(file))).toBe(1)
    expect(await b.get('bodyweights', 'a')).toMatchObject({ weight: 80, dirty: true })
  })

  it('Import überschreibt keine neueren Daten', async () => {
    const a = new MemoryLocal()
    await a.putMany('bodyweights', [bw('a', 80, 100)])
    const backup = await createBackup(a)
    await a.putMany('bodyweights', [bw('a', 85, 200)])
    expect(await importBackup(a, backup)).toBe(0)
    expect(((await a.get('bodyweights', 'a')) as BodyWeight).weight).toBe(85)
  })

  it('lehnt fremde Dateien ab', () => {
    expect(() => parseBackup('{"foo":1}')).toThrow()
    expect(() => parseBackup('kein json')).toThrow()
  })
})
