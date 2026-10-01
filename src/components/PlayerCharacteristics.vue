<template>
  <div>
    <div class="d-flex align-center flex-wrap ga-2 mb-2">
      <v-btn-toggle v-model="layoutMode" mandatory density="compact" variant="outlined" divided aria-label="Anordnung">
        <v-btn value="free" prepend-icon="mdi-cursor-move">Frei</v-btn>
        <v-btn value="grid" prepend-icon="mdi-view-grid-outline">Raster</v-btn>
      </v-btn-toggle>

      <v-select v-if="gridMode" v-model="currentSort" :items="SORT_OPTIONS" label="Sortieren nach" density="compact"
        hide-details class="gc-sort flex-grow-0" />

      <div class="d-flex align-center" role="group" aria-label="Zoom">
        <v-btn icon="mdi-magnify-minus-outline" variant="text" size="small" aria-label="Verkleinern"
          @click="zoomBy(1 / 1.1)" />
        <v-btn variant="text" size="small" class="gc-zoom" aria-label="Zoom zurücksetzen" @click="zoomLevel = 1">
          {{ Math.round(zoomLevel * 100) }} %
        </v-btn>
        <v-btn icon="mdi-magnify-plus-outline" variant="text" size="small" aria-label="Vergrößern"
          @click="zoomBy(1.1)" />
      </div>

      <v-spacer />

      <v-btn variant="text" prepend-icon="mdi-rotate-3d-variant" @click="flipAll">
        {{ allFlipped ? 'Alle Werte zeigen' : 'Alle Zitate zeigen' }}
      </v-btn>
      <v-btn v-if="!gridMode" variant="text" prepend-icon="mdi-restore" @click="reset">Anordnung zurücksetzen</v-btn>
    </div>

    <div class="pc-root" :class="{ 'pc-grid': gridMode }" @pointermove="onDrag" @pointerup="endDrag"
      @pointerleave="endDrag">
      <div v-for="(p, i) in players" :key="p.user" class="pc-card" :style="cardStyle(p, i)"
        @pointerdown="startDrag(p, $event)" @mouseenter="onHoverStart(p)" @mouseleave="onHoverEnd(p)">
        <div class="pc-card-actions">
          <v-btn :icon="isShowingStats(p.user) ? 'mdi-format-quote-open' : 'mdi-chart-bar'" size="x-small"
            density="comfortable" variant="flat" class="pc-card-btn" :aria-label="`${p.user} umdrehen`"
            @pointerdown.stop @click.stop="toggle(p.user)" />
        </div>

        <div class="name">{{ p.user }}</div>

        <div class="elo">{{ p.elo }} ({{ p.maxElo }})</div>

        <div v-if="isShowingStats(p.user)" class="stats-container">
          <div class="hint">{{ firstHint(p) }}</div>

          <div class="meta">
            <span>{{ p.map || '???' }}</span>
            <hr class="divider">
            <span>{{ p.civ || '???' }}</span>
            <hr class="divider">
            <span>{{ p.unit || '???' }}</span>
          </div>

          <div class="flex-grow-1" />

          <div class="stats">
            <div v-for="s in statList(p)" :key="s.label" class="stat">
              <span class="label">{{ s.label }}</span>
              <div class="bar">
                <div class="bar-mask" :style="{ width: `${100 - (s.value || 0) * 10}%` }" />
              </div>
              <div class="value">{{ s.value }}</div>
            </div>
          </div>
        </div>

        <div v-else class="extra">
          <strong>Charakter</strong>
          <ul class="item-list">
            <li v-for="(hint, idx) in p.hints" :key="idx">{{ hint }}</li>
          </ul>
          <strong>Zitate (nicht wirklich)</strong>
          <ul class="item-list">
            <li v-for="(q, idx) in p.quotes" :key="idx">„{{ q }}“</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import playersData from '@/assets/players.json'
import { firstHint, statList } from '@/components/gliddencup/public/playerCards'

/**
 * Teilnehmerkarten für Maus und großen Bildschirm: frei verschiebbar oder im
 * Raster, umdrehbar (Werte / Zitate), zoombar. Die freie Anordnung bleibt
 * im Browser gespeichert.
 */

// Eigener Schlüssel je Saison: Positionen der Vorsaison gehören zu anderen Namen.
const STORAGE_KEY = 'gliddencup_card_positions_2026'

const players = ref([...playersData])
const positions = reactive(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'))
const showStats = reactive({})
const dragging = ref(null)
const zoomLevel = ref(1)
const zCounter = ref(0)
const layoutMode = ref('free')
const gridMode = computed(() => layoutMode.value === 'grid')
const allFlipped = ref(false)

const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(positions))

const zoomBy = f => { zoomLevel.value = Math.min(2, Math.max(0.5, zoomLevel.value * f)) }

function startDrag(p, e) {
  if (gridMode.value) return
  e.preventDefault()
  const card = e.currentTarget
  const containerRect = card.offsetParent.getBoundingClientRect()
  const rect = card.getBoundingClientRect()
  dragging.value = {
    name: p.user,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    containerTop: containerRect.top,
    containerLeft: containerRect.left,
  }
  zCounter.value++
  positions[p.user] = { ...positions[p.user], zIndex: zCounter.value }
}

function onDrag(e) {
  if (!dragging.value) return
  const { name, offsetX, offsetY, containerTop, containerLeft } = dragging.value
  positions[name] = {
    ...positions[name],
    top: e.clientY - containerTop - offsetY,
    left: e.clientX - containerLeft - offsetX,
  }
}

function endDrag() {
  dragging.value = null
}

// Die Karte unter der Maus kommt nach vorn, ohne ihre gespeicherte Ebene zu ändern.
function onHoverStart(p) {
  if (dragging.value || gridMode.value) return
  zCounter.value++
  positions[p.user] = { ...positions[p.user], hoverZ: zCounter.value }
}

function onHoverEnd(p) {
  if (dragging.value || !positions[p.user]) return
  delete positions[p.user].hoverZ
}

watch(positions, () => { if (!gridMode.value) persist() }, { deep: true })

const isShowingStats = name => showStats[name] !== false

function toggle(name) {
  showStats[name] = !isShowingStats(name)
}

function flipAll() {
  allFlipped.value = !allFlipped.value
  players.value.forEach(p => { showStats[p.user] = !allFlipped.value })
}

function reset() {
  Object.keys(positions).forEach(k => { delete positions[k] })
  zCounter.value = 0
  localStorage.removeItem(STORAGE_KEY)
}

function cardStyle(p, i) {
  // Im Raster ordnet CSS Grid; `zoom` statt `scale`, damit die Spalten mitwachsen.
  if (gridMode.value) return { zoom: zoomLevel.value }

  const saved = positions[p.user]
  const pos = typeof saved?.top === 'number' && typeof saved?.left === 'number'
    ? saved
    : { top: 8 + Math.floor(i / 8) * 358, left: 8 + (i % 8) * 228 }
  const z = dragging.value?.name === p.user
    ? zCounter.value + 1
    : saved?.hoverZ || saved?.zIndex || 10 + i
  return {
    top: `${pos.top}px`,
    left: `${pos.left}px`,
    transform: `scale(${zoomLevel.value})`,
    zIndex: z,
  }
}

const SORT_OPTIONS = [
  { title: 'Elo', value: 'elo' },
  { title: 'Micro', value: 'micro' },
  { title: 'Macro', value: 'macro' },
  { title: 'Strategy', value: 'strategy' },
  { title: 'Speed', value: 'speed' },
  { title: 'Exp', value: 'experience' },
]
const currentSort = ref('elo')

function sortPlayers() {
  const key = currentSort.value
  const valueOf = p => (key === 'elo' ? p.elo || 0 : p.median?.[key] ?? -Infinity)
  players.value.sort((a, b) => valueOf(b) - valueOf(a))
}
watch(currentSort, sortPlayers)

onMounted(() => {
  sortPlayers()
  zCounter.value = Math.max(0, ...Object.values(positions).map(p => p.zIndex || 0))
})
</script>

<style scoped>
.gc-sort {
  min-width: 170px;
}

.gc-zoom {
  min-width: 4.5rem;
  font-variant-numeric: tabular-nums;
}

/* Karten- und Abstandsmaße sind so gewählt, dass 16 Karten auf 1080p in zwei Reihen passen. */
.pc-root {
  position: relative;
  height: calc(100vh - 200px);
  min-height: 520px;
  overflow: hidden;
  user-select: none;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}

.pc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, max-content));
  gap: 8px;
  justify-content: center;
  height: auto;
  min-height: 0;
  padding: 8px;
  overflow: visible;
}

/*
 * Die Karte ist Spielgrafik mit dunklem Hintergrundbild; Schrift und Buttons
 * darauf bleiben deshalb in beiden Themes hell.
 */
.pc-card {
  position: absolute;
  width: 220px;
  height: 350px;
  padding: 12px 14px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  color: #fff;
  font-family: 'Marcellus SC', serif;
  background-image: url('/gliddencup/card.webp');
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 25%);
  cursor: grab;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.pc-grid .pc-card {
  position: relative;
  cursor: default;
}

.pc-card:hover {
  box-shadow: 0 8px 20px rgb(0 0 0 / 35%);
}

.pc-root:not(.pc-grid) .pc-card:hover {
  transform: scale(1.05);
}

.pc-card-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.pc-card-btn {
  background: rgb(0 0 0 / 45%) !important;
  color: #fff !important;
}

/* Ohne flex-shrink: 0 drückt eine lange, scrollende Rückseite den Namen weg (overflow: hidden erlaubt Höhe 0). */
.name {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-top: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.elo {
  flex-shrink: 0;
  font-size: 12px;
  text-align: center;
}

.stats-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.hint {
  font-size: 14px;
  line-height: 1.3;
  color: #bbb;
  margin-top: 4px;
  text-align: center;
  font-style: italic;
}

.meta {
  font-size: 15px;
  line-height: 1.3;
  font-weight: bold;
  text-align: center;
  color: #ddd;
}

.meta .divider {
  width: 10%;
  margin: 2px 45%;
  border-color: rgb(255 255 255 / 40%);
}

.stats {
  font-size: 15px;
  line-height: 1.3;
}

.stat {
  display: flex;
  align-items: center;
  margin: 3px 0;
}

.label {
  width: 64px;
}

.value {
  width: 26px;
  text-align: right;
  font-weight: bold;
}

/* Farbverlauf ist die Skala der Werte 1–10; die Maske deckt den Rest ab. */
.bar {
  position: relative;
  flex-grow: 1;
  height: 8px;
  margin: 0 2px;
  border-radius: 4px;
  overflow: hidden;
  background: linear-gradient(90deg, #620c03, #f1c40f, #00ff6c);
}

.bar-mask {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  background: #000;
}

.extra {
  flex: 1 1 0;
  min-height: 0;
  font-size: 15px;
  margin: 8px 0 12px;
  padding: 6px 8px;
  overflow-y: auto;
  color: #ddd;
  background: rgb(17 17 17 / 63%);
  border-radius: 6px;
}

.extra strong {
  color: #fff;
}

.item-list {
  padding-left: 15px;
  margin-bottom: 6px;
}
</style>
