import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Remote, RemoteRow } from './engine'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null, wenn keine Zugangsdaten hinterlegt sind → App läuft nur im Gastmodus. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

const PAGE = 500

export function supabaseRemote(client: SupabaseClient): Remote {
  return {
    async pull(since) {
      const out: RemoteRow[] = []
      let after = since
      for (;;) {
        let q = client
          .from('records')
          .select('kind,id,data,updated_at,deleted,server_updated_at')
          .order('server_updated_at', { ascending: true })
          .limit(PAGE)
        if (after) q = q.gt('server_updated_at', after)
        const { data, error } = await q
        if (error) throw new Error(error.message)
        const rows = (data ?? []) as RemoteRow[]
        out.push(...rows)
        if (rows.length < PAGE) return out
        after = rows[rows.length - 1].server_updated_at!
      }
    },
    async push(rows) {
      const { error } = await client.from('records').upsert(
        rows.map((r) => ({ kind: r.kind, id: r.id, data: r.data, updated_at: r.updated_at, deleted: r.deleted })),
        { onConflict: 'user_id,kind,id' },
      )
      if (error) throw new Error(error.message)
    },
  }
}
