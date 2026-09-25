<template>
  <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

  <template v-if="data && !data.tournament">
    <h2 class="text-h6 mb-2">Noch kein Turnier angelegt</h2>
    <p>Das Turnier wird einmalig auf dem Server angelegt:</p>
    <pre class="pa-3 my-2 bg-surface rounded">npm run seed -- --name "Hidden Cup #4" --slug hc4 --format RO16_DE --bo 3</pre>
    <p class="text-medium-emphasis">
      Danach: Runden konfigurieren, Anmeldungen freigeben, Pseudonyme vergeben, Auslosung eintragen.
    </p>
  </template>

  <template v-else-if="data">
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <h2 class="text-h6">{{ t.name }}</h2>
      <v-chip size="small" :color="phase.color" variant="flat">{{ phase.text }}</v-chip>
      <span class="text-medium-emphasis">· {{ t.format }}</span>
      <v-spacer />
      <v-btn variant="text" size="small" :loading="loading" @click="load">
        <v-icon start>mdi-refresh</v-icon>Aktualisieren
      </v-btn>
    </div>

    <p class="text-medium-emphasis mb-4">
      Anmeldung <strong>{{ s.anmeldungOffen ? 'offen' : 'geschlossen' }}</strong> ·
      <strong>{{ s.angemeldet }} / {{ s.plaetze }}</strong> Plätze belegt
      <template v-if="s.fehlend > 0">— es fehlen noch <strong>{{ s.fehlend }}</strong></template>
      <template v-else-if="s.fehlend < 0">— <strong>{{ -s.fehlend }} zu viel</strong> (überbucht)</template>
      <template v-else>— vollständig</template>
      · <strong>{{ s.verifiziert }}</strong> startklar
      <template v-if="s.matchesGewertet > 0 || s.phase === 'RUNNING'">
        · <strong>{{ s.matchesGewertet }} / {{ s.matchesGesamt }}</strong> Matches gewertet
      </template>
    </p>

    <!-- Handlungsbedarf zuerst: dort kommt das System ohne die Orga nicht weiter. -->
    <v-row dense class="mb-4">
      <v-col v-for="tile in tiles" :key="tile.label" cols="6" sm="4" md="3">
        <v-card variant="tonal" :color="tile.color" :to="tile.to">
          <v-card-text class="py-3">
            <div class="text-caption">{{ tile.label }}</div>
            <div class="text-h5">{{ tile.value }}</div>
            <div v-if="tile.hint" class="text-caption">{{ tile.hint }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-alert v-if="info" type="success" variant="tonal" closable class="mb-4" @click:close="info = ''">{{ info }}</v-alert>

    <template v-if="data.running.length">
      <h3 class="text-subtitle-1 mt-4 mb-2">Laufende Matches</h3>
      <v-table density="compact">
        <thead>
          <tr><th>Slot</th><th>Runde</th><th>Paarung</th><th>Termin</th><th>Status</th><th v-if="admin" /></tr>
        </thead>
        <tbody>
          <tr v-for="m in data.running" :key="m.id">
            <td class="font-weight-medium text-no-wrap">{{ m.slotCode }}</td>
            <td>{{ m.roundLabel }}</td>
            <td>{{ m.a }} vs. {{ m.b }}</td>
            <td class="text-no-wrap">{{ m.scheduledAt ? formatDate(m.scheduledAt, t.timezone, true) : '—' }}</td>
            <td><MatchStateChip :match="m" /></td>
            <td v-if="admin" class="text-no-wrap">
              <v-btn v-if="m.startable" size="small" color="secondary" variant="tonal" :loading="starting === m.id" @click="start(m)">
                <v-icon start>mdi-play</v-icon>Jetzt starten
              </v-btn>
              <v-btn size="small" variant="text" :to="`/gliddencup/admin/matches/${m.id}`">Detail</v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </template>

    <template v-for="section in sections" :key="section.title">
      <template v-if="section.items.length">
        <h3 class="text-subtitle-1 mt-4 mb-2">{{ section.title }}</h3>
        <MatchTable :matches="section.items" :timezone="t.timezone" :columns="section.columns" />
      </template>
    </template>

    <template v-if="data.publicPath">
      <h3 class="text-subtitle-1 mt-6 mb-1">Öffentliches Bracket</h3>
      <router-link :to="data.publicPath" target="_blank">{{ publicUrl }}</router-link>
      <span class="text-medium-emphasis"> — zeigt nur Pseudonyme und Ergebnisse</span>
    </template>
  </template>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { errorMessage, formatDate, hcApi, isAdmin } from '@/services/hcApi'
import MatchTable from '@/components/gliddencup/MatchTable.vue'
import MatchStateChip from '@/components/gliddencup/MatchStateChip.vue'

const data = ref(null)
const error = ref('')
const loading = ref(false)
const info = ref('')
const starting = ref('')
const admin = computed(() => isAdmin())

/** Sofortstart: Termin = jetzt, beide bekommen sofort die Draft-Presets. */
async function start (m) {
  const termin = m.scheduledAt ? ` Der vereinbarte Termin (${formatDate(m.scheduledAt, t.value.timezone, true)}) entfällt.` : ''
  if (!confirm(`${m.slotCode} (${m.a} vs. ${m.b}) jetzt starten?\n\nBeide bekommen sofort die Draft-Presets.${termin}`)) return
  starting.value = m.id
  error.value = ''
  try {
    await hcApi.post(`/matches/${m.id}/start`)
    info.value = `${m.slotCode} gestartet — die Presets sind unterwegs.`
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    starting.value = ''
  }
}

const t = computed(() => data.value?.tournament)
const s = computed(() => data.value?.stand)
const publicUrl = computed(() => `${window.location.origin}${data.value?.publicPath}`)

const PHASES = {
  SETUP: { text: 'In Planung', color: 'warning' },
  DRAWN: { text: 'Ausgelost', color: 'success' },
  RUNNING: { text: 'Läuft', color: 'success' },
  FINISHED: { text: 'Abgeschlossen', color: 'grey' },
}
const phase = computed(() => PHASES[t.value?.state] ?? { text: t.value?.state, color: 'grey' })

const tiles = computed(() => {
  const c = data.value.counts
  const admin = isAdmin()
  const warn = (n, color = 'warning') => (n > 0 ? color : undefined)
  return [
    { label: 'Bereit zur Aktivierung', value: c.ready, color: warn(c.ready), to: admin ? '/gliddencup/admin/activation' : undefined },
    { label: 'Replay-Pack fehlt', value: c.awaitingReplay, color: warn(c.awaitingReplay), hint: c.awaitingReplay ? 'blockiert Folgematches' : '' },
    { label: 'Blockiert (DM)', value: c.blocked, color: warn(c.blocked, 'error'), hint: c.blocked ? 'Timer pausiert' : '' },
    { label: 'Eskaliert', value: c.escalated, color: warn(c.escalated, 'error') },
    { label: 'In Verhandlung', value: c.negotiating },
    { label: 'Terminiert', value: c.scheduled, to: '/gliddencup/admin/schedule' },
    { label: 'Ohne Pseudonym', value: c.pendingPseudonym, color: warn(c.pendingPseudonym), to: admin ? '/gliddencup/admin/registrations' : undefined },
    { label: 'DM unerreichbar', value: c.dmBlocked, color: warn(c.dmBlocked, 'error') },
  ]
})

const sections = computed(() => [
  { title: 'Blockierte Matches — Eingriff nötig', items: data.value.blocked, columns: ['blocked'] },
  { title: 'Eskaliert', items: data.value.escalated, columns: ['state'] },
  { title: 'Replay-Pack ausstehend', items: data.value.awaitingReplay, columns: ['score'] },
])

async function load () {
  loading.value = true
  try {
    data.value = (await hcApi.get('/dashboard')).data
    error.value = ''
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
