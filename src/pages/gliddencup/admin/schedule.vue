<template>
  <PageHeader title="Termine" text="Alle vereinbarten Termine. Der Export enthält nur Pseudonyme.">
    <v-btn variant="tonal" prepend-icon="mdi-download" href="/api/hc/schedule.csv">CSV-Export</v-btn>
  </PageHeader>

  <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
  <p v-if="data && !data.matches.length" class="text-medium-emphasis">Noch keine Termine. Ein Termin steht, sobald sich beide Spieler eines freigegebenen Matches einigen oder es sofort gestartet wird.</p>
  <MatchTable v-else-if="data" :matches="data.matches" :timezone="data.tournament.timezone" :columns="['scheduledAt', 'state']" />
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { errorMessage, hcApi } from '@/services/hcApi'
import MatchTable from '@/components/gliddencup/MatchTable.vue'
import PageHeader from '@/components/gliddencup/PageHeader.vue'

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
