<template>
  <PageHeader title="Bracket" />
  <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

  <section v-for="side in sides" :key="side.bracket" class="mb-10">
    <h2 v-if="sides.length > 1" class="text-h6 mb-4">{{ side.title }}</h2>
    <div v-for="round in side.rounds" :key="round.key" class="mb-6">
      <h3 v-if="round.label !== side.title" class="hc-h2">{{ round.label }}</h3>
      <v-table density="compact" class="hc-bracket">
        <colgroup>
          <col class="hc-col-slot">
          <col>
          <col>
          <col class="hc-col-score">
          <col class="hc-col-state">
          <col v-if="admin" class="hc-col-action">
        </colgroup>
        <thead>
          <tr><th>Slot</th><th>Spieler A</th><th>Spieler B</th><th>Ergebnis</th><th>Status</th><th v-if="admin" /></tr>
        </thead>
        <tbody>
          <tr v-for="s in round.slots" :key="s.code">
            <td class="font-weight-medium">{{ s.code }}</td>
            <td :class="{ 'font-weight-bold': s.match?.winner === 'A' }">{{ s.a ?? '—' }}</td>
            <td :class="{ 'font-weight-bold': s.match?.winner === 'B' }">{{ s.b ?? '—' }}</td>
            <td>{{ s.match?.score ?? '' }}</td>
            <td><MatchStateChip :match="s.match ?? { state: s.a && s.b ? 'READY' : 'PENDING' }" /></td>
            <td v-if="admin" class="text-right">
              <DetailButton v-if="s.match" :id="s.match.id" :slot-code="s.code" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { BRACKETS, errorMessage, hcApi, isAdmin } from '@/services/hcApi'
import PageHeader from '@/components/gliddencup/PageHeader.vue'
import MatchStateChip from '@/components/gliddencup/MatchStateChip.vue'
import DetailButton from '@/components/gliddencup/DetailButton.vue'

const slots = ref([])
const error = ref('')
const admin = computed(() => isAdmin())

// Spielreihenfolge: erst Winner, dann Loser, zuletzt das Grand Final.
const ORDER = ['MAIN', 'WINNERS', 'LOSERS', 'GRAND_FINAL']

/** Slots gruppiert nach Bracket-Seite und Runde, in Spielreihenfolge. */
const sides = computed(() => {
  const map = new Map()
  for (const s of slots.value) {
    if (!map.has(s.bracket)) map.set(s.bracket, { bracket: s.bracket, title: BRACKETS[s.bracket] ?? s.bracket, rounds: new Map() })
    const rounds = map.get(s.bracket).rounds
    if (!rounds.has(s.round)) rounds.set(s.round, { key: s.round, label: s.label, slots: [] })
    rounds.get(s.round).slots.push(s)
  }
  return [...map.values()]
    .sort((x, y) => ORDER.indexOf(x.bracket) - ORDER.indexOf(y.bracket))
    .map(side => ({ ...side, rounds: [...side.rounds.values()].sort((x, y) => x.key - y.key) }))
})

onMounted(async () => {
  try {
    slots.value = (await hcApi.get('/bracket')).data.slots
  } catch (e) {
    error.value = errorMessage(e)
  }
})
</script>

<style scoped>
/* Feste Spalten: in jeder Runde stehen die Namen an derselben Stelle. */
.hc-bracket :deep(table) { table-layout: fixed; width: 100%; min-width: 640px; }
.hc-bracket :deep(td) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hc-col-slot { width: 7rem; }
.hc-col-score { width: 6rem; }
.hc-col-state { width: 11rem; }
.hc-col-action { width: 8rem; }
</style>
