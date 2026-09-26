<template>
  <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

  <template v-if="data && !data.tournament">
    <PageHeader title="Noch kein Turnier" text="Das Turnier wird einmalig auf dem Server angelegt." />
    <pre class="pa-3 bg-surface rounded">npm run seed -- --name "Gliddencup #4" --slug hc4 --format RO16_DE --bo 3</pre>
  </template>

  <template v-else-if="data">
    <PageHeader :title="t.name">
      <template #meta>
        <v-chip size="small" variant="tonal" :color="phase.color">{{ phase.text }}</v-chip>
      </template>
      <v-btn variant="text" :loading="loading" prepend-icon="mdi-refresh" @click="load">Aktualisieren</v-btn>
    </PageHeader>

    <p class="mb-6">
      {{ t.format }} · Anmeldung {{ s.anmeldungOffen ? 'offen' : 'geschlossen' }} ·
      {{ s.angemeldet }}/{{ s.plaetze }} Plätze<template v-if="s.fehlend > 0"> ({{ s.fehlend }} frei)</template><template v-else-if="s.fehlend < 0"> ({{ -s.fehlend }} überbucht)</template> ·
      {{ s.verifiziert }} startklar ·
      {{ s.matchesGewertet }}/{{ s.matchesGesamt }} Matches gewertet
    </p>

    <v-alert v-if="info" type="success" variant="tonal" closable class="mb-4" @click:close="info = ''">{{ info }}</v-alert>

    <!-- Nur was ohne die Turnierleitung nicht weitergeht. -->
    <section class="mb-8">
      <h2 class="hc-h2">Offene Punkte</h2>
      <p v-if="!todos.length" class="text-medium-emphasis">Nichts offen.</p>
      <v-list v-else density="compact" class="hc-todos py-0" bg-color="transparent">
        <v-list-item
          v-for="todo in todos"
          :key="todo.label"
          :to="todo.to"
          :base-color="todo.color"
          class="px-0"
        >
          <template #prepend>
            <span class="hc-count">{{ todo.value }}</span>
          </template>
          <v-list-item-title>{{ todo.label }}</v-list-item-title>
          <v-list-item-subtitle v-if="todo.hint">{{ todo.hint }}</v-list-item-subtitle>
          <template v-if="todo.to" #append><v-icon>mdi-chevron-right</v-icon></template>
        </v-list-item>
      </v-list>
    </section>

    <section v-if="data.running.length" class="mb-8">
      <h2 class="hc-h2">Laufende Matches</h2>
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
            <td v-if="admin" class="text-right text-no-wrap">
              <v-btn
                v-if="m.startable"
                size="small"
                color="secondary"
                variant="flat"
                prepend-icon="mdi-play"
                class="mr-2"
                :loading="starting === m.id"
                @click="start(m)"
              >
                Starten
              </v-btn>
              <DetailButton :id="m.id" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </section>

    <template v-for="section in sections" :key="section.title">
      <section v-if="section.items.length" class="mb-8">
        <h2 class="hc-h2">{{ section.title }}</h2>
        <MatchTable :matches="section.items" :timezone="t.timezone" :columns="section.columns" />
      </section>
    </template>

    <section v-if="data.publicPath">
      <h2 class="hc-h2">Öffentliches Bracket</h2>
      <router-link :to="data.publicPath" target="_blank">{{ publicUrl }}</router-link>
      <p class="text-medium-emphasis">Zeigt nur Pseudonyme und Ergebnisse.</p>
    </section>
  </template>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { errorMessage, formatDate, hcApi, isAdmin } from '@/services/hcApi'
import { confirmAction } from '@/services/confirm'
import PageHeader from '@/components/gliddencup/PageHeader.vue'
import MatchTable from '@/components/gliddencup/MatchTable.vue'
import MatchStateChip from '@/components/gliddencup/MatchStateChip.vue'
import DetailButton from '@/components/gliddencup/DetailButton.vue'

const data = ref(null)
const error = ref('')
const loading = ref(false)
const info = ref('')
const starting = ref('')
const admin = computed(() => isAdmin())

/** Sofortstart: Termin = jetzt, beide bekommen sofort die Draft-Presets. */
async function start (m) {
  const termin = m.scheduledAt ? `\nDer Termin am ${formatDate(m.scheduledAt, t.value.timezone, true)} entfällt.` : ''
  const ok = await confirmAction({
    title: `${m.slotCode} jetzt starten?`,
    text: `${m.a} vs. ${m.b}. Der Bot schickt beiden sofort die Draft-Links.${termin}`,
    confirmText: 'Starten',
  })
  if (!ok) return
  starting.value = m.id
  error.value = ''
  try {
    await hcApi.post(`/matches/${m.id}/start`)
    info.value = `${m.slotCode} gestartet.`
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
  DRAWN: { text: 'Ausgelost', color: 'secondary' },
  RUNNING: { text: 'Läuft', color: 'success' },
  FINISHED: { text: 'Abgeschlossen', color: undefined },
}
const phase = computed(() => PHASES[t.value?.state] ?? { text: t.value?.state })

const todos = computed(() => {
  const c = data.value.counts
  const link = to => (admin.value ? to : undefined)
  return [
    { label: 'Blockiert', value: c.blocked, color: 'error', hint: 'Timer pausiert' },
    { label: 'Eskaliert', value: c.escalated, color: 'error' },
    { label: 'Spieler per DM nicht erreichbar', value: c.dmBlocked, color: 'error', to: link('/gliddencup/admin/registrations') },
    { label: 'Bereit zur Freigabe', value: c.ready, color: 'warning', to: link('/gliddencup/admin/activation') },
    { label: 'Replay fehlt', value: c.awaitingReplay, color: 'warning', hint: 'Blockiert Folgematches' },
    { label: 'Ohne Pseudonym', value: c.pendingPseudonym, color: 'warning', to: link('/gliddencup/admin/registrations') },
  ].filter(todo => todo.value > 0)
})

const sections = computed(() => [
  { title: 'Blockiert', items: data.value.blocked, columns: ['blocked'] },
  { title: 'Eskaliert', items: data.value.escalated, columns: ['state'] },
  { title: 'Replay fehlt', items: data.value.awaitingReplay, columns: ['score'] },
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

<style scoped>
.hc-count {
  min-width: 2.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
