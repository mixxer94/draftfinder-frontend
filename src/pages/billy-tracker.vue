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
    <v-row dense>
      <v-col v-for="stat in stats" :key="stat.label" cols="6" sm="4" md="3">
        <v-card variant="tonal" :color="stat.color" :title="stat.label">
          <v-card-text class="py-3">
            <div class="text-h6">{{ stat.value }}</div>
            <div class="text-caption">{{ stat.hint }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <p class="text-caption text-medium-emphasis mb-4">
      Twitch entfernt VODs nach {{ retentionDays }} Tagen von selbst. Diese zählen als
      <em>abgelaufen</em> und bleiben aus der Löschquote heraus — die zeigt nur, was Billy
      selbst gelöscht hat, gemessen an den Aufzeichnungen, über die sich das sagen lässt.
      Wie viele Streams unterm Strich nicht mehr anzusehen sind, steht daneben unter
      <em>Kein VOD verfügbar</em> — dort zählt jeder Grund mit.
    </p>

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
      <template #item.match="{ item }">
        <MatchChip :stream="item" />
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
              <MatchChip :stream="stream" class="mt-2" />
            </div>
            <VodChip :stream="stream" />
          </div>
        </v-card-text>
      </v-card>
      <div v-if="!visibleStreams.length" class="text-caption text-center py-6">
        Noch keine Streams erfasst
      </div>
    </div>

    <!-- Die Partie, bei der der Stream endete, samt Chatverlauf -->
    <v-dialog v-model="matchDialogOpen" max-width="760" scrollable>
      <v-card>
        <v-card-title class="text-subtitle-1">
          {{ match?.mapName || 'Letzte Partie' }}
          <span class="text-caption text-medium-emphasis ml-2">{{ match?.label }}</span>
        </v-card-title>

        <v-card-text>
          <v-progress-linear v-if="chatLoading" indeterminate class="mb-4" />
          <v-alert v-if="chatError" type="error" variant="tonal" density="compact">
            {{ chatError }}
          </v-alert>

          <template v-if="match">
            <div class="text-caption text-medium-emphasis mb-3">
              {{ formatDateTime(match.startedAt) }} · {{ formatSeconds(match.durationSeconds) }}
            </div>

            <div class="d-flex flex-wrap ga-2 mb-3">
              <v-chip
                v-for="player in match.players"
                :key="player.profileId"
                size="small"
                variant="tonal"
                :color="player.outcome === 1 ? 'success' : 'error'"
                :href="`https://www.aoe2companion.com/players/${player.profileId}`"
                target="_blank"
                rel="noopener"
              >
                {{ player.alias || player.profileId }}
                <span class="text-caption ml-1">{{ player.oldRating }} → {{ player.newRating }}</span>
              </v-chip>
            </div>

            <div class="d-flex flex-wrap ga-2 mb-4">
              <v-chip size="small" variant="tonal" :href="companionUrl" target="_blank" rel="noopener">
                <v-icon start size="small">mdi-open-in-new</v-icon>
                Partie auf aoe2companion
              </v-chip>
              <v-chip size="small" variant="tonal" :href="replayUrl" target="_blank" rel="noopener">
                <v-icon start size="small">mdi-download</v-icon>
                Replay herunterladen
              </v-chip>
            </div>

            <v-divider class="mb-3" />

            <div v-if="!match.chat.length" class="text-caption text-medium-emphasis">
              In dieser Partie wurde nichts geschrieben.
            </div>
            <div v-for="(line, index) in match.chat" :key="index" class="mb-2">
              <v-chip
                size="x-small"
                variant="tonal"
                :color="line.channel === 1 ? 'info' : undefined"
                class="mr-2"
              >
                {{ line.channel === 1 ? 'Team' : 'Alle' }}
              </v-chip>
              <span class="font-weight-medium">{{ line.name || `Spieler ${line.player}` }}:</span>
              <span class="ml-1">{{ line.message }}</span>
            </div>

            <p class="text-caption text-medium-emphasis mt-4 mb-0">
              Aufgezeichnet aus Sicht von
              {{ replayPlayer?.alias || match.replayProfileId }} — nur dessen Teamchat ist zu sehen.
            </p>
          </template>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="matchDialogOpen = false">Schließen</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
const retentionDays = ref(7)
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
  { title: 'Letzte Partie', key: 'match', width: 200, sortable: false },
  { title: 'VOD', key: 'vodStatus', width: 190, sortable: false }
]

const stats = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { label: 'Streams', value: s.total, color: 'primary' },
    { label: 'Stunden gesendet', value: s.totalHours, color: 'primary' },
    { label: 'VOD vorhanden', value: s.available, color: 'success' },
    {
      label: 'Von Billy gelöscht',
      value: s.deleted,
      color: 'error',
      hint: `Vor Ablauf der ${retentionDays.value} Tage verschwunden`
    },
    {
      label: 'Automatisch abgelaufen',
      value: s.expired,
      color: 'warning',
      hint: `Von Twitch nach ${retentionDays.value} Tagen entfernt - zählt nicht als Löschung`
    },
    { label: 'Nie ein VOD', value: s.never, color: 'grey', hint: 'Es ist nie eine Aufzeichnung erschienen' },
    {
      label: 'Löschquote',
      value: `${Math.round(s.deletionRate * 100)} %`,
      color: 'error',
      hint: 'von Billy gelöscht (ohne abgelaufene VODs)'
    },
    {
      label: 'Kein VOD verfügbar',
      value: `${Math.round(s.missingRate * 100)} %`,
      color: 'error',
      hint: `${s.withoutVod} von ${s.total} gelöscht, abgelaufen oder nie aufgezeichnet`
    }
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
    prependIcon: config.icon,
    href: link || undefined,
    target: link ? '_blank' : undefined,
    rel: link ? 'noopener' : undefined,
    title: config.title
  }, () => config.text)
}
VodChip.props = ['stream']

function vodChipConfig (stream) {
  if (stream.isLive) return { color: 'red', icon: 'mdi-record', text: 'läuft gerade' }
  if (stream.expired) {
    return {
      color: 'warning',
      icon: 'mdi-timer-sand-complete',
      text: 'abgelaufen',
      title: `Hat die ${retentionDays.value} Tage überstanden und wurde dann von Twitch automatisch entfernt - keine Löschung durch Billy`
    }
  }
  switch (stream.vodStatus) {
    case 'available':
      return { color: 'success', icon: 'mdi-play-circle', text: 'verfügbar' }
    case 'deleted':
      return {
        color: 'error',
        icon: 'mdi-delete',
        text: 'gelöscht',
        title: `Vor Ablauf der Frist verschwunden, bemerkt am ${formatDateTime(stream.vodDeletedAt)}`
      }
    case 'never':
      return { color: 'grey', icon: 'mdi-cancel', text: 'nie erschienen', title: 'Es wurde nie ein VOD veröffentlicht' }
    default:
      return { color: 'blue-grey', icon: 'mdi-progress-clock', text: 'wird geprüft', title: 'Stream gerade beendet, VOD noch nicht aufgetaucht' }
  }
}

/**
 * Die Partie, bei der der Stream endete. Ist eine erfasst, oeffnet der Chip
 * den Chatverlauf; sonst sagt er, warum keine da ist.
 */
const MatchChip = (props) => {
  const s = props.stream
  const config = matchChipConfig(s)
  if (!config) return h('span', { class: 'text-medium-emphasis' }, '—')

  return h(VChip, {
    size: 'small',
    color: config.color,
    variant: config.variant || 'flat',
    prependIcon: config.icon,
    title: config.title,
    style: config.clickable ? 'cursor: pointer' : undefined,
    onClick: config.clickable ? () => openMatch(s) : undefined
  }, () => config.text)
}
MatchChip.props = ['stream']

function matchChipConfig (stream) {
  if (stream.match) {
    const won = stream.match.outcome === 1
    return {
      color: won ? 'success' : 'error',
      icon: won ? 'mdi-trophy-variant' : 'mdi-skull-outline',
      text: stream.match.mapName || 'Partie',
      title: `${stream.match.label || 'Partie'} - ${won ? 'gewonnen' : 'verloren'}, `
        + `${stream.match.chatCount} Chatnachrichten`,
      clickable: true
    }
  }
  switch (stream.matchStatus) {
    case 'pending':
      return { color: 'blue-grey', variant: 'tonal', icon: 'mdi-magnify', text: 'wird gesucht' }
    case 'no_match':
      return {
        color: 'grey',
        variant: 'tonal',
        icon: 'mdi-sleep',
        text: 'nicht gefunden',
        title: 'Kein passendes Match ermittelt'
      }
    case 'no_replay':
      return {
        color: 'grey',
        variant: 'tonal',
        icon: 'mdi-file-hidden',
        text: 'kein Replay',
        title: 'Partie gefunden, aber niemand hat sein Replay hochgeladen'
      }
    case 'failed':
      return {
        color: 'grey',
        variant: 'tonal',
        icon: 'mdi-alert-outline',
        text: 'fehlgeschlagen',
        title: 'Die Suche nach der Partie ist wiederholt gescheitert'
      }
    default:
      return null
  }
}

const matchDialogOpen = ref(false)
const match = ref(null)
const chatLoading = ref(false)
const chatError = ref('')

const companionUrl = computed(() =>
  match.value ? `https://www.aoe2companion.com/matches/${match.value.matchId}` : undefined
)
const replayUrl = computed(() =>
  match.value
    ? 'https://api.ageofempires.com/api/GameStats/AgeII/GetMatchReplay/'
      + `?matchId=${match.value.matchId}&profileId=${match.value.replayProfileId}`
    : undefined
)
const replayPlayer = computed(() =>
  match.value?.players?.find(p => p.profileId === match.value.replayProfileId)
)

/**
 * Der Chatverlauf haengt nicht an der Streamliste, sondern wird erst beim
 * Oeffnen geholt - sonst traegt die Liste die Chats aller Streams mit.
 */
async function openMatch (stream) {
  match.value = null
  chatError.value = ''
  chatLoading.value = true
  matchDialogOpen.value = true
  try {
    const { data } = await axios.get(`/api/billy/streams/${stream.streamId}/chat`)
    match.value = data
  } catch (e) {
    chatError.value = 'Der Chatverlauf konnte nicht geladen werden.'
    console.error('Error fetching billy chat:', e)
  } finally {
    chatLoading.value = false
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

function formatSeconds (seconds) {
  if (seconds === null || seconds === undefined) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

/**
 * Laufende Streams werden bis jetzt gerechnet, damit die Dauer mitwaechst.
 */
function formatDuration (stream) {
  return formatSeconds(stream.isLive
    ? Math.round((Date.now() - new Date(stream.startedAt)) / 1000)
    : stream.durationSeconds)
}

async function load () {
  loading.value = true
  try {
    const { data } = await axios.get('/api/billy/streams')
    streams.value = data.streams
    summary.value = data.summary
    channel.value = data.channel
    retentionDays.value = data.vodRetentionDays ?? retentionDays.value
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
