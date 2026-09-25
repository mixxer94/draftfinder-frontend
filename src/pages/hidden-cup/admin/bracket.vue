<template>
  <h2 class="text-h6 mb-2">Bracket</h2>
  <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

  <template v-for="group in groups" :key="group.key">
    <h3 class="text-subtitle-1 mt-4 mb-1">{{ group.key }}</h3>
    <v-table density="compact">
      <thead>
        <tr><th>Slot</th><th>Spieler A</th><th>Spieler B</th><th>Status</th><th>Abhängig</th><th v-if="admin" /></tr>
      </thead>
      <tbody>
        <tr v-for="s in group.slots" :key="s.code">
          <td class="font-weight-medium text-no-wrap">{{ s.code }}</td>
          <td>{{ s.a ?? '—' }}</td>
          <td>{{ s.b ?? '—' }}</td>
          <td>
            <MatchStateChip v-if="s.match" :match="s.match" />
            <v-chip v-else-if="s.a && s.b" size="x-small" color="warning" variant="flat">READY</v-chip>
            <v-chip v-else size="x-small" variant="flat">PENDING</v-chip>
          </td>
          <td class="text-medium-emphasis">{{ s.dependentSlotCount }}</td>
          <td v-if="admin">
            <v-btn v-if="s.match" size="small" variant="text" :to="`/hidden-cup/admin/matches/${s.match.id}`">Detail</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </template>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { errorMessage, hcApi, isAdmin } from '@/services/hcApi'
import MatchStateChip from '@/components/hidden-cup/MatchStateChip.vue'

const slots = ref([])
const error = ref('')
const admin = computed(() => isAdmin())

const groups = computed(() => {
  const map = new Map()
  for (const s of slots.value) {
    const key = `${s.bracket} · Runde ${s.round} · ${s.label}`
    if (!map.has(key)) map.set(key, { key, slots: [] })
    map.get(key).slots.push(s)
  }
  return [...map.values()]
})

onMounted(async () => {
  try {
    slots.value = (await hcApi.get('/bracket')).data.slots
  } catch (e) {
    error.value = errorMessage(e)
  }
})
</script>
