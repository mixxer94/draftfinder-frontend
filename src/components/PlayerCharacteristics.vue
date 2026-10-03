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
      <div v-for="p in players" :key="p.user" class="pc-card" :style="{ '--player-color': playerColorCss(p) }">
        <div class="pc-card-actions">
          <v-btn :icon="isShowingStats(p.user) ? 'mdi-format-quote-open' : 'mdi-chart-bar'" size="x-small"
            density="comfortable" variant="flat" class="pc-card-btn" :aria-label="`${p.user} umdrehen`"
            @click="toggle(p.user)" />
        </div>

        <div class="pennant" />

        <div class="plate">
          <div class="name">{{ p.user }}</div>
          <div class="elo">{{ p.elo }} ({{ p.maxElo }})</div>
        </div>

        <div v-if="isShowingStats(p.user)" class="stats-container">
          <div class="hint">{{ spotlightText(p) }}</div>
          <hr class="divider">
          <div class="fact"><span class="fact-label">Map</span> {{ p.map?.trim() || '???' }}</div>
          <hr class="divider">
          <div class="fact"><span class="fact-label">Angstgegner</span> {{ p.angstgegner || '???' }}</div>

          <div class="meta">
            <template v-for="m in metaItems(p)" :key="m.kind">
              <v-tooltip v-if="m.src" :text="m.text" location="bottom" content-class="pc-tooltip">
                <template #activator="{ props }">
                  <span v-if="m.badge" v-bind="props" class="badged">
                    <img :src="m.src" :alt="m.text">
                    <span class="badge">{{ m.badge }}</span>
                  </span>
                  <img v-else v-bind="props" :src="m.src" :alt="m.text">
                </template>
              </v-tooltip>
              <span v-else>{{ m.text }}</span>
            </template>
          </div>

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
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import playersData from '@/assets/players.json'
import { spotlightText, metaItems, playerColorCss, statList } from '@/components/gliddencup/public/playerCards'

/**
 * Teilnehmerkarten für Maus und großen Bildschirm: festes Raster mit 8 × 2
 * Karten, das die verfügbare Breite und Fensterhöhe ausfüllt; Karten umdrehbar
 * (Werte / Zitate).
 */

const CARD_W = 220
const CARD_H = 350
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
    if (key === 'elo') return p.elo || 0
    if (key === 'color') return Number(p.color) ? -Number(p.color) : -Infinity
    return p.median?.[key] ?? -Infinity
  }
  players.value.sort((a, b) => valueOf(b) - valueOf(a))
}
watch(currentSort, sortPlayers)

sortPlayers()
</script>

<style src="@/components/gliddencup/public/playerCards.css"></style>

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

/*
 * Die Karte ist Spielgrafik mit dunklem Hintergrundbild; Schrift und Buttons
 * darauf bleiben deshalb in beiden Themes hell.
 */
.pc-card {
  position: relative;
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
  transition: box-shadow 0.25s ease;
}

.pc-card:hover {
  box-shadow: 0 8px 20px rgb(0 0 0 / 35%);
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
.pennant {
  position: absolute;
  top: 0;
  left: 14px;
  z-index: 1;
  width: 30px;
  height: 52px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--player-color) 75%, black),
    var(--player-color) 45%,
    color-mix(in srgb, var(--player-color) 80%, black));
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%);
}

.plate {
  --plate: rgb(0 0 0 / 45%);
  position: relative;
  flex-shrink: 0;
  margin: 8px -14px 0;
  padding: 3px 0 4px;
  background: linear-gradient(90deg, transparent, var(--plate) 18%, var(--plate) 82%, transparent);
  text-shadow: 0 1px 2px #000;
}

.plate::before,
.plate::after {
  content: '';
  position: absolute;
  left: 10%;
  right: 10%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 45%), transparent);
}

.plate::before {
  top: 0;
}

.plate::after {
  bottom: 0;
}

.name,
.elo {
  position: relative;
  z-index: 2;
}

.name {
  flex-shrink: 0;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
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
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  line-height: 1.3;
  color: #bbb;
  margin-top: 5px;
  text-align: center;
  font-style: italic;
}

.meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-items: center;
  justify-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 13px;
  line-height: 1.2;
  font-weight: bold;
  text-align: center;
  color: #ddd;
  overflow-wrap: anywhere;
}

.meta img {
  width: 100%;
  height: 38px;
  object-fit: contain;
}

.badged {
  position: relative;
  display: inline-block;
  line-height: 0;
}

.badged img {
  width: auto;
}

.badge {
  position: absolute;
  left: -5px;
  bottom: -5px;
  padding: 2px;
  border-radius: 50px;
  background-color: #00a91b;
  font-size: 13px;
  line-height: 1;
  font-weight: bold;
  color: #fff;
  text-shadow: 0 0 2px #000, 1px 1px 1px #000;
}

.divider {
  flex-shrink: 0;
  width: 10%;
  margin: 3px 45%;
  border-color: rgb(255 255 255 / 40%);
}

.fact {
  font-size: 13px;
  line-height: 1.2;
  text-align: center;
  color: #ddd;
}

.fact-label {
  font-size: 11px;
  color: #aaa;
}

.stats {
  font-size: 15px;
  line-height: 1.3;
}

.stat {
  display: flex;
  align-items: center;
  margin: 1px 0;
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
