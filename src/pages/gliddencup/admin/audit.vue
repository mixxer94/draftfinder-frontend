<template>
  <PageHeader title="Audit-Log" text="Die letzten 500 Einträge, unveränderlich. Heikle Aktionen tragen ein Warnsymbol." />
  <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

  <v-table density="compact">
    <thead><tr><th>Zeit</th><th>Akteur</th><th>Aktion</th><th>Ziel</th><th>Details</th></tr></thead>
    <tbody>
      <tr v-for="e in entries" :key="e.id">
        <td class="text-no-wrap text-medium-emphasis">{{ formatDate(e.at, tz) }}</td>
        <td>{{ e.actorId }}</td>
        <td>
          <v-chip
            size="small"
            variant="tonal"
            :color="CRITICAL.includes(e.action) ? 'warning' : undefined"
            :prepend-icon="CRITICAL.includes(e.action) ? 'mdi-alert-outline' : undefined"
          >
            <span v-if="CRITICAL.includes(e.action)" class="d-sr-only">Heikel: </span>{{ e.action }}
          </v-chip>
        </td>
        <td class="text-medium-emphasis">{{ e.targetType }}/{{ e.targetId }}</td>
        <td class="text-medium-emphasis text-body-2">{{ Object.keys(e.meta ?? {}).length ? JSON.stringify(e.meta) : '' }}</td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { errorMessage, formatDate, hcApi } from '@/services/hcApi'
import PageHeader from '@/components/gliddencup/PageHeader.vue'

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
