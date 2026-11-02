// Server-Logik für den Garmin-Reiter. Läuft nur auf Vercel, nie im Browser.
// Der Garmin-Schlüssel bleibt hier; die App bekommt nur die Daten.
// Pfade laut Garmins offiziellem Client: github.com/garmin/connect-personal-api-python

const GARMIN_BASE = 'https://personal.connectapi.garmin.com'
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token'
const TOKEN_REFRESH_WINDOW_MS = 60 * 60 * 1000
const RESPONSE_CACHE_MS = 60 * 1000
const MAX_RANGE_DAYS = 31
const REQUEST_TIMEOUT_MS = 8000

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function garminPaths(start, end) {
  const range = `startDate=${start}&endDate=${end}`
  return {
    summaries: `/usersummary-service/v2/dailysummaries?${range}`,
    steps: `/usersummary-service/stats/steps/daily/${start}/${end}`,
    stress: `/usersummary-service/stats/stress/daily/${start}/${end}`,
    sleep: `/sleep-service/sleep/dailySleepSummariesByDate?${range}`,
    bodyBattery: `/wellness-service/wellness/bodyBattery/reports/daily?${range}`,
    heartRate: `/wellness-service/wellness/dailyHeartRate?date=${end}`,
    activities: '/activitylist-service/activities/search/activities?start=0&limit=10',
  }
}

function validRange(start, end) {
  if (!DATE_RE.test(start ?? '') || !DATE_RE.test(end ?? '')) return false
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000
  return days >= 0 && days <= MAX_RANGE_DAYS
}

function tokenExpiry(jwt, now) {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
    if (typeof payload.exp === 'number') return payload.exp * 1000
  } catch {
    // Kein lesbares Ablaufdatum: Garmin nennt 24 Stunden Gültigkeit
  }
  return now + 24 * 60 * 60 * 1000
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

const fail = (status, code) => json(status, { code })

/**
 * Baut den Handler. `env`, `fetchFn` und `now` sind austauschbar, damit die Tests ohne Netz laufen.
 * Token und Antwort-Zwischenspeicher leben nur im Arbeitsspeicher der laufenden Server-Instanz.
 */
export function createGarminHandler({ env, fetchFn = fetch, now = Date.now }) {
  let token = null
  let cached = null

  async function isAllowedUser(request) {
    const accessToken = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!accessToken) return false
    const res = await fetchFn(`${env.VITE_SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return false
    const user = await res.json()
    const email = String(user.email ?? '').toLowerCase()
    return Boolean(user.email_confirmed_at) && email === env.GARMIN_ALLOWED_EMAIL.trim().toLowerCase()
  }

  async function bearerToken() {
    if (token && token.expiresAt - now() > TOKEN_REFRESH_WINDOW_MS) return token.value
    const res = await fetchFn(`${GARMIN_BASE}${TOKEN_PATH}`, {
      method: 'POST',
      headers: { Accept: '*/*', Authorization: `ApiKey ${env.GARMIN_API_KEY.trim()}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) throw Object.assign(new Error('token'), { status: res.status })
    const value = (await res.text()).trim()
    token = { value, expiresAt: tokenExpiry(value, now()) }
    return value
  }

  async function loadSection(path, bearer) {
    const res = await fetchFn(`${GARMIN_BASE}${path}`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${bearer}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) throw Object.assign(new Error('section'), { status: res.status })
    const text = await res.text()
    return text ? JSON.parse(text) : null
  }

  return async function handle(request) {
    if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY || !env.GARMIN_ALLOWED_EMAIL) return fail(503, 'not-configured')
    if (!(await isAllowedUser(request))) return fail(403, 'forbidden')
    if (!env.GARMIN_API_KEY) return fail(503, 'no-key')

    const params = new URL(request.url).searchParams
    const start = params.get('start')
    const end = params.get('end')
    if (!validRange(start, end)) return fail(400, 'bad-range')

    const cacheKey = `${start}|${end}`
    if (cached && cached.key === cacheKey && now() - cached.at < RESPONSE_CACHE_MS) return json(200, cached.body)

    let bearer
    try {
      bearer = await bearerToken()
    } catch (e) {
      if (e.status === 401 || e.status === 403) return fail(502, 'key-invalid')
      if (e.status === 429) return fail(503, 'rate-limited')
      return fail(502, 'garmin-unreachable')
    }

    const entries = Object.entries(garminPaths(start, end))
    const settled = await Promise.allSettled(entries.map(([, path]) => loadSection(path, bearer)))
    const results = {}
    const errors = {}
    settled.forEach((outcome, i) => {
      const section = entries[i][0]
      if (outcome.status === 'fulfilled') results[section] = outcome.value
      else errors[section] = outcome.reason?.status ?? 0
    })

    const statuses = Object.values(errors)
    if (statuses.length === entries.length) {
      if (statuses.some((s) => s === 401 || s === 403)) {
        token = null
        return fail(502, 'key-invalid')
      }
      if (statuses.includes(429)) return fail(503, 'rate-limited')
      return fail(502, 'garmin-unreachable')
    }

    const body = { fetchedAt: now(), results, errors }
    cached = { key: cacheKey, at: now(), body }
    return json(200, body)
  }
}
