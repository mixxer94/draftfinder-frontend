<template>
  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>
  <v-alert v-if="info" type="info" variant="tonal" closable class="mb-4" @click:close="info = ''">{{ info }}</v-alert>

  <template v-if="m">
    <PageHeader :title="`${m.slotCode}: ${name.A} vs. ${name.B}`">
      <template #before>
        <v-btn icon="mdi-arrow-left" variant="text" size="small" aria-label="Zurück" @click="$router.back()" />
      </template>
      <template #meta>
        <MatchStateChip :match="m" />
      </template>
      <v-btn
        v-if="STARTABLE.includes(m.state) && !m.blocked"
        variant="text"
        :loading="busy === 'start'"
        @click="startNow"
      >
        Sofort starten
      </v-btn>
      <v-btn
        v-if="STARTABLE.includes(m.state) && !m.blocked && !scheduling.open"
        variant="text"
        @click="openScheduling"
      >
        Termin festlegen
      </v-btn>
      <v-btn
        v-if="RESETTABLE.includes(m.state) && !m.blocked"
        variant="text"
        color="error"
        :loading="busy === 'reset'"
        @click="resetSchedule"
      >
        Terminfindung neu starten
      </v-btn>
    </PageHeader>
    <p class="mb-6">
      {{ m.roundLabel }} · Bo{{ m.bestOf }}
      <template v-if="m.scheduledAt"> · {{ fmt(m.scheduledAt, true) }}</template>
    </p>

    <div v-if="scheduling.open" class="d-flex flex-wrap align-center ga-2 mb-8">
      <v-text-field
        v-model="scheduling.at"
        type="datetime-local"
        :label="`Termin (${m.timezone})`"
        density="compact"
        hide-details
        style="max-width: 260px"
      />
      <v-btn color="secondary" variant="flat" :loading="busy === 'schedule'" :disabled="!scheduling.at" @click="setSchedule">
        Festlegen
      </v-btn>
      <v-btn variant="text" @click="scheduling.open = false">Abbrechen</v-btn>
    </div>

    <v-alert v-if="todo" type="warning" variant="tonal" class="mb-8">
      {{ todo.text }}
      <template v-if="todo.action" #append>
        <v-btn v-bind="todo.action.link" variant="text" size="small">{{ todo.action.label }}</v-btn>
      </template>
    </v-alert>

    <h2 v-if="m.drafts.length" class="hc-h2">Draft-Links</h2>
    <div class="d-flex flex-column ga-1 text-body-2">
      <div v-for="d in m.drafts" :key="d.messageId" class="d-flex align-center ga-2">
        <!-- Die Einordnung stammt vom Bot; das Menü korrigiert sie. -->
        <v-menu>
          <template #activator="{ props: menu }">
            <v-chip
              v-bind="menu"
              size="small"
              variant="tonal"
              :color="d.kind === 'INVALID' ? 'error' : undefined"
              append-icon="mdi-menu-down"
              :aria-label="`Einordnung: ${DRAFT_KINDS[d.kind] ?? 'offen'}`"
            >
              {{ DRAFT_KINDS[d.kind] ?? '?' }}
            </v-chip>
          </template>
          <v-list density="compact">
            <v-list-item v-for="(label, kind) in DRAFT_KINDS" :key="kind" :title="label" :active="d.kind === kind" @click="classify(d, kind)" />
          </v-list>
        </v-menu>
        <a :href="d.url" target="_blank" rel="noopener" class="text-truncate" :class="{ 'text-decoration-line-through': d.kind === 'INVALID' }">{{ d.url }}</a>
      </div>
    </div>

    <template v-if="m.result">
      <h2 class="hc-h2 mt-8">Ergebnis</h2>
      <p>
        <strong>{{ name[m.result.winner] }}</strong> gewinnt {{ m.result.score }}
        <span class="text-caption text-disabled ml-1">{{ fmt(m.result.reportedAt) }}</span>
        <v-chip v-if="m.result.lockedAt" size="small" variant="tonal" class="ml-1">gesperrt: {{ m.result.lockReason }}</v-chip>
      </p>
      <ul v-if="m.result.corrections.length" class="text-medium-emphasis ml-6 mb-2">
        <li v-for="c in m.result.corrections" :key="c.at">{{ fmt(c.at) }}: {{ c.from }} → {{ c.to }} ({{ c.by }})</li>
      </ul>
      <v-btn v-if="!correction.open" variant="text" size="small" class="mt-1" @click="openCorrection">Ergebnis korrigieren</v-btn>
      <div v-else class="d-flex flex-wrap align-center ga-2 mt-3">
        <v-select v-model="correction.winner" :items="[{ title: name.A, value: 'A' }, { title: name.B, value: 'B' }]" label="Sieger" density="compact" hide-details style="max-width: 220px" />
        <v-select v-model="correction.score" :items="m.validScores" label="Ergebnis" density="compact" hide-details style="max-width: 140px" />
        <v-btn color="error" variant="text" :loading="busy === 'result'" :disabled="!correctionChanged" @click="correctResult">
          Korrigieren
        </v-btn>
        <v-btn variant="text" @click="correction.open = false">Abbrechen</v-btn>
      </div>
    </template>

    <template v-if="WITH_RESULT.includes(m.state) && m.guesses">
      <h2 class="hc-h2 mt-8">Vermutungen</h2>
      <v-table density="compact">
        <thead><tr><th>Spieler</th><th>Vermutet</th><th>Korrigieren</th></tr></thead>
        <tbody>
          <tr v-for="s in ['A', 'B']" :key="s">
            <td class="font-weight-medium">{{ name[s] }}</td>
            <td>
              <template v-if="m.guesses[s]">{{ m.guesses[s].name }}</template>
              <v-chip v-else size="small" variant="tonal" color="warning">offen</v-chip>
            </td>
            <td>
              <div class="d-flex align-center ga-2 py-1">
                <v-select
                  v-model="guessInput[s]"
                  :items="m.guessOptions ?? []"
                  item-title="name"
                  item-value="key"
                  label="Vermutung"
                  density="compact"
                  hide-details
                  style="min-width: 200px; max-width: 260px"
                />
                <v-btn size="small" color="secondary" variant="flat" :disabled="!guessInput[s]" :loading="busy === `guess-${s}`" @click="saveGuess(s)">
                  Speichern
                </v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
    </template>

    <h2 id="replay" class="hc-h2 hc-anchor mt-8">Replay-Pack</h2>
    <p v-if="m.replayPack">
      <a :href="`/api/hc/matches/${m.id}/replay`">{{ m.replayPack.filename }}</a>
    </p>
    <template v-else>
      <div class="d-flex flex-wrap align-center ga-2">
        <v-file-input
          v-model="upload.file"
          accept=".zip,application/zip"
          label="Replay-Pack (.zip)"
          density="compact"
          hide-details
          style="max-width: 360px"
        />
        <v-btn color="secondary" variant="flat" :loading="busy === 'upload'" :disabled="!uploadFile" @click="uploadReplay">
          Hochladen
        </v-btn>
      </div>
      <v-progress-linear v-if="busy === 'upload'" :model-value="upload.progress" class="mt-2" style="max-width: 480px" />
    </template>

    <h2 class="hc-h2 mt-8">Chatverlauf</h2>
    <template v-if="!chat.messages">
      <v-btn variant="tonal" size="small" :loading="busy === 'chat'" @click="loadChat">Anzeigen</v-btn>
      <span class="text-body-2 text-medium-emphasis ml-2">wird im Audit-Log vermerkt</span>
      <p v-if="chat.error" class="text-error mt-2" role="alert">Chatverlauf nicht geladen: {{ chat.error }}</p>
    </template>
    <div v-else class="hc-chat">
      <p v-if="!chat.messages.length" class="text-medium-emphasis">Keine Nachrichten.</p>
      <div v-for="msg in chat.messages" :key="msg.id" :class="['hc-bubble', side(msg), { discarded: msg.direction === 'DISCARDED' }]">
        <div class="text-caption font-weight-bold">
          <template v-if="msg.direction === 'ADMIN_TO_PLAYER'">Turnierleitung{{ msg.to ? ` an ${name[msg.to]}` : '' }}</template>
          <template v-else>{{ name[msg.from] ?? '?' }}</template>
        </div>
        <div class="hc-text">{{ msg.text }}</div>
        <div class="text-caption text-medium-emphasis">
          {{ fmt(msg.createdAt) }}
          <template v-if="msg.isEdit"> · Bearbeitung</template>
          <template v-if="msg.deleted"> · beim Absender gelöscht</template>
          <template v-if="msg.direction === 'DISCARDED' || (msg.direction === 'ADMIN_TO_PLAYER' && !msg.delivered)"> · nicht zugestellt</template>
          <template v-if="msg.strippedUrls.length"> · entfernte Links: {{ msg.strippedUrls.join(', ') }}</template>
        </div>
      </div>
    </div>

    <h2 id="nachricht" class="hc-h2 hc-anchor mt-8">Nachricht senden</h2>
    <v-textarea v-model="compose.text" label="Nachricht" rows="3" counter="1500" maxlength="1500" />
    <div class="d-flex flex-wrap align-center ga-2">
      <v-select v-model="compose.to" :items="recipients" label="Empfänger" density="compact" hide-details style="max-width: 240px" />
      <v-btn color="secondary" variant="flat" :loading="busy === 'message'" :disabled="!compose.text.trim()" @click="send">Senden</v-btn>
    </div>

    <v-expansion-panels multiple flat class="hc-panels mt-8">
      <v-expansion-panel>
        <v-expansion-panel-title>Verlauf ({{ m.timeline.length }})</v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-table density="compact">
            <thead><tr><th>Zeit</th><th>Ereignis</th><th>Akteur</th></tr></thead>
            <tbody>
              <tr v-for="(e, i) in m.timeline" :key="i">
                <td class="text-no-wrap text-medium-emphasis">{{ fmt(e.at) }}</td>
                <td>{{ EVENTS[e.event] ?? e.event }}</td>
                <td>{{ e.actor }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-expansion-panel-text>
      </v-expansion-panel>
      <v-expansion-panel v-if="m.overrides.length">
        <v-expansion-panel-title>Übergangene Sperren ({{ m.overrides.length }})</v-expansion-panel-title>
        <v-expansion-panel-text>
          <v-table density="compact">
            <thead><tr><th>Zeit</th><th>Sperre</th><th>Grund</th><th>Von</th></tr></thead>
            <tbody>
              <tr v-for="(o, i) in m.overrides" :key="i">
                <td class="text-medium-emphasis">{{ fmt(o.at) }}</td><td>{{ o.kind }}</td><td>{{ o.reason }}</td><td>{{ o.by }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </template>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { errorMessage, formatDate, hcApi, MATCH_STATES } from '@/services/hcApi'
import { confirmAction, confirmStartNow } from '@/services/confirm'
import PageHeader from '@/components/gliddencup/PageHeader.vue'
import MatchStateChip from '@/components/gliddencup/MatchStateChip.vue'

const route = useRoute()
const m = ref(null)
const error = ref('')
const info = ref('')
const busy = ref('')
const correction = reactive({ open: false, winner: null, score: null })
// null, bis der Chatverlauf ausdrücklich abgerufen wird; jeder Abruf erzeugt einen Audit-Eintrag.
const chat = reactive({ messages: null, error: '' })
const MAX_MB = 64
const EVENTS = { ...MATCH_STATES, ACTIVATED: 'Freigegeben', SCHEDULED_BY_ADMIN: 'Termin von der Turnierleitung festgelegt' }
const DRAFT_KINDS = { MAP: 'Map', CIV: 'Civ', INVALID: 'ungültig' }
// Wie STARTABLE und RESETTABLE im Backend; die API prüft ohnehin selbst.
const STARTABLE = ['INVITED', 'COLLECTING', 'PROPOSED', 'HALF_CONFIRMED', 'CONFIRMED', 'ESCALATED']
const RESETTABLE = ['CONFIRMED', 'AWAITING_RESULT', 'ESCALATED']
const upload = reactive({ file: null, progress: 0 })
// v-file-input liefert je nach Vuetify-Version eine Datei oder ein Array.
const uploadFile = computed(() => (Array.isArray(upload.file) ? upload.file[0] : upload.file) ?? null)
const compose = reactive({ text: '', to: 'BOTH' })
// Vermutungen gibt es erst mit gemeldetem Ergebnis.
const WITH_RESULT = ['RESULT_REPORTED', 'PLAYED']
const guessInput = reactive({ A: null, B: null })
// `at` als datetime-local-Wert in der Turnierzone, so erwartet ihn POST /matches/:id/schedule.
const scheduling = reactive({ open: false, at: '' })

const name = computed(() => ({ A: m.value?.players.A.pseudonym, B: m.value?.players.B.pseudonym }))
const recipients = computed(() => [
  { title: 'an beide', value: 'BOTH' },
  { title: `nur ${name.value.A}`, value: 'A' },
  { title: `nur ${name.value.B}`, value: 'B' },
])

const correctionChanged = computed(() => correction.winner && correction.score &&
  (correction.winner !== m.value.result?.winner || correction.score !== m.value.result?.score))

const toSection = id => ({ href: `#${id}` })

/** Was die Turnierleitung bei diesem Match tun muss, oder `null`; den Stand zeigt schon der Status-Chip. */
const todo = computed(() => {
  const x = m.value
  if (x.blocked) {
    return x.blocked.reason === 'DM_BLOCKED'
      ? {
          text: 'Bot erreicht einen Spieler nicht per DM, Fristen pausiert. Der Spieler muss DMs vom Server erlauben.',
          action: { label: 'Anmeldungen', link: { to: '/gliddencup/admin/registrations' } },
        }
      : { text: `Blockiert: ${x.blocked.reason}. Fristen pausiert.` }
  }
  if (x.state === 'ESCALATED') {
    return {
      text: 'Eskaliert: Frist abgelaufen oder ein Spieler reagiert nicht.',
      action: { label: 'Nachricht schreiben', link: toSection('nachricht') },
    }
  }
  if (x.result && !x.replayPack) {
    return {
      text: 'Replay fehlt.',
      action: { label: 'Hochladen', link: toSection('replay') },
    }
  }
  return null
})

const fmt = (iso, weekday = false) => formatDate(iso, m.value?.timezone, weekday)
const side = msg => (msg.direction === 'ADMIN_TO_PLAYER' ? 'admin' : msg.from === 'A' ? 'left' : 'right')

async function load () {
  try {
    m.value = (await hcApi.get(`/matches/${route.params.id}`)).data
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function loadChat () {
  busy.value = 'chat'
  chat.error = ''
  try {
    // Fehlende Liste als leer behandeln, damit der Klick immer sichtbar etwas bewirkt.
    chat.messages = (await hcApi.get(`/matches/${route.params.id}/messages`)).data.messages ?? []
  } catch (e) {
    // Am Button statt oben auf der Seite, dort sieht man die Meldung beim Klick nicht.
    chat.error = errorMessage(e)
  } finally {
    busy.value = ''
  }
}

function openCorrection () {
  Object.assign(correction, { open: true, winner: m.value.result.winner, score: m.value.result.score })
}

async function run (key, fn) {
  busy.value = key
  error.value = ''
  try {
    const res = await fn()
    await load()
    return res
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = ''
  }
}

async function startNow () {
  const ok = await confirmStartNow({
    code: m.value.slotCode, a: name.value.A, b: name.value.B, scheduledAt: m.value.scheduledAt, timezone: m.value.timezone,
  })
  if (!ok) return
  const res = await run('start', () => hcApi.post(`/matches/${m.value.id}/start`))
  if (res) info.value = `${m.value.slotCode} gestartet.`
}

/** Füllt das Feld mit dem bestehenden Termin; sv-SE liefert „YYYY-MM-DD HH:mm“, passend für datetime-local. */
function openScheduling () {
  const iso = m.value.scheduledAt
  scheduling.at = iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: m.value.timezone }).slice(0, 16).replace(' ', 'T') : ''
  scheduling.open = true
}

async function setSchedule () {
  const termin = m.value.scheduledAt ? `
Der bisherige Termin am ${fmt(m.value.scheduledAt, true)} entfällt.` : ''
  const ok = await confirmAction({
    title: `Termin für ${m.value.slotCode} festlegen?`,
    text: `${name.value.A} vs. ${name.value.B}: Beide bekommen die Terminbestätigung, ein offener Vorschlag verfällt.${termin}`,
    confirmText: 'Festlegen',
  })
  if (!ok) return
  const res = await run('schedule', () => hcApi.post(`/matches/${m.value.id}/schedule`, { at: scheduling.at }))
  if (!res) return
  scheduling.open = false
  info.value = `Termin für ${m.value.slotCode} festgelegt: ${fmt(res.data.scheduledAt, true)}.`
}

/** Etwa nach einem No-Show: Nach Beginn können die Spieler selbst nicht mehr absagen. */
async function resetSchedule () {
  const termin = m.value.scheduledAt ? ` Der Termin am ${fmt(m.value.scheduledAt, true)} entfällt.` : ''
  const ok = await confirmAction({
    title: `Terminfindung für ${m.value.slotCode} neu starten?`,
    text: `${name.value.A} vs. ${name.value.B}:${termin} Verfügbarkeiten und Presets werden verworfen, beide tragen neu ein.`,
    confirmText: 'Neu starten',
    color: 'error',
  })
  if (!ok) return
  const res = await run('reset', () => hcApi.post(`/matches/${m.value.id}/reset`))
  if (!res) return
  info.value = res.data.windowOpen
    ? `Terminfindung für ${m.value.slotCode} neu gestartet.`
    : `Terminfindung für ${m.value.slotCode} neu gestartet — das Terminfenster ist abgelaufen, bitte einen Termin festlegen.`
}

function classify (d, kind) {
  if (!kind || kind === d.kind) return
  run(`draft-${d.messageId}`, () => hcApi.post(`/matches/${m.value.id}/drafts/${d.messageId}/classify`, { kind }))
}

async function correctResult () {
  const ok = await confirmAction({
    title: 'Ergebnis korrigieren?',
    text: `Neu: ${name.value[correction.winner]} gewinnt ${correction.score}.`,
    confirmText: 'Korrigieren',
    color: 'error',
  })
  if (!ok) return
  const res = await run('result', () => hcApi.post(`/matches/${m.value.id}/result`, { winner: correction.winner, score: correction.score }))
  if (res) correction.open = false
}

async function saveGuess (s) {
  const res = await run(`guess-${s}`, () => hcApi.post(`/matches/${m.value.id}/guess`, { side: s, guessedKey: guessInput[s] }))
  if (res) guessInput[s] = null
}

async function send () {
  const res = await run('message', () => hcApi.post(`/matches/${m.value.id}/message`, compose))
  if (!res) return
  const { delivered, unreachable } = res.data
  // Blockierte DM ist kein Fehlschlag, aber die Orga muss es wissen.
  info.value = unreachable ? `Zugestellt: ${delivered}. Nicht erreichbar: ${unreachable}.` : `Nachricht zugestellt (${delivered}).`
  compose.text = ''
  // Nur nachladen, wenn der Verlauf schon offen ist; sonst entstünde ein Audit-Eintrag ohne Abruf.
  if (chat.messages) await loadChat()
}

/*
 * Die Datei geht als roher Body hinaus, der Name als Query-Parameter — so
 * erwartet es POST /api/hc/matches/:id/replay.
 */
async function uploadReplay () {
  const file = uploadFile.value
  if (!/\.zip$/i.test(file.name)) {
    error.value = 'Bitte ein .zip-Archiv wählen.'
    return
  }
  if (file.size > MAX_MB * 1048576) {
    error.value = `Die Datei ist größer als ${MAX_MB} MB.`
    return
  }
  upload.progress = 0
  const res = await run('upload', () =>
    hcApi.post(`/matches/${m.value.id}/replay`, file, {
      params: { filename: file.name },
      headers: { 'Content-Type': 'application/octet-stream' },
      onUploadProgress: e => { upload.progress = e.total ? (100 * e.loaded) / e.total : 0 },
    }))
  if (res) {
    upload.file = null
    info.value = 'Replay-Pack gespeichert.'
  }
}

onMounted(load)
</script>

<style scoped>
.hc-chat { display: flex; flex-direction: column; gap: 8px; max-width: 900px; }
.hc-bubble { max-width: 70%; padding: 8px 12px; border-radius: 10px; background: rgba(var(--v-theme-on-surface), 0.06); }
.hc-bubble.left { align-self: flex-start; }
.hc-bubble.right { align-self: flex-end; background: rgba(var(--v-theme-secondary), 0.15); }
.hc-bubble.admin { align-self: center; background: rgba(var(--v-theme-warning), 0.18); }
/* Nicht zugestellt: gestrichelter Rahmen statt Abblenden, der Text bleibt voll lesbar; „nicht zugestellt“ steht zusätzlich in der Fußzeile. */
.hc-bubble.discarded { background: transparent; border: 1px dashed rgba(var(--v-theme-on-surface), 0.45); }
.hc-text { white-space: pre-wrap; word-break: break-word; }
/* Sprungziele aus „Nächster Schritt“; hält die Überschrift unter der fixen App-Leiste frei. */
.hc-anchor { scroll-margin-top: 64px; }
.hc-panels { max-width: 900px; }
</style>
