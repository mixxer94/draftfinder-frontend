<template>
  <div class="hc-tree-scroll">
    <div class="hc-tree" :style="{ width: `${layout.width}px`, height: `${layout.height}px` }">
      <svg class="hc-tree-lines" :width="layout.width" :height="layout.height" aria-hidden="true">
        <path v-for="(d, i) in layout.lines" :key="i" :d="d" />
      </svg>

      <div
        v-for="(col, c) in layout.columns"
        :key="col.key"
        class="hc-tree-label text-caption text-medium-emphasis"
        :style="{ left: `${c * COL_W}px`, width: `${CARD_W}px` }"
      >
        {{ col.label }}
      </div>

      <component
        :is="linkable(card.slot) ? 'router-link' : 'div'"
        v-for="card in layout.cards"
        :key="card.slot.code"
        :to="linkable(card.slot) ? `/gliddencup/admin/matches/${card.slot.match.id}` : undefined"
        class="hc-tree-card"
        :class="{ 'hc-tree-card--link': linkable(card.slot) }"
        :style="{ left: `${card.x}px`, top: `${card.y}px`, width: `${CARD_W}px`, height: `${CARD_H}px` }"
        :aria-label="linkable(card.slot) ? `Details zu ${card.slot.code}` : undefined"
      >
        <div class="hc-tree-head">
          <span class="text-medium-emphasis text-no-wrap">
            {{ card.slot.code }}<template v-if="card.slot.match?.score"> · {{ card.slot.match.score }}</template>
          </span>
          <MatchStateChip :match="card.slot.match ?? { state: card.slot.a && card.slot.b ? 'READY' : 'PENDING' }" />
        </div>
        <div :class="{ 'font-weight-bold': card.slot.match?.winner === 'A' }" class="hc-tree-name">{{ card.slot.a ?? '—' }}</div>
        <div :class="{ 'font-weight-bold': card.slot.match?.winner === 'B' }" class="hc-tree-name">{{ card.slot.b ?? '—' }}</div>
      </component>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import MatchStateChip from './MatchStateChip.vue'

/**
 * Turnierbaum einer Bracket-Seite. `rounds` wie in admin/bracket.vue:
 * [{ key, label, slots: [slotView, …] }], aufsteigend nach Runde.
 */
const props = defineProps({
  rounds: { type: Array, required: true },
  admin: { type: Boolean, default: false },
})

const CARD_W = 220
const CARD_H = 84
const COL_W = CARD_W + 48
const ROW_H = CARD_H + 16
const TOP = 28 // Platz für die Rundennamen

// Match-Detail ist der Turnierleitung vorbehalten (Chatverlauf).
const linkable = slot => props.admin && slot.match

// Position in der Runde steckt im Code (WB-R2-M3); GF und GF-RESET haben keine.
const indexOf = code => Number(code.match(/-M(\d+)$/)?.[1] ?? 1)

/**
 * Karten absolut positioniert, Verbindungen als SVG-Pfade. Ein Match steht
 * mittig zwischen den Matches der Vorrunde, die in es münden. Welche das sind,
 * folgt aus dem Größenverhältnis der Runden: gleich groß heißt 1:1 (Loser
 * Bracket), halb so groß heißt 2:1. So braucht es kein `feedsWinnerTo` aus der API.
 */
const layout = computed(() => {
  const cards = []
  const lines = []
  let prev = []

  props.rounds.forEach((round, c) => {
    const slots = [...round.slots].sort((x, y) => indexOf(x.code) - indexOf(y.code))
    const x = c * COL_W
    const current = slots.map((slot, i) => {
      const ratio = slots.length / (prev.length || 1)
      const feeders = prev.filter((_, p) => Math.ceil((p + 1) * ratio) === i + 1)
      const y = feeders.length
        ? feeders.reduce((sum, f) => sum + f.y, 0) / feeders.length
        : TOP + i * ROW_H
      for (const f of feeders) {
        const y1 = f.y + CARD_H / 2
        const y2 = y + CARD_H / 2
        const xm = f.x + CARD_W + (COL_W - CARD_W) / 2
        lines.push(`M${f.x + CARD_W} ${y1}H${xm}V${y2}H${x}`)
      }
      return { slot, x, y }
    })
    cards.push(...current)
    prev = current
  })

  return {
    cards,
    lines,
    columns: props.rounds.map(r => ({ key: r.key, label: r.label })),
    width: props.rounds.length * COL_W - (COL_W - CARD_W),
    height: Math.max(TOP, ...cards.map(card => card.y + CARD_H)),
  }
})
</script>

<style scoped>
.hc-tree-scroll { overflow-x: auto; padding-bottom: 8px; }
.hc-tree { position: relative; }
.hc-tree-lines { position: absolute; inset: 0; pointer-events: none; }
.hc-tree-lines path { fill: none; stroke: rgba(var(--v-theme-on-surface), 0.3); stroke-width: 1.5; }
.hc-tree-label { position: absolute; top: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.hc-tree-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 6px 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  text-decoration: none;
}
.hc-tree-card--link:hover,
.hc-tree-card--link:focus-visible { border-color: rgb(var(--v-theme-secondary)); }
.hc-tree-card--link:focus-visible { outline: 2px solid rgb(var(--v-theme-secondary)); outline-offset: 2px; }

.hc-tree-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.75rem; }
.hc-tree-head :deep(.v-chip) { --v-chip-height: 20px; font-size: 0.7rem; }
.hc-tree-name { line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
