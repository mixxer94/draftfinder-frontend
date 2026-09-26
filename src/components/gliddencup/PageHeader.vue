<template>
  <header class="mb-6">
    <div class="d-flex align-center flex-wrap ga-2">
      <slot name="before" />
      <h1 class="text-h5">{{ title }}</h1>
      <slot name="meta" />
      <v-spacer />
      <slot />
    </div>
    <p v-if="text" class="hc-lead text-medium-emphasis mt-1">{{ text }}</p>
  </header>
</template>

<script setup>
/** Seitenkopf der Admin-Seiten: Titel, ein Satz Erklärung, Aktionen rechts im Slot. */
defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' },
})
</script>

<style scoped>
.hc-lead { max-width: 70ch; }
</style>
