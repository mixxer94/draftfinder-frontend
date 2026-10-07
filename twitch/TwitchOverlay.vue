<template>
  <v-app class="tw-app">
    <div
      v-if="player && !showAll"
      class="tw-card"
      :class="{ dragging: grab }"
      :style="cardStyle"
      @pointerdown="startDrag"
      @pointermove="drag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @dragstart.prevent
    >
      <div :style="{ zoom }">
        <PlayerCard :player="player" :side="side">
          <div class="tw-card-actions">
            <v-btn :icon="side === 'front' ? mdiFormatQuoteOpen : mdiChartBar" size="x-small"
              density="comfortable" variant="flat" class="tw-card-btn" :aria-label="`${player.user} umdrehen`"
              @click="side = side === 'front' ? 'back' : 'front'" />
            <v-btn :icon="mdiClose" size="x-small" density="comfortable" variant="flat" class="tw-card-btn"
              aria-label="Karte schließen" @click="selected = null" />
          </div>
        </PlayerCard>
      </div>
    </div>

    <div v-if="showAll" class="tw-all" @click.self="showAll = false">
      <div class="tw-all-actions">
        <v-btn :icon="allSide === 'front' ? mdiFormatQuoteOpen : mdiChartBar" size="small" density="comfortable"
          variant="flat" class="tw-card-btn" aria-label="Alle Karten umdrehen"
          @click="allSide = allSide === 'front' ? 'back' : 'front'" />
        <v-btn :icon="mdiClose" size="small" density="comfortable" variant="flat" class="tw-card-btn"
          aria-label="Vergleichsansicht schließen" @click="showAll = false" />
      </div>
      <div class="tw-all-grid" :style="{ zoom: allLayout.zoom, gridTemplateColumns: `repeat(${allLayout.cols}, ${CARD_W}px)`, gap: `${GAP}px` }">
        <PlayerCard v-for="p in players" :key="p.user" :player="p" :side="allSide" />
      </div>
    </div>

    <v-menu v-model="menuOpen" location="left center" offset="8">
      <template #activator="{ props }">
        <button v-show="!showAll && (controlsVisible || mouseActive || menuOpen)" v-bind="props" type="button"
          class="tw-toggle" aria-label="Spielerkarten" />
      </template>
      <v-list density="compact" class="tw-list">
        <v-list-item :prepend-icon="mdiViewGridOutline" title="Alle anzeigen" @click="showAll = true" />
        <v-divider />
        <v-list-item v-for="(p, i) in players" :key="p.user" :active="i === selected" @click="select(i)">
          <template #prepend>
            <span class="tw-color" :class="{ unknown: !hasPlayerColor(p) }" :style="{ '--player-color': playerColorCss(p) }" />
          </template>
          <v-list-item-title>{{ p.user }}</v-list-item-title>
          <v-list-item-subtitle>{{ p.elo }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-app>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { mdiChartBar, mdiClose, mdiFormatQuoteOpen, mdiViewGridOutline } from '@mdi/js'
import playersData from '@/assets/players.json'
import PlayerCard from '@/components/gliddencup/public/PlayerCard.vue'
import { CARD_H, CARD_W, hasPlayerColor, playerColorCss } from '@/components/gliddencup/public/playerCards'

/**
 * Video-Overlay der Twitch-Extension: Jeder Zuschauer wählt rechts über den
 * Button einen Spieler aus und schiebt die Karte per Drag & Drop an eine
 * beliebige Stelle über dem Stream. Nichts davon geht an Twitch oder andere
 * Zuschauer.
 */

// Kartenhöhe als Anteil der Videohöhe, damit die Karte im Vollbild mitwächst.
const CARD_SHARE = 0.5
const STORAGE_KEY = 'gc-twitch-card'

// Stärkste zuerst; Einträge ohne Elo („???“) ans Ende.
const eloOf = p => Number(p.elo) || 0
const players = [...playersData].sort((a, b) => eloOf(b) - eloOf(a))

const selected = ref(null)
const side = ref('front')
const menuOpen = ref(false)

const player = computed(() => players[selected.value] ?? null)

function select (i) {
  selected.value = i
  side.value = 'front'
  showAll.value = false
}

// Vergleichsansicht: alle Karten gleichzeitig als Raster über dem Stream.
const showAll = ref(false)
const allSide = ref('front')
const GAP = 8
const PAD = 16
// Platz über dem Raster für Umdrehen und Schließen.
const BAR = 40

// Twitch liefert den Kontext sofort nach dem Laden; außerhalb von Twitch (lokaler Test) kommt keiner und der Button bleibt sichtbar.
const controlsVisible = ref(true)
window.Twitch?.ext.onContext(ctx => {
  if ('arePlayerControlsVisible' in ctx) controlsVisible.value = ctx.arePlayerControlsVisible
})

// Ob Twitch die Steuerung auch bei Mausbewegung über dem Extension-iframe als sichtbar meldet, ist nicht garantiert;
// deshalb blendet auch eigene Mausbewegung den Button für ein paar Sekunden ein.
const mouseActive = ref(false)
let idleTimer = null
function onMouseMove () {
  mouseActive.value = true
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => { mouseActive.value = false }, 3000)
}

const view = reactive({ w: window.innerWidth, h: window.innerHeight })
const onResize = () => Object.assign(view, { w: window.innerWidth, h: window.innerHeight })
onMounted(() => {
  window.addEventListener('resize', onResize)
  window.addEventListener('mousemove', onMouseMove)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('mousemove', onMouseMove)
  clearTimeout(idleTimer)
})

// zoom statt transform: scale, damit die Schrift scharf bleibt (siehe OverlayStage.vue).
const zoom = computed(() => Math.min(Math.max(view.h * CARD_SHARE / CARD_H, 0.5), 2.5))

// Die Spaltenzahl, bei der die Karten am größten werden; bei 16:9 meist 8 × 2.
const allLayout = computed(() => {
  let best = { cols: 1, zoom: 0 }
  for (let cols = 1; cols <= players.length; cols++) {
    const rows = Math.ceil(players.length / cols)
    const zoom = Math.min(
      (view.w - 2 * PAD) / (cols * CARD_W + (cols - 1) * GAP),
      (view.h - 2 * PAD - BAR) / (rows * CARD_H + (rows - 1) * GAP),
    )
    if (zoom > best.zoom) best = { cols, zoom }
  }
  return { cols: best.cols, zoom: Math.min(best.zoom, 2.5) }
})

// Freier Platz um die Karte; die Position ist ein Anteil davon (0–1), so bleibt die Karte bei jeder Größe im Bild.
const free = () => ({ x: Math.max(view.w - CARD_W * zoom.value, 0), y: Math.max(view.h - CARD_H * zoom.value, 0) })

// localStorage ist in Twitch-iframes je nach Browser gesperrt; dann startet die Karte immer links.
function loadPos () {
  try {
    const pos = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (Number.isFinite(pos?.x) && Number.isFinite(pos?.y)) return pos
  } catch {}
  return { x: 0.03, y: 0.5 }
}

const pos = reactive(loadPos())

const cardStyle = computed(() => ({
  left: `${pos.x * free().x}px`,
  top: `${pos.y * free().y}px`,
}))

const clamp01 = v => Math.min(Math.max(v, 0), 1)

// Abstand vom Zeiger zur linken oberen Kartenecke, solange gezogen wird.
const grab = ref(null)

function startDrag (e) {
  // Buttons nicht abfangen, sonst landet ihr Klick wegen der Pointer-Capture auf der Karte.
  if (e.button !== 0 || e.target.closest('button')) return
  const rect = e.currentTarget.getBoundingClientRect()
  grab.value = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
  e.currentTarget.setPointerCapture(e.pointerId)
}

function drag (e) {
  if (!grab.value) return
  const { x, y } = free()
  pos.x = x ? clamp01((e.clientX - grab.value.dx) / x) : 0
  pos.y = y ? clamp01((e.clientY - grab.value.dy) / y) : 0
}

function endDrag () {
  if (!grab.value) return
  grab.value = null
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
  } catch {}
}
</script>

<style>
/* Alles außer Karte und Button muss durchsichtig sein, sonst verdeckt das Overlay den Stream. */
html,
body,
.v-application {
  background: transparent !important;
  overflow: hidden !important;
}

/*
 * Twitch setzt auf seine iframes color-scheme: normal. Weicht das Farbschema der Seite davon ab
 * (Vuetifys dunkles Theme setzt dark), malt der Browser das ganze iframe deckend aus.
 */
html {
  color-scheme: normal !important;
}
</style>

<style scoped>
.tw-card {
  position: fixed;
  z-index: 1;
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.tw-card.dragging {
  cursor: grabbing;
}

.tw-card-actions {
  position: absolute;
  z-index: 3;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
}

.tw-card-btn {
  background: rgb(0 0 0 / 45%) !important;
  color: #fff !important;
}

/* Abgedunkelt, damit die Karten vor jedem Spielgeschehen lesbar bleiben; ein Klick daneben schließt. */
.tw-all {
  position: fixed;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(0 0 0 / 60%);
}

.tw-all-actions {
  display: flex;
  align-self: flex-end;
  gap: 4px;
  height: 40px;
}

.tw-all-grid {
  display: grid;
}

.tw-toggle {
  position: fixed;
  /* Oberhalb der Mitte: Rechts mittig blendet Twitch beim Hover das eigene Extension-Symbol ein. */
  top: 66%;
  right: 25px;
  width: 54px;
  height: 84px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  transform: translateY(-50%);
  /*
   * Der goldene Schein liegt als drop-shadow auf dem Button statt als box-shadow auf jeder Karte: So folgt er dem
   * Umriss beider Karten zusammen und fällt nicht von der vorderen auf die hintere Karte.
   * Ohne Hover voll transparent, damit er sanft einblenden kann.
   */
  filter: drop-shadow(0 0 3px rgb(220 171 69 / 0%)) drop-shadow(0 0 10px rgb(220 171 69 / 0%));
  transition: filter 0.25s ease;
}

.tw-toggle:hover {
  filter: drop-shadow(0 0 3px rgb(220 171 69 / 45%)) drop-shadow(0 0 10px rgb(220 171 69 / 35%));
}

/* Zwei aufgefächerte Mini-Karten mit dem Kartenmotiv. */
.tw-toggle::before,
.tw-toggle::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url('/gliddencup/card.webp') center / cover;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 22%), 0 2px 6px rgb(0 0 0 / 50%);
  /* Das Kartenmotiv ist sehr dunkel; in Buttongröße gingen Wappen und Rahmen sonst unter. */
  filter: brightness(1.2);
  transition: transform 0.15s ease;
}

.tw-toggle::before {
  transform: translateX(-7px) rotate(-12deg);
}

.tw-toggle::after {
  transform: translateX(3px) rotate(4deg);
}

.tw-toggle:hover::before {
  transform: translateX(-10px) rotate(-18deg);
}

.tw-toggle:hover::after {
  transform: translateX(5px) rotate(7deg);
}

.tw-toggle:focus-visible {
  outline: 2px solid #dcab45;
  outline-offset: 6px;
  border-radius: 4px;
}

.tw-list {
  max-height: 70vh;
  overflow-y: auto;
  font-family: 'Marcellus SC', serif;
  background: rgb(17 17 17 / 90%) !important;
}

.tw-color {
  width: 10px;
  height: 18px;
  margin-right: 12px;
  background: var(--player-color);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%);
}

.tw-color.unknown {
  background: #4d3b2a;
}
</style>
