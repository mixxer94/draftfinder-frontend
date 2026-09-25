<template>
  <v-chip size="x-small" variant="flat" :color="color">{{ label }}</v-chip>
  <span v-if="match.score" class="text-medium-emphasis ml-1">{{ match.score }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ match: { type: Object, required: true } })

const label = computed(() => (props.match.blocked ? 'BLOCKED' : props.match.state))
const color = computed(() => {
  if (props.match.blocked || props.match.state === 'ESCALATED') return 'error'
  if (props.match.state === 'PLAYED') return 'success'
  if (props.match.state === 'RESULT_REPORTED') return 'warning'
  return 'grey'
})
</script>
