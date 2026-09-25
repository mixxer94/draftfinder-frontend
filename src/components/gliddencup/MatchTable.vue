<template>
  <v-table density="compact">
    <thead>
      <tr>
        <th>Slot</th>
        <th>Runde</th>
        <th>Paarung</th>
        <th v-if="has('scheduledAt')">Termin</th>
        <th v-if="has('state')">Status</th>
        <th v-if="has('blocked')">Grund</th>
        <th v-if="has('score')">Ergebnis</th>
        <th v-if="admin" />
      </tr>
    </thead>
    <tbody>
      <tr v-for="m in matches" :key="m.id">
        <td class="font-weight-medium text-no-wrap">{{ m.slotCode }}</td>
        <td>{{ m.roundLabel }}</td>
        <td>{{ m.a }} vs. {{ m.b }}</td>
        <td v-if="has('scheduledAt')" class="text-no-wrap">{{ formatDate(m.scheduledAt, timezone, true) }}</td>
        <td v-if="has('state')"><MatchStateChip :match="m" /></td>
        <td v-if="has('blocked')">
          {{ m.blocked?.reason }}
          <span class="text-medium-emphasis">seit {{ formatDate(m.blocked?.since, timezone) }}</span>
        </td>
        <td v-if="has('score')">{{ m.score ?? '—' }}</td>
        <td v-if="admin">
          <v-btn size="small" variant="text" :to="`/gliddencup/admin/matches/${m.id}`">Detail</v-btn>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { computed } from 'vue'
import { formatDate, isAdmin } from '@/services/hcApi'
import MatchStateChip from './MatchStateChip.vue'

const props = defineProps({
  matches: { type: Array, required: true },
  timezone: { type: String, default: 'Europe/Berlin' },
  columns: { type: Array, default: () => ['state'] },
})

// Match-Detail ist der Turnierleitung vorbehalten (Chatverlauf).
const admin = computed(() => isAdmin())
const has = col => props.columns.includes(col)
</script>
