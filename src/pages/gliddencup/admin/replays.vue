<template>
  <div class="d-flex align-center flex-wrap ga-2 mb-2">
    <h2 class="text-h6">Replay-Packs</h2>
    <v-spacer />
    <v-btn variant="text" size="small" :loading="loading" @click="load">
      <v-icon start>mdi-refresh</v-icon>Aktualisieren
    </v-btn>
  </div>
  <p class="text-medium-emphasis mb-4">
    Alle Packs dieses Turniers, ob per DM eingeschickt oder hier hochgeladen. Hochladen lässt sich
    im Match-Detail. Die Packs enthalten die Spielernamen aus dem Spiel — nicht weitergeben.
  </p>

  <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

  <v-alert v-if="data" :type="mirrorAlert.type" variant="tonal" density="compact" class="mb-4">
    <strong>Backup (GitHub):</strong> {{ mirrorAlert.text }}
  </v-alert>

  <p v-if="data && !data.packs.length" class="text-medium-emphasis">Noch keine Replay-Packs.</p>
  <v-table v-else-if="data" density="compact">
    <thead>
      <tr><th>Slot</th><th>Runde</th><th>Paarung</th><th>Ergebnis</th><th>Datei</th><th>Größe</th><th>Quelle</th><th>Eingang</th></tr>
    </thead>
    <tbody>
      <tr v-for="p in data.packs" :key="p.id">
        <td class="font-weight-medium text-no-wrap">
          <router-link :to="`/gliddencup/admin/matches/${p.id}`">{{ p.slotCode }}</router-link>
        </td>
        <td>{{ p.roundLabel }}</td>
        <td>{{ p.a }} vs. {{ p.b }}</td>
        <td>{{ p.score ?? '—' }}</td>
        <td>
          <a :href="`/api/hc/matches/${p.id}/replay`"><v-icon size="small" start>mdi-download</v-icon>{{ p.filename }}</a>
        </td>
        <td class="text-no-wrap">{{ (p.bytes / 1048576).toFixed(2) }} MB</td>
        <td>{{ p.source === 'DM' ? 'DM' : 'Panel' }}</td>
        <td class="text-no-wrap text-medium-emphasis">{{ formatDate(p.uploadedAt, data.tournament.timezone) }}</td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { errorMessage, formatDate, hcApi } from '@/services/hcApi'

const data = ref(null)
const error = ref('')
const loading = ref(false)

const mirrorAlert = computed(() => {
  const mirror = data.value?.mirror
  if (!mirror) return { type: 'warning', text: 'nicht eingerichtet — die Packs liegen nur auf dem Server.' }
  const s = mirror.status
  if (!s) return { type: 'info', text: 'eingerichtet, noch kein Abgleich gelaufen.' }
  const when = formatDate(s.at, data.value.tournament.timezone)
  return s.ok
    ? { type: 'success', text: `zuletzt gespiegelt ${when}${s.head ? ` (Commit ${s.head})` : ''}.` }
    : { type: 'error', text: `letzter Abgleich ${when} fehlgeschlagen — wird stündlich und beim nächsten Upload wiederholt. ${s.message}` }
})

async function load () {
  loading.value = true
  try {
    data.value = (await hcApi.get('/replays')).data
    error.value = ''
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
