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
        :style="{ left: `${c * layout.colW}px`, width: `${cardW}px` }"
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
        :style="{ left: `${card.x}px`, top: `${card.y}px`, width: `${cardW}px`, height: `${cardH}px` }"
        :aria-label="linkable(card.slot) ? `Details zu ${card.slot.code}` : undefined"
      >
        <div class="hc-tree-head">
          <span class="text-medium-emphasis text-no-wrap">{{ card.slot.code }}</span>
          <MatchStateChip v-if="showState" :match="card.slot.match ?? { state: card.slot.a && card.slot.b ? 'READY' : 'PENDING' }" />
          <slot name="head" :slot="card.slot" />
        </div>
        <div
          v-for="side in ['A', 'B']"
          :key="side"
          class="hc-tree-side"
          :class="{ 'font-weight-bold': card.slot.match?.winner === side }"
        >
          <span v-if="hasScores" class="hc-tree-score">{{ sideScore(card.slot.match, side) }}</span>
          <div class="hc-tree-side-main">
            <slot name="side" :slot="card.slot" :side="side">
              <div class="hc-tree-name">{{ (side === 'A' ? card.slot.a : card.slot.b) ?? '—' }}</div>
            </slot>
          </div>
        </div>
        <slot name="actions" :slot="card.slot" />
      </component>
    </div>
  </div>
</template>

<script setup>
import { computed, useSlots } from 'vue'
import MatchStateChip from './MatchStateChip.vue'

/**
 * Turnierbaum einer Bracket-Seite. `rounds` wie in admin/bracket.vue:
 * [{ key, label, slots: [slotView, …] }], aufsteigend nach Runde.
 *
 * Slots: `side` ({ slot, side: 'A' | 'B' }) ersetzt die Namenszeile eines
 * Spielers, `head` ({ slot }) steht rechts in der Kopfzeile, `actions`
 * ({ slot }) unten in der Karte. Was die Slots zusätzlich zeigen, muss in
 * `cardHeight` × `cardWidth` Platz haben.
 */
const props = defineProps({
  rounds: { type: Array, required: true },
  admin: { type: Boolean, default: false },
  cardHeight: { type: Number, default: 84 },
  cardWidth: { type: Number, default: 220 },
  showState: { type: Boolean, default: true },
})
const slots = useSlots()

const TOP = 28 // Platz für die Rundennamen
const cardH = computed(() => props.cardHeight)
const cardW = computed(() => props.cardWidth)

// Match-Detail ist der Turnierleitung vorbehalten (Chatverlauf). Mit Buttons
// in der Karte bleibt sie ein div: Buttons in einem Link sind ungültiges HTML.
const linkable = slot => props.admin && slot.match && !slots.actions

// Das Ergebnis steht immer aus Sicht des Siegers („2:1“), die Zahlen gehören also zu Sieger und Verlierer, nicht zu A und B.
const sideScore = (match, side) => {
  const [won, lost] = match?.score?.split(':') ?? []
  if (!match?.winner || lost === undefined) return ''
  return match.winner === side ? won : lost
}
// Die Ergebnisspalte gibt es erst, wenn irgendein Match eins hat, sonst wären alle Namen grundlos eingerückt.
const hasScores = computed(() => props.rounds.some(r => r.slots.some(s => s.match?.score)))

// Position in der Runde steckt im Code (WB-R2-M3); GF und GF-RESET haben keine.
const indexOf = code => Number(code.match(/-M(\d+)$/)?.[1] ?? 1)

/**
 * Karten absolut positioniert, Verbindungen als SVG-Pfade. Ein Match steht
 * mittig zwischen den Matches der Vorrunde, die in es münden. Welche das sind,
 * folgt aus dem Größenverhältnis der Runden: gleich groß heißt 1:1 (Loser
 * Bracket), halb so groß heißt 2:1. So braucht es kein `feedsWinnerTo` aus der API.
 */
const layout = computed(() => {
  const CARD_H = cardH.value
  const CARD_W = cardW.value
  const COL_W = CARD_W + 48
  const ROW_H = CARD_H + 16
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
    colW: COL_W,
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
.hc-tree-side { display: flex; align-items: baseline; gap: 8px; }
.hc-tree-side-main { flex: 1 1 auto; min-width: 0; }
.hc-tree-score { flex: 0 0 1ch; text-align: right; font-variant-numeric: tabular-nums; }
.hc-tree-name { line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
