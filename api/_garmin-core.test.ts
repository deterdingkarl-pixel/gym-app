import { describe, expect, it, vi } from 'vitest'
// @ts-expect-error Reine JS-Datei für die Vercel-Funktion, ohne Typdeklaration
import { createGarminHandler } from './_garmin-core.js'

const KEY = 'geheimer-schluessel'
const env = {
  VITE_SUPABASE_URL: 'https://supa.test',
  VITE_SUPABASE_ANON_KEY: 'anon',
  GARMIN_ALLOWED_EMAIL: 'karl@example.com',
  GARMIN_API_KEY: KEY,
}
const URL_OK = 'https://app.test/api/garmin?start=2026-10-27&end=2026-11-02'
const request = (url = URL_OK, auth: string | null = 'Bearer login-token') =>
  new Request(url, { headers: auth ? { authorization: auth } : {} })

// JWT mit Ablaufdatum in `exp` (Sekunden)
const jwt = (exp: number) => `x.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.y`

function fakeNet(opts: { user?: object | null; tokenStatus?: number; sectionStatus?: (url: string) => number; tokenValue?: string } = {}) {
  const { user = { email: 'Karl@example.com', email_confirmed_at: '2026-01-01' }, tokenStatus = 200, sectionStatus = () => 200, tokenValue = jwt(9_999_999_999) } = opts
  return vi.fn(async (url: string) => {
    if (url.includes('/auth/v1/user')) return user ? Response.json(user) : new Response('', { status: 401 })
    if (url.includes('personal-api-key/token')) return new Response(tokenStatus === 200 ? tokenValue : 'nein', { status: tokenStatus })
    const status = sectionStatus(url)
    return status === 200 ? Response.json({ path: url }) : new Response('fehler', { status })
  })
}
const tokenCalls = (net: ReturnType<typeof fakeNet>) => net.mock.calls.filter(([u]) => u.includes('personal-api-key/token')).length

describe('Zugriffsschutz', () => {
  it('ohne Anmeldung: keine Daten, Garmin wird gar nicht gefragt', async () => {
    const net = fakeNet()
    const res = await createGarminHandler({ env, fetchFn: net })(request(URL_OK, null))
    expect(res.status).toBe(403)
    expect(tokenCalls(net)).toBe(0)
  })

  it('angemeldetes fremdes Konto: abgelehnt', async () => {
    const net = fakeNet({ user: { email: 'fremd@example.com', email_confirmed_at: '2026-01-01' } })
    const res = await createGarminHandler({ env, fetchFn: net })(request())
    expect(res.status).toBe(403)
    expect(tokenCalls(net)).toBe(0)
  })

  it('unbestätigte E-Mail: abgelehnt', async () => {
    const net = fakeNet({ user: { email: 'karl@example.com', email_confirmed_at: null } })
    expect((await createGarminHandler({ env, fetchFn: net })(request())).status).toBe(403)
  })

  it('ungültige Anmeldung: abgelehnt', async () => {
    const net = fakeNet({ user: null })
    expect((await createGarminHandler({ env, fetchFn: net })(request())).status).toBe(403)
  })

  it('ohne hinterlegte erlaubte E-Mail bleibt alles zu', async () => {
    const net = fakeNet()
    const res = await createGarminHandler({ env: { ...env, GARMIN_ALLOWED_EMAIL: '' }, fetchFn: net })(request())
    expect(res.status).toBe(503)
    expect(net).not.toHaveBeenCalled()
  })

  it('der Schlüssel taucht nie in einer Antwort auf', async () => {
    const ok = await createGarminHandler({ env, fetchFn: fakeNet() })(request())
    expect(await ok.text()).not.toContain(KEY)
    const bad = await createGarminHandler({ env, fetchFn: fakeNet({ tokenStatus: 401 }) })(request())
    expect(await bad.text()).not.toContain(KEY)
  })
})

describe('Garmin-Abruf', () => {
  it('holt alle Bereiche und schickt den Schlüssel nur an den Token-Endpunkt', async () => {
    const net = fakeNet()
    const res = await createGarminHandler({ env, fetchFn: net })(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(Object.keys(body.results).sort()).toEqual(['activities', 'bodyBattery', 'heartRate', 'sleep', 'steps', 'stress', 'summaries'])
    expect(body.results.steps.path).toContain('/stats/steps/daily/2026-10-27/2026-11-02')
    const withKey = net.mock.calls.filter(([, init]: unknown[]) => JSON.stringify(init ?? {}).includes(KEY))
    expect(withKey).toHaveLength(1)
    expect(withKey[0][0]).toContain('personal-api-key/token')
  })

  it('fehlender Schlüssel wird klar gemeldet', async () => {
    const res = await createGarminHandler({ env: { ...env, GARMIN_API_KEY: '' }, fetchFn: fakeNet() })(request())
    expect(await res.json()).toEqual({ code: 'no-key' })
  })

  it('ungültiger oder abgelaufener Schlüssel wird klar gemeldet', async () => {
    const res = await createGarminHandler({ env, fetchFn: fakeNet({ tokenStatus: 401 }) })(request())
    expect(await res.json()).toEqual({ code: 'key-invalid' })
  })

  it('Garmin bremst: wird klar gemeldet', async () => {
    const res = await createGarminHandler({ env, fetchFn: fakeNet({ sectionStatus: () => 429 }) })(request())
    expect(await res.json()).toEqual({ code: 'rate-limited' })
  })

  it('ein fehlender Bereich verhindert die übrigen nicht', async () => {
    const net = fakeNet({ sectionStatus: (u) => (u.includes('sleep-service') ? 404 : 200) })
    const body = await (await createGarminHandler({ env, fetchFn: net })(request())).json()
    expect(body.errors).toEqual({ sleep: 404 })
    expect(body.results.steps).toBeDefined()
    expect(body.results.sleep).toBeUndefined()
  })

  it('lehnt ungültige Zeiträume ab', async () => {
    const handle = createGarminHandler({ env, fetchFn: fakeNet() })
    expect((await handle(request('https://app.test/api/garmin?start=abc&end=2026-11-02'))).status).toBe(400)
    expect((await handle(request('https://app.test/api/garmin?start=2020-01-01&end=2026-11-02'))).status).toBe(400)
    expect((await handle(request('https://app.test/api/garmin?start=2026-11-03&end=2026-11-02'))).status).toBe(400)
  })

  it('nutzt das Garmin-Token wieder und holt es erst kurz vor Ablauf neu', async () => {
    let time = 1_000_000_000_000
    const net = fakeNet({ tokenValue: jwt(time / 1000 + 24 * 3600) })
    const handle = createGarminHandler({ env, fetchFn: net, now: () => time })
    await handle(request())
    time += 2 * 3600_000
    await handle(request())
    expect(tokenCalls(net)).toBe(1)
    time += 22 * 3600_000
    await handle(request())
    expect(tokenCalls(net)).toBe(2)
  })

  it('fragt Garmin innerhalb einer Minute nicht doppelt', async () => {
    let time = 1_000_000_000_000
    const net = fakeNet()
    const handle = createGarminHandler({ env, fetchFn: net, now: () => time })
    await handle(request())
    const calls = net.mock.calls.length
    time += 30_000
    await handle(request())
    expect(net.mock.calls.length).toBe(calls + 1) // nur die Login-Prüfung
    time += 60_000
    await handle(request())
    expect(net.mock.calls.length).toBeGreaterThan(calls + 2)
  })
})
