/**
 * Öffentliche Gliddencup-Seiten: Tippspiel (draftfinder, /api/gliddencup)
 * und öffentliche Turnierdaten (hidden-communicator, /api/hc/public).
 *
 * Beides liegt unter derselben Origin; das Tippspiel meldet per httpOnly-Cookie
 * an. Schreibende Anfragen brauchen den Header X-GC — zusammen mit SameSite
 * der CSRF-Schutz des Tippspiels.
 */
import axios from 'axios'
import { onMounted, onUnmounted, ref } from 'vue'

export const gcApi = axios.create({ baseURL: '/api/gliddencup' })

gcApi.interceptors.request.use(config => {
  if (config.method !== 'get') config.headers['X-GC'] = '1'
  return config
})

export const LOGIN_URL = '/api/gliddencup/auth/login'

/**
 * Lädt die öffentliche Projektion eines Turniers; ohne Slug das aktive.
 * Wirft wie axios; 404 heißt „noch nicht ausgelost“ bzw. „unbekannt“.
 */
export async function loadPublicTournament (slug) {
  const path = slug ? `/api/hc/public/${encodeURIComponent(slug)}` : '/api/hc/public'
  return normalizeTournament((await axios.get(path)).data)
}

/**
 * Füllt fehlende Felder mit leeren Werten, damit die Seiten auch mit einem
 * älteren oder halbfertigen Backend nicht an `undefined` scheitern.
 */
export function normalizeTournament (raw) {
  const t = raw ?? {}
  return {
    ...t,
    tipsOpen: t.tipsOpen === true,
    identitiesPublic: t.identitiesPublic === true,
    pseudonyms: Array.isArray(t.pseudonyms) ? t.pseudonyms : [],
    participants: Array.isArray(t.participants) ? t.participants : [],
    identities: Array.isArray(t.identities) ? t.identities : [],
    rounds: (Array.isArray(t.rounds) ? t.rounds : []).map(r => ({
      ...r,
      matches: Array.isArray(r.matches) ? r.matches : [],
    })),
  }
}

/**
 * Ruft `fn` sofort und dann alle `ms` Millisekunden auf, aber nur bei
 * sichtbarem Tab: Hintergrund-Tabs sollen hc-web nicht belasten. Wird der Tab
 * wieder sichtbar, gibt es sofort frische Daten statt bis zu 10 s alter.
 * Endet mit der Komponente.
 */
export function usePolling (fn, ms = 10_000) {
  let timer = null
  const tick = () => { if (document.visibilityState === 'visible') fn() }
  const onVisible = () => { if (document.visibilityState === 'visible') fn() }

  onMounted(() => {
    fn()
    timer = setInterval(tick, ms)
    document.addEventListener('visibilitychange', onVisible)
  })
  onUnmounted(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  })
}

/**
 * Öffentliche Turnierdaten mit Abfrage alle 10 s. Ein Fehler nach dem ersten
 * erfolgreichen Laden lässt die alten Daten stehen; `error` sagt dann nur,
 * dass die Anzeige veraltet sein kann.
 */
export function usePublicTournament (slug) {
  const tournament = ref(null)
  const error = ref('')
  const notFound = ref(false)
  const loaded = ref(false)

  usePolling(async () => {
    try {
      tournament.value = await loadPublicTournament(slug)
      error.value = ''
      notFound.value = false
    } catch (e) {
      notFound.value = e.response?.status === 404
      if (notFound.value) tournament.value = null
      error.value = notFound.value ? '' : 'Die Turnierdaten sind gerade nicht erreichbar.'
    } finally {
      loaded.value = true
    }
  })

  return { tournament, error, notFound, loaded }
}

/** Die Wahrheit Pseudonym → Klarname, sobald die Zuordnung veröffentlicht ist. */
export function truthMap (tournament) {
  return new Map((tournament?.identities ?? []).map(i => [i.pseudonym, i.name]))
}

/**
 * Runden der Projektion im Format von BracketTree, je Bracket-Seite gruppiert.
 * Das Ergebnis steckt BracketTree in `match`; die übrigen Felder der
 * Projektion reisen am Slot mit, damit der `side`-Slot sie lesen kann.
 */
export function bracketSides (tournament) {
  const TITLES = { MAIN: 'Turnierbaum', WINNERS: 'Winner Bracket', LOSERS: 'Loser Bracket', GRAND_FINAL: 'Grand Final' }
  const sides = new Map()
  ;(tournament?.rounds ?? []).forEach((round, index) => {
    const bracket = round.bracket ?? 'MAIN'
    if (!sides.has(bracket)) sides.set(bracket, { bracket, title: TITLES[bracket] ?? bracket, rounds: [] })
    sides.get(bracket).rounds.push({
      key: `${bracket}-${index}`,
      label: round.label,
      slots: round.matches.map(m => ({
        ...m,
        code: m.slotCode,
        match: m.score || m.winner ? { score: m.score, winner: m.winner } : null,
      })),
    })
  })
  return [...sides.values()]
}
