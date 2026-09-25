<template>
  <div class="d-flex align-center flex-wrap ga-2 mb-2">
    <h2 class="text-h6">Terminübersicht</h2>
    <v-spacer />
    <v-btn variant="tonal" href="/api/hc/schedule.csv">
      <v-icon start>mdi-download</v-icon>CSV-Export
    </v-btn>
  </div>
  <p class="text-medium-emphasis mb-4">Der Export enthält ausschließlich Pseudonyme.</p>

  <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
  <p v-if="data && !data.matches.length" class="text-medium-emphasis">Noch keine terminierten Matches.</p>
  <MatchTable v-else-if="data" :matches="data.matches" :timezone="data.tournament.timezone" :columns="['scheduledAt', 'state']" />
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { errorMessage, hcApi } from '@/services/hcApi'
import MatchTable from '@/components/hidden-cup/MatchTable.vue'

const data = ref(null)
const error = ref('')

onMounted(async () => {
  try {
    data.value = (await hcApi.get('/schedule')).data
  } catch (e) {
    error.value = errorMessage(e)
  }
})
</script>
