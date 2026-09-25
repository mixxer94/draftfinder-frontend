/**
 * API-Client für den Hidden Cup (hidden-communicator, eigener Dienst).
 *
 * Apache leitet /api/hc/* an hc-web weiter; alles liegt unter derselben
 * Origin, das Session-Cookie reist ohne CORS mit. Schreibende Anfragen
 * brauchen das CSRF-Token aus GET /me im Header X-HC-CSRF.
 */
import axios from 'axios'
import { reactive } from 'vue'

export const hcApi = axios.create({ baseURL: '/api/hc' })

/** Angemeldete Person; `loaded` erst nach dem ersten /me. */
export const hcSession = reactive({
  loaded: false,
  user: null, // { username, roles, csrf, storageWarning }
})

export const isAdmin = () => hcSession.user?.roles?.includes('ADMIN') ?? false

let pending = null

/** Fragt /me einmal ab; weitere Aufrufe warten auf dieselbe Anfrage. */
export function loadSession (force = false) {
  if (hcSession.loaded && !force) return Promise.resolve(hcSession.user)
  pending ??= hcApi
    .get('/me')
    .then(res => { hcSession.user = res.data })
    .catch(e => {
      if (e.response?.status !== 401) throw e
      hcSession.user = null
    })
    .finally(() => {
      hcSession.loaded = true
      pending = null
    })
  return pending.then(() => hcSession.user)
}

export function login () {
  window.location.assign('/api/hc/auth/login')
}

export async function logout () {
  await hcApi.post('/auth/logout').catch(() => {})
  hcSession.user = null
}

hcApi.interceptors.request.use(config => {
  if (config.method !== 'get' && hcSession.user?.csrf) {
    config.headers['X-HC-CSRF'] = hcSession.user.csrf
  }
  return config
})

// Abgelaufene Session: zurück auf den Anmeldebildschirm der Admin-Seiten.
hcApi.interceptors.response.use(undefined, error => {
  if (error.response?.status === 401 && error.config?.url !== '/me') {
    hcSession.user = null
  }
  return Promise.reject(error)
})

/** Die Meldung der API, sonst ein allgemeiner Text. */
export function errorMessage (e) {
  return e?.response?.data?.message ?? e?.message ?? 'Unbekannter Fehler'
}

/** Zeitpunkt in der Zeitzone des Turniers. */
export function formatDate (iso, timeZone, withWeekday = false) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('de-DE', {
    timeZone,
    ...(withWeekday ? { weekday: 'short' } : {}),
    day: '2-digit',
    month: '2-digit',
    year: withWeekday ? undefined : '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/** Seiten, die auch Helfer sehen; alles andere unter /gliddencup/admin ist Admin. */
export const HC_NAV = [
  { to: '/gliddencup/admin', title: 'Übersicht', icon: 'mdi-view-dashboard', helper: true },
  { to: '/gliddencup/admin/registrations', title: 'Anmeldungen', icon: 'mdi-account-multiple' },
  { to: '/gliddencup/admin/rounds', title: 'Runden', icon: 'mdi-format-list-numbered' },
  { to: '/gliddencup/admin/draw', title: 'Auslosung', icon: 'mdi-dice-multiple' },
  { to: '/gliddencup/admin/activation', title: 'Aktivierung', icon: 'mdi-play-circle' },
  { to: '/gliddencup/admin/bracket', title: 'Bracket', icon: 'mdi-tournament', helper: true },
  { to: '/gliddencup/admin/schedule', title: 'Termine', icon: 'mdi-calendar', helper: true },
  { to: '/gliddencup/admin/replays', title: 'Replays', icon: 'mdi-folder-zip' },
  { to: '/gliddencup/admin/audit', title: 'Audit-Log', icon: 'mdi-shield-search' },
]

export function helperMayOpen (path) {
  const clean = path.replace(/\/+$/, '') || '/'
  return HC_NAV.some(n => n.helper && n.to === clean)
}
