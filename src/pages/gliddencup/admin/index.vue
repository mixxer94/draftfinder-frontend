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
import { errorMessage, hcApi, isAdmin } from '@/services/hcApi'
import MatchTable from '@/components/gliddencup/MatchTable.vue'

const data = ref(null)
const error = ref('')
const loading = ref(false)

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
