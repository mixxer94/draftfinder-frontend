<template>
  <v-chip size="small" variant="tonal" :color="color">{{ label }}</v-chip>
</template>

<script setup>
import { computed } from 'vue'
import { MATCH_STATES } from '@/services/hcApi'

/** Status eines Matches oder Slots; `state` genügt für Slots ohne Match. */
const props = defineProps({ match: { type: Object, required: true } })

const key = computed(() => (props.match.blocked ? 'BLOCKED' : props.match.state))
const label = computed(() => MATCH_STATES[key.value] ?? key.value)
const color = computed(() => {
  if (key.value === 'BLOCKED' || key.value === 'ESCALATED') return 'error'
  if (key.value === 'PLAYED') return 'success'
  if (key.value === 'RESULT_REPORTED' || key.value === 'READY') return 'warning'
  if (key.value === 'PENDING') return undefined
  return 'secondary'
})
</script>
