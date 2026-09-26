<template>
  <a v-if="url" :href="url" target="_blank" rel="noopener" :title="url">{{ id }}</a>
  <span v-else class="text-medium-emphasis">—</span>
</template>

<script setup>
import { computed } from 'vue'

/** Preset-Link, gekürzt auf die ID am Ende der URL; die volle Adresse steht im Tooltip. */
const props = defineProps({ url: { type: String, default: null } })

const id = computed(() => props.url.replace(/\/+$/, '').split('/').pop())
</script>
