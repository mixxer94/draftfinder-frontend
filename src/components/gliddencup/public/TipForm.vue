<template>
  <div>
    <v-alert
      v-if="loginFailed"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      text="Die Anmeldung über Discord hat nicht geklappt. Versuch es bitte noch einmal."
      @click:close="loginFailed = false"
    />

    <div v-if="account === 'loading'" class="py-2 mb-4"><v-progress-linear indeterminate color="secondary" /></div>
    <v-alert v-else-if="account === 'down'" type="warning" variant="tonal" class="mb-4">
      Das Tippspiel ist gerade nicht erreichbar. Lade die Seite in ein paar Minuten neu.
    </v-alert>

    <!-- Turnierstand -->
    <v-alert v-if="!tournament && notFound" type="info" variant="tonal" class="mb-4">
      Das Turnier ist noch nicht ausgelost. Sobald die Pseudonyme feststehen, kannst du hier tippen.
    </v-alert>
    <v-alert v-else-if="!tournament && hcError" type="warning" variant="tonal" class="mb-4">
      Die Turnierdaten sind gerade nicht erreichbar. Die Seite versucht es alle paar Sekunden erneut.
    </v-alert>
    <div v-else-if="!tournament" class="d-flex justify-center pa-8"><v-progress-circular indeterminate /></div>

    <template v-else>
      <div class="d-flex align-center flex-wrap ga-3 mb-2">
        <h2 class="hc-h2 mb-0">Zusatzfragen</h2>
        <span class="text-body-2 text-medium-emphasis gc-num">{{ answered }}/{{ questions.length + 1 }}</span>
        <v-spacer />
        <v-btn v-if="account === 'anon'" color="secondary" variant="flat" :href="LOGIN_URL" prepend-icon="mdi-login">
          Mit Discord anmelden
        </v-btn>
        <v-menu v-else-if="account === 'in'">
          <template #activator="{ props: menu }">
            <v-chip v-bind="menu" prepend-icon="mdi-account-circle-outline" append-icon="mdi-menu-down" variant="tonal" label>
              {{ me.displayName }}
            </v-chip>
          </template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-pencil" title="Name ändern" @click="openNameDialog" />
            <v-list-item prepend-icon="mdi-logout" title="Abmelden" :disabled="loggingOut" @click="logout" />
          </v-list>
        </v-menu>
      </div>

      <!-- Je Zeile: Frage, Tippschluss, Feld. Die Erklärungen stehen im Tooltip am Tippschluss. -->
      <div>
        <div v-for="q in questions" :key="q.id" class="gc-row">
          <span>{{ q.text }}</span>
          <span class="gc-meta text-medium-emphasis" tabindex="0">
            <v-icon :icon="q.open ? 'mdi-clock-outline' : 'mdi-lock'" size="16" />
            <span class="gc-until">{{ q.open ? closesShort(q) : 'geschlossen' }}</span>
            <v-tooltip activator="parent" location="top" open-on-click open-on-focus max-width="280">
              {{ q.open ? closesText(q) : 'Geschlossen. Es zählt deine letzte Antwort.' }}
              <template v-if="q.type === 'NUMBER'"> Schätzfrage: Es gewinnt, wer am nächsten liegt.</template>
            </v-tooltip>
          </span>
          <div v-if="!q.open" class="gc-closed text-medium-emphasis">{{ answerShown(q) }}</div>
          <v-text-field
            v-else-if="q.type === 'NUMBER'"
            v-model="answers[q.id]"
            type="number"
            inputmode="numeric"
            min="0"
            step="1"
            :suffix="q.unit"
            :aria-label="q.text"
            :disabled="account !== 'in'"
            :error="!validNumber(answers[q.id])"
            persistent-placeholder
            placeholder="Nicht getippt"
            density="compact"
            hide-details
            @blur="flush"
          />
          <v-autocomplete
            v-else
            v-model="answers[q.id]"
            :items="q.options"
            :aria-label="q.text"
            :disabled="account !== 'in'"
            persistent-placeholder
            placeholder="Nicht getippt"
            clearable
            density="compact"
            hide-details
            auto-select-first
          />
        </div>

        <!-- Schließt mit den Pseudonym-Tipps; die Antwort liegt im selben Datensatz. -->
        <div class="gc-row">
          <span>Wer ist Guy Glidden?</span>
          <span class="gc-meta text-medium-emphasis" tabindex="0">
            <v-icon :icon="tournament.tipsOpen ? 'mdi-clock-outline' : 'mdi-lock'" size="16" />
            <span class="gc-until">{{ tournament.tipsOpen ? 'mit den Pseudonymen' : 'geschlossen' }}</span>
            <v-tooltip activator="parent" location="top" open-on-click open-on-focus max-width="280">
              In dieser Ausgabe ist ein Spieler angetreten, dessen Identität weder Zuschauer noch Spieler kennen.
              {{ tournament.tipsOpen ? 'Offen, solange die Pseudonym-Tipps offen sind.' : 'Geschlossen. Es zählt deine letzte Antwort.' }}
            </v-tooltip>
          </span>
          <div v-if="!tournament.tipsOpen" class="gc-closed text-medium-emphasis">{{ clean(mystery) || 'nicht getippt' }}</div>
          <v-text-field
            v-else
            v-model="mystery"
            aria-label="Wer ist Guy Glidden?"
            :disabled="!editable"
            :maxlength="MYSTERY_MAX_LENGTH"
            persistent-placeholder
            placeholder="Nicht getippt"
            clearable
            density="compact"
            hide-details
            @blur="flush"
          />
        </div>
      </div>

      <!-- Geschlossene Pseudonym-Tipps bleiben eingeklappt: Dort gibt es nichts mehr zu tun. -->
      <button
        type="button"
        class="gc-section d-flex align-center ga-3 w-100 py-3 mt-6 text-left"
        :aria-expanded="showPicks"
        @click="picksToggled = !showPicks"
      >
        <h2 class="hc-h2 mb-0">Pseudonyme</h2>
        <span class="text-body-2 text-medium-emphasis gc-num">{{ filled }}/{{ pseudonyms.length }}</span>
        <span v-if="!tournament.tipsOpen" class="gc-meta gc-meta--inline text-medium-emphasis">
          <v-icon icon="mdi-lock" size="16" /> geschlossen
        </span>
        <v-spacer />
        <v-icon :icon="showPicks ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
      </button>

      <div v-if="showPicks" class="pb-4">
        <v-row dense>
          <v-col v-for="ps in pseudonyms" :key="ps" cols="12" sm="6" md="4" lg="3">
            <v-autocomplete
              v-model="picks[ps]"
              v-model:search="searches[ps]"
              :label="ps"
              :items="participants"
              :disabled="!editable"
              :base-color="pickState(ps) || undefined"
              persistent-placeholder
              placeholder="Tippen"
              :class="['gc-pick', pickState(ps) && `gc-pick--${pickState(ps)}`]"
              clearable
              density="comfortable"
              hide-details
              auto-select-first
              @blur="autoFill(ps)"
            />
          </v-col>
        </v-row>

        <div class="d-flex flex-wrap ga-4 mt-3 text-body-2 text-medium-emphasis">
          <span v-for="l in legend" :key="l.state" class="d-flex align-center ga-2">
            <span :class="['gc-swatch', `gc-pick--${l.state}`]" />{{ l.text }}
          </span>
        </div>

        <v-alert v-if="duplicates.length" type="info" variant="tonal" density="compact" class="mt-4">
          Deine Tipps wurden gespeichert.<br>
          Hinweis: Du hast einen oder mehrere Spieler mehrfach eingetragen:
          <ul class="gc-list mt-1">
            <li v-for="d in duplicates" :key="d.name">
              <strong>{{ d.name }}</strong> bei {{ d.pseudonyms.join(', ') }}
            </li>
          </ul>
        </v-alert>
      </div>

      <div v-if="account === 'in' && canSave" class="gc-savebar d-flex align-center justify-end flex-wrap ga-3 mt-2 py-3">
        <v-alert v-if="saveError" type="error" variant="tonal" density="compact" class="flex-grow-1">
          {{ saveError }}
          <template #append>
            <v-btn v-if="anyDirty && !saving" variant="text" size="small" @click="flush">Erneut versuchen</v-btn>
          </template>
        </v-alert>
        <span v-else-if="!answersValid" class="text-body-2 text-error">Schätzungen brauchen eine ganze Zahl ab 0, sonst werden sie nicht gespeichert.</span>
        <span v-else-if="saving || anyDirty" class="text-body-2 text-medium-emphasis">Speichert …</span>
        <span v-else-if="savedAt" class="text-body-2 text-medium-emphasis">
          <v-icon icon="mdi-check" size="small" color="success" /> Gespeichert um {{ savedAt }}
        </span>
        <span v-else class="text-body-2 text-medium-emphasis">Jede Eingabe wird automatisch gespeichert.</span>
      </div>
    </template>

    <!-- Anzeigename -->
    <v-dialog v-model="nameDialog.open" max-width="440">
      <v-card class="gc-dialog pa-2">
        <v-card-title class="text-h6 text-wrap">{{ me?.needsName ? 'Wie sollen wir dich nennen?' : 'Name ändern' }}</v-card-title>
        <v-card-text>
          <p class="mb-4">Unter diesem Namen erscheinen deine Tipps, sobald die Zuordnung veröffentlicht ist.</p>
          <v-text-field
            v-model="nameDialog.value"
            label="Anzeigename"
            counter="24"
            :error-messages="nameDialog.error"
            autofocus
            @keyup.enter="saveName"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="nameDialog.open = false">{{ me?.needsName ? 'Später' : 'Abbrechen' }}</v-btn>
          <v-btn color="secondary" variant="flat" :loading="nameDialog.saving" @click="saveName">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gcApi, LOGIN_URL, truthMap } from '@/services/gliddencupApi'
import { bestMatch, byCloseOrder, duplicateNames } from '@/services/gliddencupStats'

/** Tippen: Discord-Anmeldung, Zusatzfragen, „Wer ist Guy Glidden?“ und ein Feld je Pseudonym. */
const props = defineProps({
  tournament: { type: Object, default: null },
  notFound: { type: Boolean, default: false },
  hcError: { type: String, default: '' },
})

const route = useRoute()
const loginFailed = ref(route.query.login === 'failed')

const me = ref(null)
// loading | anon | in | down
const account = ref('loading')
const loggingOut = ref(false)

const pseudonyms = computed(() => props.tournament?.pseudonyms ?? [])
const participants = computed(() => props.tournament?.participants ?? [])
const editable = computed(() => account.value === 'in' && !!props.tournament?.tipsOpen)

// Tipps als Pseudonym → Name. Die Abfrage alle 10 s ersetzt nur die
// Pseudonymliste, nie diese Eingaben.
const picks = reactive({})
const searches = reactive({})
const saved = ref({})
const saving = ref(false)
const saveError = ref('')
const savedAt = ref('')

const MYSTERY_MAX_LENGTH = 60
const mystery = ref('')
const savedMystery = ref('')

const clean = s => (s ?? '').trim()
const current = () => Object.fromEntries(pseudonyms.value.map(ps => [ps, clean(picks[ps])]))
const dirty = computed(() => clean(mystery.value) !== savedMystery.value ||
  pseudonyms.value.some(ps => clean(picks[ps]) !== (saved.value[ps] ?? '')))
const filled = computed(() => pseudonyms.value.filter(ps => clean(picks[ps])).length)
const duplicates = computed(() => duplicateNames(current()))
const duplicatePseudonyms = computed(() => new Set(duplicates.value.flatMap(d => d.pseudonyms)))

// Nach der Auflösung zählt nur noch richtig oder falsch, vorher getippt oder doppelt.
const truth = computed(() => truthMap(props.tournament))
function pickState (ps) {
  const pick = clean(picks[ps])
  if (!pick) return null
  const solution = truth.value.get(ps)
  if (solution) return pick === solution ? 'success' : 'error'
  return duplicatePseudonyms.value.has(ps) ? 'warning' : 'secondary'
}
const legend = computed(() => truth.value.size
  ? [{ state: 'success', text: 'richtig' }, { state: 'error', text: 'falsch' }]
  : [{ state: 'secondary', text: 'getippt' }, { state: 'warning', text: 'doppelt eingetragen' }])

// Aufgeklappt, solange getippt werden kann; ein Klick auf die Überschrift hat Vorrang.
const picksToggled = ref(null)
const showPicks = computed(() => picksToggled.value ?? !!props.tournament?.tipsOpen)

// Zusatzfragen: Antworten als Frage-ID → Wert. Sie haben einen eigenen
// Endpunkt, weil jede Frage ihren eigenen Tippschluss hat.
// Was am längsten offen bleibt, steht oben; Geschlossenes rutscht ans Ende.
const questions = computed(() => {
  const sorted = byCloseOrder(props.tournament?.questions ?? [], props.tournament?.rounds ?? [])
  return [...sorted.filter(q => q.open), ...sorted.filter(q => !q.open)]
})
const answers = reactive({})
const savedAnswers = ref({})

// Zahlenfelder liefern Text; leer heißt „nicht getippt“
const answerValue = q => {
  const raw = answers[q.id]
  if (raw == null || raw === '') return null
  return q.type === 'NUMBER' ? Number(raw) : raw
}
const answerShown = q => {
  const value = answerValue(q)
  if (value === null) return 'nicht getippt'
  return q.type === 'NUMBER' && q.unit ? `${value} ${q.unit}` : String(value)
}
const validNumber = raw => raw == null || raw === '' || (Number.isInteger(Number(raw)) && Number(raw) >= 0 && Number(raw) <= 1_000_000)

/** Wann die Frage schließt: der Hinweis der Turnierleitung, sonst die Runde. */
function closesShort (q) {
  if (q.closeNote) return q.closeNote
  return q.closeAfterRound ? `bis ${q.closeAfterRound}` : 'noch offen'
}
function closesText (q) {
  if (q.closeNote) return `Offen bis: ${q.closeNote}.`
  if (q.closeAfterRound) return `Offen, bis das ${q.closeAfterRound} gespielt ist.`
  return 'Die Turnierleitung schließt diese Frage von Hand.'
}

const openQuestions = computed(() => questions.value.filter(q => q.open))
const answered = computed(() => questions.value.filter(q => answerValue(q) !== null).length + (clean(mystery.value) ? 1 : 0))
const answersDirty = computed(() => openQuestions.value.some(q => answerValue(q) !== (savedAnswers.value[q.id] ?? null)))
const answersValid = computed(() => openQuestions.value.every(q => q.type !== 'NUMBER' || validNumber(answers[q.id])))

// Gespeichert wird nur, was offen und geändert ist.
const tipsDirty = computed(() => editable.value && dirty.value)
const anyDirty = computed(() => account.value === 'in' && (tipsDirty.value || answersDirty.value))
const canSave = computed(() => !!props.tournament?.tipsOpen || openQuestions.value.length > 0)

watch(anyDirty, d => { if (d) savedAt.value = '' })

const answerMap = list => Object.fromEntries((list ?? []).map(a => [a.questionId, a.value]))

function applyAnswers (list) {
  const map = answerMap(list)
  for (const id of Object.keys(answers)) delete answers[id]
  Object.assign(answers, map)
  savedAnswers.value = map
}

function autoFill (ps) {
  const match = bestMatch(searches[ps] || picks[ps], participants.value)
  if (match) picks[ps] = match
}

/** Merkt sich den Stand des Servers, ohne die Eingabefelder anzufassen. */
function rememberTips ({ picks: list, mysteryGuess }) {
  saved.value = Object.fromEntries((list ?? []).map(p => [p.pseudonym, clean(p.playerName)]))
  savedMystery.value = clean(mysteryGuess)
}

function applyTips (data = {}) {
  // Die Antwort von PUT /tips kennt keine Zusatzfragen; nur ein ausdrücklich geliefertes Feld ersetzt sie.
  if (data.answers !== undefined) applyAnswers(data.answers)
  rememberTips(data)
  for (const ps of Object.keys(picks)) delete picks[ps]
  Object.assign(picks, saved.value)
  mystery.value = savedMystery.value
}

async function loadMe () {
  try {
    me.value = (await gcApi.get('/me')).data
    account.value = 'in'
    if (me.value.needsName) openNameDialog()
    await loadTips()
  } catch (e) {
    me.value = null
    account.value = e.response?.status === 401 ? 'anon' : 'down'
  }
}

async function loadTips () {
  try {
    applyTips((await gcApi.get('/tips/me')).data)
  } catch (e) {
    // Ohne gespeicherte Tipps ist das Formular leer; das ist kein Fehler, den man anzeigen muss.
    if (e.response?.status === 401) signedOut()
  }
}

function signedOut () {
  me.value = null
  account.value = 'anon'
}

const tipsPayload = () => ({
  picks: Object.entries(current()).map(([pseudonym, playerName]) => ({ pseudonym, playerName })),
  mysteryGuess: clean(mystery.value),
})
const answersPayload = () => openQuestions.value.map(q => ({ questionId: q.id, value: answerValue(q) }))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Wurde während einer Anfrage weitergetippt, übernimmt die Antwort nur den
// gespeicherten Stand; die Felder bleiben, der nächste Durchlauf speichert sie.
async function saveTips () {
  const sent = tipsPayload()
  const res = await gcApi.put('/tips', sent)
  const stored = Array.isArray(res.data?.picks) ? res.data : sent
  if (same(tipsPayload(), sent)) applyTips(stored)
  else rememberTips(stored)
}

/** Liefert einen Hinweis, wenn eine Frage beim Speichern schon geschlossen war. */
async function saveAnswers () {
  const sent = answersPayload()
  const res = await gcApi.put('/answers', { answers: sent })
  if (same(answersPayload(), sent)) applyAnswers(res.data?.answers)
  else savedAnswers.value = answerMap(res.data?.answers)
  return res.data?.closed?.length
    ? 'Eine Frage wurde inzwischen geschlossen. Dort zählt deine zuletzt gespeicherte Antwort.'
    : ''
}

async function saveOnce () {
  if (!anyDirty.value) return
  saveError.value = ''
  try {
    // Nacheinander: Beide Anfragen schreiben denselben Datensatz.
    if (tipsDirty.value) await saveTips()
    // Eine ungültige Schätzung bleibt nur im Feld stehen, bis sie korrigiert ist.
    if (answersDirty.value && answersValid.value) saveError.value = await saveAnswers()
    if (!saveError.value) savedAt.value = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    saveError.value = saveErrorText(e)
  }
}

// Jede Änderung speichert sich selbst. Es läuft immer nur eine Anfrage; was
// währenddessen geändert wird, geht danach in einem weiteren Durchlauf raus.
const TYPING_DELAY = 1000
let timer = null
let again = false

function saveSoon (delay) {
  clearTimeout(timer)
  timer = setTimeout(flush, delay)
}

async function flush () {
  clearTimeout(timer)
  if (saving.value) {
    again = true
    return
  }
  saving.value = true
  try {
    do {
      again = false
      await saveOnce()
    } while (again && !saveError.value)
  } finally {
    saving.value = false
  }
}

// Auswahlfelder speichern sofort, Freitext und Zahlen erst nach einer Tipppause oder beim Verlassen des Felds.
watch(() => JSON.stringify(current()), () => saveSoon(0))
watch(mystery, () => saveSoon(TYPING_DELAY))
watch(() => ({ ...answers }), (now, before) => {
  const typed = questions.value.some(q => q.type === 'NUMBER' && now[q.id] !== before[q.id])
  saveSoon(typed ? TYPING_DELAY : 0)
})

function warnUnsaved (e) {
  if (anyDirty.value) e.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', warnUnsaved))
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', warnUnsaved)
  flush()
})

function saveErrorText (e) {
  const status = e.response?.status
  if (status === 401) {
    signedOut()
    return 'Deine Anmeldung ist abgelaufen. Melde dich neu an; deine letzten Eingaben sind noch nicht gespeichert.'
  }
  if (status === 409) return 'Tippen ist inzwischen geschlossen. Es zählen deine zuletzt gespeicherten Tipps.'
  if (status === 400) return 'Eine Eingabe passt nicht mehr zum Turnier. Lade die Seite neu und prüf deine Auswahl.'
  if (status === 503) return 'Die Turnierdaten sind gerade nicht erreichbar. Deine Tipps sind noch nicht gespeichert; versuch es gleich noch einmal.'
  return 'Speichern hat nicht geklappt. Deine Eingaben sind noch da; versuch es gleich noch einmal.'
}

async function logout () {
  loggingOut.value = true
  await gcApi.post('/auth/logout').catch(() => {})
  loggingOut.value = false
  signedOut()
  applyTips({ answers: [] })
}

const nameDialog = reactive({ open: false, value: '', error: '', saving: false })

function openNameDialog () {
  Object.assign(nameDialog, { open: true, value: me.value?.displayName ?? '', error: '' })
}

async function saveName () {
  const name = nameDialog.value.trim()
  if (name.length < 3 || name.length > 24) {
    nameDialog.error = 'Der Name braucht 3 bis 24 Zeichen.'
    return
  }
  nameDialog.saving = true
  nameDialog.error = ''
  try {
    me.value = (await gcApi.patch('/me', { displayName: name })).data
    nameDialog.open = false
  } catch (e) {
    const status = e.response?.status
    if (status === 401) {
      nameDialog.open = false
      signedOut()
    } else {
      nameDialog.error = {
        409: 'Der Name ist schon vergeben.',
        400: 'Der Name braucht 3 bis 24 Zeichen.',
      }[status] ?? 'Speichern hat nicht geklappt. Versuch es gleich noch einmal.'
    }
  } finally {
    nameDialog.saving = false
  }
}

onMounted(loadMe)
</script>

<style scoped>
.gc-list { padding-left: 1.25rem; }
.gc-num { font-variant-numeric: tabular-nums; }

/* Drei feste Spalten, damit Icons, Kurztexte und Felder über alle Zeilen in einer Flucht stehen. */
.gc-row {
  max-width: 54rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 10.5rem 17rem;
  gap: 4px 16px;
  align-items: center;
  padding: 8px 0;
}
.gc-row + .gc-row { border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }

.gc-meta {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 6px;
  align-items: center;
  font-size: 0.8125rem;
  white-space: nowrap;
}
.gc-meta--inline { display: inline-flex; }
.gc-until { overflow: hidden; text-overflow: ellipsis; }
/* Auf der Textlinie der Felder daneben */
.gc-closed { padding: 8px 16px; }

/* Kleiner als ein getippter Name, damit leere und getippte Felder unterscheidbar bleiben. */
.gc-pick :deep(input::placeholder) { font-size: 0.8125rem; }

/* Getippte Felder: Rand und getönte Fläche in der Farbe ihres Zustands; die Legende nutzt dieselben Klassen. */
.gc-pick--secondary { --gc-hl: var(--v-theme-secondary); }
.gc-pick--warning { --gc-hl: var(--v-theme-warning); }
.gc-pick--success { --gc-hl: var(--v-theme-success); }
.gc-pick--error { --gc-hl: var(--v-theme-error); }
.gc-pick[class*='gc-pick--'] :deep(.v-field),
.gc-swatch {
  box-shadow: inset 0 0 0 2px rgb(var(--gc-hl));
  background: rgba(var(--gc-hl), 0.14);
}
.gc-pick[class*='gc-pick--'] :deep(.v-field__overlay) { opacity: 0; }
/* Nach Tippschluss sind die Felder gesperrt; die Färbung soll trotzdem kräftig bleiben. */
.gc-pick[class*='gc-pick--'] :deep(.v-field--disabled) { opacity: 1; }
.gc-swatch {
  display: inline-block;
  width: 20px;
  height: 14px;
  border-radius: 4px;
}

.gc-section {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* Schmal: Frage, darunter der Tippschluss, dann das Feld, alles an der linken Kante. */
@media (max-width: 640px) {
  .gc-row { grid-template-columns: 1fr; gap: 2px; padding: 10px 0; }
  .gc-meta { grid-template-columns: 16px auto; justify-content: start; margin-bottom: 6px; }
  .gc-closed { padding-left: 0; }
}

/* Auf dem Handy liegen viele Felder untereinander; der Speicherstand bleibt sichtbar. */
.gc-savebar {
  position: sticky;
  bottom: 0;
  z-index: 1;
  background: rgb(var(--v-theme-background));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
