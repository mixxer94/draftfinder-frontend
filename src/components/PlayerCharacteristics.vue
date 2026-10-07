<template>
  <div ref="rootEl">
    <div class="pc-toolbar d-flex align-center ga-2 mb-1">
      <v-select v-model="currentSort" :items="SORT_OPTIONS" prefix="Sortieren nach:" aria-label="Sortieren nach" density="compact" variant="plain"
        hide-details class="gc-sort flex-grow-0" />

      <v-spacer />

      <v-btn variant="text" size="small" prepend-icon="mdi-rotate-3d-variant" @click="flipAll">
        {{ allFlipped ? 'Alle Werte zeigen' : 'Alle Zitate zeigen' }}
      </v-btn>
    </div>

    <div class="pc-grid" :style="{ zoom: fit }">
      <PlayerCard v-for="p in players" :key="p.user" :player="p" :side="isShowingStats(p.user) ? 'front' : 'back'">
        <div class="pc-card-actions">
          <v-btn :icon="isShowingStats(p.user) ? 'mdi-format-quote-open' : 'mdi-chart-bar'" size="x-small"
            density="comfortable" variant="flat" class="pc-card-btn" :aria-label="`${p.user} umdrehen`"
            @click="toggle(p.user)" />
        </div>
      </PlayerCard>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import playersData from '@/assets/players.json'
import PlayerCard from '@/components/gliddencup/public/PlayerCard.vue'
import { CARD_H, CARD_W } from '@/components/gliddencup/public/playerCards'

/**
 * Teilnehmerkarten für Maus und großen Bildschirm: festes Raster mit 8 × 2
 * Karten, das die verfügbare Breite und Fensterhöhe ausfüllt; Karten umdrehbar
 * (Werte / Zitate).
 */

const GAP = 6
const COLS = 8
const ROWS = 2
const BOTTOM_MARGIN = 16

const rootEl = ref(null)
const fit = ref(1)
const players = ref([...playersData])
const showStats = reactive({})
const allFlipped = ref(false)

function updateFit() {
  const el = rootEl.value
  if (!el) return
  const gridTop = el.getBoundingClientRect().top + el.firstElementChild.offsetHeight
  const byWidth = el.clientWidth / (COLS * CARD_W + (COLS - 1) * GAP)
  const byHeight = (window.innerHeight - gridTop - BOTTOM_MARGIN) / (ROWS * CARD_H + (ROWS - 1) * GAP)
  fit.value = Math.max(0.5, Math.min(byWidth, byHeight))
}

let observer
onMounted(() => {
  observer = new ResizeObserver(updateFit)
  observer.observe(rootEl.value)
  window.addEventListener('resize', updateFit)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', updateFit)
})

const isShowingStats = name => showStats[name] !== false

function toggle(name) {
  showStats[name] = !isShowingStats(name)
}

function flipAll() {
  allFlipped.value = !allFlipped.value
  players.value.forEach(p => { showStats[p.user] = !allFlipped.value })
}

const SORT_OPTIONS = [
  { title: 'Elo', value: 'elo' },
  { title: 'Micro', value: 'micro' },
  { title: 'Macro', value: 'macro' },
  { title: 'Strategy', value: 'strategy' },
  { title: 'Speed', value: 'speed' },
  { title: 'Exp', value: 'experience' },
  { title: 'Farbe', value: 'color' },
]
const currentSort = ref('elo')

function sortPlayers() {
  const key = currentSort.value
  const valueOf = p => {
    // Number(), weil manche Einträge „???“ statt einer Zahl haben; NaN würde die Sortierung durcheinanderbringen.
    if (key === 'elo') return Number(p.elo) || 0
    if (key === 'color') return Number(p.color) ? -Number(p.color) : -Infinity
    return p.median?.[key] ?? -Infinity
  }
  players.value.sort((a, b) => valueOf(b) - valueOf(a))
}
watch(currentSort, sortPlayers)

sortPlayers()
</script>

<style scoped>
.gc-sort {
  min-width: 150px;
}

.pc-toolbar {
  min-height: 32px;
}

.pc-toolbar :deep(.v-field) {
  --v-input-control-height: 32px;
  --v-field-padding-top: 0px;
  --v-field-padding-bottom: 0px;
  --v-field-input-padding-top: 0px;
  --v-field-input-padding-bottom: 0px;
}

.pc-toolbar :deep(.v-field__input),
.pc-toolbar :deep(.v-text-field__prefix) {
  min-height: 32px;
  padding-top: 0;
  padding-bottom: 0;
  align-items: center;
  line-height: 1.5;
}

.pc-grid {
  display: grid;
  grid-template-columns: repeat(8, 220px);
  gap: 6px;
  justify-content: center;
}

.pc-card-actions {
  position: absolute;
  z-index: 3;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.pc-card-btn {
  background: rgb(0 0 0 / 45%) !important;
  color: #fff !important;
}
</style>
