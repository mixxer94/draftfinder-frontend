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
        color="secondary"
        variant="flat"
        prepend-icon="mdi-play"
        :loading="busy === 'start'"
        @click="startNow"
      >
        Starten
      </v-btn>
    </PageHeader>
    <p class="mb-8">
      {{ m.roundLabel }} · Best of {{ m.bestOf }}
      <template v-if="m.scheduledAt"> · Termin {{ fmt(m.scheduledAt, true) }}</template>
      <template v-if="m.blocked"><br><span class="text-error">Blockiert: {{ m.blocked.reason }}</span></template>
    </p>

    <h2 class="hc-h2">Draft-Links</h2>
    <p v-if="!m.drafts.length" class="text-medium-emphasis">Noch keine.</p>
    <v-table v-else density="compact">
      <thead><tr><th>Zeit</th><th>Von</th><th>Link</th><th>Einordnung</th></tr></thead>
      <tbody>
        <tr v-for="d in m.drafts" :key="d.messageId">
          <td class="text-no-wrap text-medium-emphasis">{{ fmt(d.at) }}</td>
          <td>{{ name[d.sentBy] }}</td>
          <td><a :href="d.url" target="_blank" rel="noopener">{{ d.url }}</a></td>
          <td>
            <v-btn-toggle :model-value="d.kind" density="compact" variant="outlined" divided @update:model-value="k => classify(d, k)">
              <v-btn value="MAP" size="small">Map</v-btn>
              <v-btn value="CIV" size="small">Civ</v-btn>
              <v-btn value="INVALID" size="small">ungültig</v-btn>
            </v-btn-toggle>
          </td>
        </tr>
      </tbody>
    </v-table>

    <h2 class="hc-h2 mt-8">Ergebnis</h2>
    <p v-if="!m.result" class="text-medium-emphasis">Noch nicht gemeldet.</p>
    <template v-else>
      <p>
        <strong>{{ name[m.result.winner] }}</strong> gewinnt {{ m.result.score }}
        <span class="text-medium-emphasis">· gemeldet {{ fmt(m.result.reportedAt) }}</span>
        <v-chip v-if="m.result.lockedAt" size="small" variant="tonal" class="ml-1">gesperrt: {{ m.result.lockReason }}</v-chip>
      </p>
      <ul v-if="m.result.corrections.length" class="text-medium-emphasis ml-6 mb-2">
        <li v-for="c in m.result.corrections" :key="c.at">{{ fmt(c.at) }}: {{ c.from }} → {{ c.to }} ({{ c.by }})</li>
      </ul>
      <div class="d-flex flex-wrap align-center ga-2 mt-3">
        <v-select v-model="correction.winner" :items="[{ title: name.A, value: 'A' }, { title: name.B, value: 'B' }]" label="Sieger" density="compact" hide-details style="max-width: 220px" />
        <v-select v-model="correction.score" :items="m.validScores" label="Ergebnis" density="compact" hide-details style="max-width: 140px" />
        <v-btn color="error" variant="text" :loading="busy === 'result'" :disabled="!correction.winner || !correction.score" @click="correctResult">
          Korrigieren
        </v-btn>
      </div>
    </template>

    <h2 class="hc-h2 mt-8">Replay-Pack</h2>
    <p v-if="m.replayPack">
      <a :href="`/api/hc/matches/${m.id}/replay`">{{ m.replayPack.filename }}</a>
      <span class="text-medium-emphasis">
        · {{ (m.replayPack.bytes / 1048576).toFixed(2) }} MB · {{ m.replayPack.source }} · {{ fmt(m.replayPack.uploadedAt) }}
      </span>
    </p>
    <template v-else>
      <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
        Replay fehlt. Folgematches lassen sich erst danach freigeben.
        Packs über 10 MB lehnt Discord ab. Sie gehen hier hoch, bis {{ MAX_MB }} MB.
      </v-alert>
      <div class="d-flex flex-wrap align-center ga-2">
        <v-file-input
          v-model="upload.file"
          accept=".zip,application/zip"
          label="Replay-Pack (.zip)"
          density="compact"
          hide-details
          show-size
          style="max-width: 360px"
        />
        <v-btn color="secondary" variant="flat" :loading="busy === 'upload'" :disabled="!uploadFile" @click="uploadReplay">
          Hochladen
        </v-btn>
      </div>
      <v-progress-linear v-if="busy === 'upload'" :model-value="upload.progress" class="mt-2" style="max-width: 480px" />
    </template>

    <h2 class="hc-h2 mt-8">Chatverlauf</h2>
    <p class="text-body-2 text-medium-emphasis mb-3">Links {{ name.A }}, rechts {{ name.B }}, mittig die Turnierleitung. Jeder Aufruf steht im Audit-Log.</p>
    <div class="hc-chat">
      <p v-if="!m.messages.length" class="text-medium-emphasis">Noch keine Nachrichten.</p>
      <div v-for="msg in m.messages" :key="msg.id" :class="['hc-bubble', side(msg), { discarded: msg.direction === 'DISCARDED' }]">
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

    <h2 class="hc-h2 mt-8">Nachricht senden</h2>
    <v-textarea v-model="compose.text" rows="3" counter="1500" maxlength="1500" placeholder="Kommt bei den Spielern als Nachricht der Turnierleitung an." />
    <div class="d-flex flex-wrap align-center ga-2">
      <v-select v-model="compose.to" :items="recipients" density="compact" hide-details style="max-width: 240px" />
      <v-btn color="secondary" variant="flat" :loading="busy === 'message'" :disabled="!compose.text.trim()" @click="send">Senden</v-btn>
    </div>

    <h2 class="hc-h2 mt-8">Verlauf</h2>
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

    <template v-if="m.overrides.length">
      <h2 class="hc-h2 mt-8">Übergangene Sperren</h2>
      <v-table density="compact">
        <thead><tr><th>Zeit</th><th>Sperre</th><th>Grund</th><th>Von</th></tr></thead>
        <tbody>
          <tr v-for="(o, i) in m.overrides" :key="i">
            <td class="text-medium-emphasis">{{ fmt(o.at) }}</td><td>{{ o.kind }}</td><td>{{ o.reason }}</td><td>{{ o.by }}</td>
          </tr>
        </tbody>
      </v-table>
    </template>
  </template>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { errorMessage, formatDate, hcApi, MATCH_STATES } from '@/services/hcApi'
import { confirmAction } from '@/services/confirm'
import PageHeader from '@/components/gliddencup/PageHeader.vue'
import MatchStateChip from '@/components/gliddencup/MatchStateChip.vue'

const route = useRoute()
const m = ref(null)
const error = ref('')
const info = ref('')
const busy = ref('')
const correction = reactive({ winner: null, score: null })
const MAX_MB = 64
const EVENTS = { ...MATCH_STATES, ACTIVATED: 'Freigegeben' }
// Wie STARTABLE im Backend; die API prüft ohnehin selbst.
const STARTABLE = ['INVITED', 'COLLECTING', 'PROPOSED', 'HALF_CONFIRMED', 'CONFIRMED', 'ESCALATED']
const upload = reactive({ file: null, progress: 0 })
// v-file-input liefert je nach Vuetify-Version eine Datei oder ein Array.
const uploadFile = computed(() => (Array.isArray(upload.file) ? upload.file[0] : upload.file) ?? null)
const compose = reactive({ text: '', to: 'BOTH' })

const name = computed(() => ({ A: m.value?.players.A.pseudonym, B: m.value?.players.B.pseudonym }))
const recipients = computed(() => [
  { title: 'an beide', value: 'BOTH' },
  { title: `nur ${name.value.A}`, value: 'A' },
  { title: `nur ${name.value.B}`, value: 'B' },
])

const fmt = (iso, weekday = false) => formatDate(iso, m.value?.timezone, weekday)
const side = msg => (msg.direction === 'ADMIN_TO_PLAYER' ? 'admin' : msg.from === 'A' ? 'left' : 'right')

async function load () {
  try {
    m.value = (await hcApi.get(`/matches/${route.params.id}`)).data
  } catch (e) {
    error.value = errorMessage(e)
  }
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
  const termin = m.value.scheduledAt ? `\nDer Termin am ${fmt(m.value.scheduledAt, true)} entfällt.` : ''
  const ok = await confirmAction({
    title: `${m.value.slotCode} jetzt starten?`,
    text: `Der Bot schickt beiden sofort die Draft-Links.${termin}`,
    confirmText: 'Starten',
  })
  if (!ok) return
  const res = await run('start', () => hcApi.post(`/matches/${m.value.id}/start`))
  if (res) info.value = 'Gestartet.'
}

function classify (d, kind) {
  if (!kind) return
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
  await run('result', () => hcApi.post(`/matches/${m.value.id}/result`, correction))
}

async function send () {
  const res = await run('message', () => hcApi.post(`/matches/${m.value.id}/message`, compose))
  if (!res) return
  const { delivered, unreachable } = res.data
  // Blockierte DM ist kein Fehlschlag, aber die Orga muss es wissen.
  info.value = unreachable ? `Zugestellt: ${delivered}. Nicht erreichbar: ${unreachable}.` : `Nachricht zugestellt (${delivered}).`
  compose.text = ''
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
.hc-bubble.discarded { opacity: 0.55; }
.hc-text { white-space: pre-wrap; word-break: break-word; }
</style>
