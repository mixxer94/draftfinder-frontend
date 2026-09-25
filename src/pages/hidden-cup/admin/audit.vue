<template>
  <h2 class="text-h6 mb-2">Audit-Log</h2>
  <p class="text-medium-emphasis mb-4">
    Unveränderlich. Enthält insbesondere jedes Aufdecken der Zuordnungstabelle und jede
    übersteuerte Sperre. Die letzten 500 Einträge.
  </p>
  <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

  <v-table density="compact">
    <thead><tr><th>Zeit</th><th>Akteur</th><th>Aktion</th><th>Ziel</th><th>Details</th></tr></thead>
    <tbody>
      <tr v-for="e in entries" :key="e.id">
        <td class="text-no-wrap text-medium-emphasis">{{ formatDate(e.at, tz) }}</td>
        <td class="text-caption">{{ e.actorId }}</td>
        <td>
          <v-chip size="x-small" variant="flat" :color="CRITICAL.includes(e.action) ? 'warning' : undefined">{{ e.action }}</v-chip>
        </td>
        <td class="text-caption text-medium-emphasis">{{ e.targetType }}/{{ e.targetId }}</td>
        <td class="text-caption text-medium-emphasis">{{ Object.keys(e.meta ?? {}).length ? JSON.stringify(e.meta) : '' }}</td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { errorMessage, formatDate, hcApi } from '@/services/hcApi'

const CRITICAL = ['IDENTITY_REVEALED', 'BLOCK_OVERRIDDEN', 'PLAYER_REMOVED', 'RESULT_CORRECTED']

const entries = ref([])
const tz = ref('Europe/Berlin')
const error = ref('')

onMounted(async () => {
  try {
    const data = (await hcApi.get('/audit')).data
    entries.value = data.entries
    tz.value = data.tournament.timezone
  } catch (e) {
    error.value = errorMessage(e)
  }
})
</script>
