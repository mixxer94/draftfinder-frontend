<template>
  <section class="rv-panel">
    <h1 class="rv-title">Wer kennt seinen Gegner?</h1>
    <p v-if="!players.total" class="rv-meta">Es sind noch keine Vermutungen aufgedeckt.</p>
    <template v-else>
      <div class="pg-duel">
        <div>
          <div class="pg-label">Spieler erkannten ihren Gegner</div>
          <div class="pg-sub">{{ players.correct }} von {{ players.total }} Vermutungen</div>
        </div>
        <div class="pg-track"><div class="pg-fill pg-fill--players" :style="{ width: `${players.pct}%` }" /></div>
        <div class="pg-value pg-value--players">{{ Math.round(players.pct) }} %</div>
        <div>
          <div class="pg-label">Tipper erkannten dieselben Gegner</div>
        </div>
        <div class="pg-track"><div class="pg-fill" :style="{ width: `${players.spectatorPct}%` }" /></div>
        <div class="pg-value">{{ Math.round(players.spectatorPct) }} %</div>
      </div>

      <h2 class="pg-heading">
        Für wen hielten die Spieler ihren Gegner?
        <span class="pg-legend"><i class="pg-ok" />stimmte <i class="pg-wrong" />lag daneben</span>
      </h2>
      <div class="pg-rows">
        <template v-for="p in shown" :key="p.name">
          <div class="pg-name">{{ p.name }}</div>
          <div class="pg-count">{{ p.correct }}/{{ p.count }}</div>
          <!-- Je Vermutung ein Kästchen, die richtigen vorne: zählbar und als Länge vergleichbar. -->
          <div class="pg-units" :style="{ '--pg-unit': `${unit}px` }">
            <i v-for="i in p.count" :key="i" :class="i <= p.correct ? 'pg-ok' : 'pg-wrong'" />
          </div>
        </template>
        <div v-if="rest" class="pg-rest">und {{ rest }} weitere Namen</div>
      </div>
    </template>
  </section>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Spieler-Vermutungen als Folie: Trefferquote der Spieler gegen die der
 * Tipper, darunter für wen die Spieler ihre Gegner gehalten haben und wie oft
 * das stimmte.
 */
const props = defineProps({
  // Aus playerGuesses
  players: { type: Object, required: true },
})

// Mehr Zeilen passen nicht lesbar unter den Vergleich; bei mehr Namen wird die letzte Zeile zum Hinweis.
const MAX_ROWS = 16

const shown = computed(() => {
  const list = props.players.ranking
  return list.length > MAX_ROWS ? list.slice(0, MAX_ROWS - 1) : list
})
const rest = computed(() => props.players.ranking.length - shown.value.length)
// Kästchenbreite: 28 px, schmaler nur, wenn der häufigste Name sonst nicht in die rund 1000 px der Spalte passt.
const UNITS_WIDTH = 1000
const UNIT_GAP = 4
const unit = computed(() => {
  const max = Math.max(1, ...props.players.ranking.map(p => p.count))
  return Math.min(28, Math.floor(UNITS_WIDTH / max) - UNIT_GAP)
})
</script>

<style scoped>
.pg-duel {
  display: grid;
  grid-template-columns: 560px 1fr 140px;
  gap: 16px 28px;
  align-items: center;
  margin-top: 28px;
}

.pg-label { font: 400 34px/1.15 'Marcellus SC', serif; }
.pg-sub { margin-top: 2px; font-size: 24px; color: var(--rv-dim); }
.pg-track { height: 40px; background: rgb(255 255 255 / 8%); }
.pg-fill { height: 100%; background: #8a847a; }
.pg-fill--players { background: var(--rv-ochre); }
.pg-value { font: 400 44px 'Marcellus SC', serif; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.pg-value--players { color: var(--rv-ochre); }

.pg-heading { display: flex; align-items: baseline; gap: 32px; margin: 32px 0 0; font: 400 32px/1.2 'Marcellus SC', serif; color: var(--rv-dim); }
.pg-legend { font: 400 24px Roboto, sans-serif; }
.pg-legend i { display: inline-block; width: 18px; height: 18px; margin: 0 8px 0 20px; vertical-align: -2px; }
.pg-legend i:first-child { margin-left: 0; }

.pg-rows {
  display: grid;
  grid-template-columns: 360px 140px 1fr;
  grid-auto-rows: 36px;
  column-gap: 28px;
  align-items: center;
  margin-top: 14px;
}

.pg-name { overflow: hidden; font: 400 28px 'Marcellus SC', serif; white-space: nowrap; text-overflow: ellipsis; }
.pg-count { font-size: 26px; color: var(--rv-dim); text-align: right; font-variant-numeric: tabular-nums; }
.pg-units { display: flex; gap: 4px; }
.pg-units i { width: var(--pg-unit); height: 24px; }
.pg-ok { background: var(--rv-ochre); }
.pg-wrong { background: #8a847a; }
.pg-rest { grid-column: 1 / -1; font-size: 24px; color: var(--rv-dim); }
</style>
