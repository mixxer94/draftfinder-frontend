<template>
  <v-app-bar :elevation="2" density="compact" color="app-bar">
    <v-app-bar-title>{{ vm?.tournamentName ?? 'Hidden Cup' }}</v-app-bar-title>
    <v-spacer />
    <v-btn variant="outlined" color="secondary" class="mr-2" to="/">Zum Draft Finder</v-btn>
  </v-app-bar>

  <v-container fluid class="pa-4">
    <v-alert v-if="error" type="info" variant="tonal">{{ error }}</v-alert>
    <div v-else-if="!vm" class="d-flex justify-center pa-8"><v-progress-circular indeterminate /></div>

    <template v-else>
      <p class="text-medium-emphasis mb-4">
        {{ vm.format }} · Alle Teilnehmer treten unter Pseudonym an.
      </p>
      <div v-for="side in sides" :key="side.bracket" class="mb-6">
        <h2 v-if="sides.length > 1" class="text-h6 mb-2">{{ side.title }}</h2>
        <div class="hc-rounds">
          <div v-for="round in side.rounds" :key="round.label + round.index" class="hc-round">
            <div class="text-subtitle-2 mb-2">{{ round.label }}</div>
            <v-card v-for="m in round.matches" :key="m.slotCode" variant="tonal" class="mb-2" density="compact">
              <v-card-text class="py-2">
                <div :class="{ 'font-weight-bold': m.winner === 'A' }">{{ m.a ?? '—' }}</div>
                <div :class="{ 'font-weight-bold': m.winner === 'B' }">{{ m.b ?? '—' }}</div>
                <div class="text-caption text-medium-emphasis">
                  <template v-if="m.score">{{ m.score }}</template>
                  <template v-else-if="m.scheduledAt">{{ m.scheduledAt }}</template>
                  <template v-else>&nbsp;</template>
                </div>
              </v-card-text>
            </v-card>
          </div>
        </div>
      </div>
    </template>
  </v-container>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const vm = ref(null)
const error = ref('')
let timer = null

const TITLES = { MAIN: 'Bracket', WINNERS: 'Winners', LOSERS: 'Losers', GRAND_FINAL: 'Grand Final' }

const sides = computed(() => {
  const map = new Map()
  vm.value.rounds.forEach((r, index) => {
    if (!map.has(r.bracket)) map.set(r.bracket, { bracket: r.bracket, title: TITLES[r.bracket] ?? r.bracket, rounds: [] })
    map.get(r.bracket).rounds.push({ ...r, index })
  })
  return [...map.values()]
})

async function load () {
  try {
    vm.value = (await axios.get(`/api/hc/public/${encodeURIComponent(route.params.slug)}`)).data
    document.title = vm.value.tournamentName
  } catch (e) {
    error.value = e.response?.status === 404 ? 'Turnier nicht gefunden.' : 'Das Bracket ist gerade nicht erreichbar.'
  }
}

onMounted(() => {
  load()
  timer = setInterval(load, 60_000)
})
onUnmounted(() => {
  clearInterval(timer)
  document.title = 'Draft Finder'
})
</script>

<style scoped>
.hc-rounds { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px; }
.hc-round { min-width: 180px; flex: 0 0 auto; }
</style>
