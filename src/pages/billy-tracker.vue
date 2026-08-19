<template>
  <AppBar />

  <v-container fluid class="pa-4">
    <div class="d-flex align-center flex-wrap ga-2 mb-4">
      <h2 class="text-h6">Billys Streams</h2>
      <v-chip size="small" variant="tonal" :href="channelUrl" target="_blank" rel="noopener">
        <v-icon start size="small">mdi-twitch</v-icon>
        {{ channel }}
      </v-chip>
      <v-chip v-if="liveStream" size="small" color="red" variant="flat">
        <v-icon start size="small">mdi-record</v-icon>
        Sendet gerade
      </v-chip>
      <v-spacer />
      <v-btn variant="text" size="small" :loading="loading" @click="load">
        <v-icon start>mdi-refresh</v-icon>
        Aktualisieren
      </v-btn>
    </div>

    <!-- Kennzahlen -->
    <v-row dense class="mb-2">
      <v-col v-for="stat in stats" :key="stat.label" cols="6" sm="4" md="2">
        <v-card variant="tonal" :color="stat.color">
          <v-card-text class="py-3">
            <div class="text-h6">{{ stat.value }}</div>
            <div class="text-caption">{{ stat.label }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <div class="d-flex align-center flex-wrap ga-4 mb-2">
      <v-switch
        v-model="onlyMissing"
        color="error"
        density="compact"
        hide-details
        label="Nur Streams ohne VOD"
      />
      <span class="text-caption text-medium-emphasis">
        {{ visibleStreams.length }} von {{ streams.length }} Streams
      </span>
    </div>

    <!-- Desktop: Tabelle -->
    <v-data-table
      v-if="!mobile"
      :headers="headers"
      :items="visibleStreams"
      :loading="loading"
      :items-per-page="25"
      density="comfortable"
      item-value="streamId"
      no-data-text="Noch keine Streams erfasst"
    >
      <template #item.startedAt="{ item }">
        {{ formatDateTime(item.startedAt) }}
        <v-icon v-if="item.approximate" size="x-small" class="ml-1" :title="approximateHint">
          mdi-information-outline
        </v-icon>
      </template>
      <template #item.title="{ item }">
        <span class="text-truncate d-inline-block" style="max-width: 340px">{{ item.title || '—' }}</span>
      </template>
      <template #item.durationSeconds="{ item }">
        {{ formatDuration(item) }}
      </template>
      <template #item.vodStatus="{ item }">
        <VodChip :stream="item" />
      </template>
    </v-data-table>

    <!-- Mobil: Karten -->
    <div v-else>
      <v-card v-for="stream in visibleStreams" :key="stream.streamId" class="mb-2" variant="tonal">
        <v-card-text class="py-3">
          <div class="d-flex justify-space-between align-start ga-2">
            <div>
              <div class="text-body-2 font-weight-medium">{{ stream.title || '—' }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ formatDateTime(stream.startedAt) }} · {{ formatDuration(stream) }}
              </div>
            </div>
            <VodChip :stream="stream" />
          </div>
        </v-card-text>
      </v-card>
      <div v-if="!visibleStreams.length" class="text-caption text-center py-6">
        Noch keine Streams erfasst
      </div>
    </div>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, h } from 'vue'
import { useDisplay } from 'vuetify'
import { VChip } from 'vuetify/components'
import axios from 'axios'
import AppBar from '../components/AppBar.vue'

const { mobile } = useDisplay()

const channel = ref('aoe2_billybadbeat')
const streams = ref([])
const summary = ref(null)
const loading = ref(false)
const error = ref('')
const onlyMissing = ref(false)

const channelUrl = computed(() => `https://www.twitch.tv/${channel.value}`)
const liveStream = computed(() => streams.value.find(s => s.isLive))

const approximateHint = 'Aus dem VOD abgeleitet - dieser Stream lief vor dem Start des Trackers'

const headers = [
  { title: 'Start', key: 'startedAt', width: 190 },
  { title: 'Titel', key: 'title' },
  { title: 'Spiel', key: 'game', width: 170 },
  { title: 'Dauer', key: 'durationSeconds', width: 110 },
  { title: 'VOD', key: 'vodStatus', width: 190, sortable: false }
]

const stats = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { label: 'Streams', value: s.total, color: 'primary' },
    { label: 'Stunden gesendet', value: s.totalHours, color: 'primary' },
    { label: 'VOD vorhanden', value: s.available, color: 'success' },
    { label: 'VOD gelöscht', value: s.deleted, color: 'error' },
    { label: 'Nie ein VOD', value: s.never, color: 'warning' },
    { label: 'Löschquote', value: `${Math.round(s.deletionRate * 100)} %`, color: 'error' }
  ]
})

const visibleStreams = computed(() =>
  onlyMissing.value
    ? streams.value.filter(s => s.vodStatus === 'deleted' || s.vodStatus === 'never')
    : streams.value
)

/**
 * Der VOD-Status als Chip; bei vorhandenem VOD verlinkt er auf Twitch.
 * Als Renderfunktion, weil er in Tabelle und Kartenansicht identisch ist.
 */
const VodChip = (props) => {
  const s = props.stream
  const config = vodChipConfig(s)
  // Nur ein noch abrufbares VOD wird verlinkt - bei geloeschten zeigt die
  // gespeicherte URL ins Leere
  const link = s.vodStatus === 'available' ? s.vodUrl : null
  return h(VChip, {
    size: 'small',
    color: config.color,
    variant: 'flat',
    href: link || undefined,
    target: link ? '_blank' : undefined,
    rel: link ? 'noopener' : undefined,
    title: config.title
  }, () => config.text)
}
VodChip.props = ['stream']

function vodChipConfig (stream) {
  if (stream.isLive) return { color: 'red', text: 'läuft gerade' }
  if (stream.expired) {
    return {
      color: 'warning',
      text: 'abgelaufen',
      title: 'Erst nach Twitchs Aufbewahrungsfrist verschwunden - vermutlich automatisch gelöscht'
    }
  }
  switch (stream.vodStatus) {
    case 'available':
      return { color: 'success', text: 'verfügbar' }
    case 'deleted':
      return {
        color: 'error',
        text: 'gelöscht',
        title: `Bemerkt am ${formatDateTime(stream.vodDeletedAt)}`
      }
    case 'never':
      return { color: 'grey', text: 'nie erschienen', title: 'Es wurde nie ein VOD veröffentlicht' }
    default:
      return { color: 'blue-grey', text: 'wird geprüft', title: 'Stream gerade beendet, VOD noch nicht aufgetaucht' }
  }
}

function formatDateTime (value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Laufende Streams werden bis jetzt gerechnet, damit die Dauer mitwaechst.
 */
function formatDuration (stream) {
  const seconds = stream.isLive
    ? Math.round((Date.now() - new Date(stream.startedAt)) / 1000)
    : stream.durationSeconds

  if (seconds === null || seconds === undefined) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

async function load () {
  loading.value = true
  try {
    const { data } = await axios.get('/api/billy/streams')
    streams.value = data.streams
    summary.value = data.summary
    channel.value = data.channel
    error.value = ''
  } catch (e) {
    error.value = 'Die Streamliste konnte nicht geladen werden.'
    console.error('Error fetching billy streams:', e)
  } finally {
    loading.value = false
  }
}

let refreshTimer = null
onMounted(() => {
  load()
  refreshTimer = setInterval(load, 60000)
})
onUnmounted(() => clearInterval(refreshTimer))
</script>
