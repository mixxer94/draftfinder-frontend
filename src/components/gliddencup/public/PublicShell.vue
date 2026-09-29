<template>
  <v-app-bar :elevation="2" density="compact" color="app-bar" class="gc-appbar">
    <v-app-bar-title>Gliddencup</v-app-bar-title>
    <v-spacer />
    <v-btn variant="text" to="/" prepend-icon="mdi-arrow-left" class="d-none d-sm-flex">Draft Finder</v-btn>
    <v-btn variant="text" to="/" icon="mdi-arrow-left" aria-label="Zum Draft Finder" class="d-sm-none" />
    <v-btn icon="mdi-theme-light-dark" aria-label="Hell oder dunkel" @click="toggleTheme" />
  </v-app-bar>

  <v-container fluid class="gc-public pa-4 pa-md-6">
    <slot />
  </v-container>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useTheme } from 'vuetify'

/** Rahmen der öffentlichen Gliddencup-Seiten: App-Leiste, Inhalt; `title` wird der Browser-Titel. */
const props = defineProps({
  title: { type: String, default: 'Gliddencup' },
})

const theme = useTheme()
function toggleTheme () {
  theme.global.name.value = theme.global.name.value === 'dark' ? 'light' : 'dark'
}

watch(() => props.title, t => { document.title = t })
onMounted(() => { document.title = props.title })
onUnmounted(() => { document.title = 'Draft Finder' })
</script>

<style>
/* Wie im Admin-Bereich (admin.vue): gleich breite Ziffern, Satzschreibung auf Buttons. */
.gc-public .v-table td { font-variant-numeric: tabular-nums; }
.gc-public .v-btn, .gc-appbar .v-btn, .gc-dialog .v-btn, .gc-public .v-tab { text-transform: none; letter-spacing: normal; }
.gc-public .hc-h2 { font-size: 1.125rem; font-weight: 600; line-height: 1.4; margin-bottom: 0.5rem; }
</style>
