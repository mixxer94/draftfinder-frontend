<template>
  <section class="rv-panel cb-panel">
    <h1 class="rv-title">{{ question.text }}</h1>
    <p class="rv-meta">{{ tipsText(result.answered) }}</p>

    <div class="cb-rows">
      <template v-for="r in rows" :key="r.value">
        <div class="cb-label rv-fade" :class="state(r)">{{ r.value }}</div>
        <div class="cb-track">
          <div class="cb-bar rv-fade" :class="state(r)" :style="{ width: `${(r.count / max) * 100}%` }" />
        </div>
        <div class="cb-count rv-fade" :class="state(r)">{{ r.count }}</div>
        <div v-if="showSolution && r.hit" class="cb-winners">
          {{ winners.length ? namesText(winners, 8) : 'Niemand lag richtig' }}
        </div>
      </template>
      <div v-if="rest" class="cb-rest">und {{ rest }} weitere Antworten</div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { namesText, tipsText, winnersOf } from './reveal'

/** Auswahlfrage als Balken je Antwort; die Lösung wird ocker, der Rest tritt zurück. */
const props = defineProps({
  question: { type: Object, required: true },
  result: { type: Object, required: true },
  users: { type: Array, required: true },
  solved: { type: Boolean, default: false },
})

// Mehr Zeilen passen nicht lesbar auf eine Folie.
const MAX_ROWS = 7

const showSolution = computed(() => props.solved && props.result.solution !== null)
const winners = computed(() => winnersOf(props.result, props.users))

// Häufigste Antworten zuerst; die Lösung steht schon vorher mit drin, auch
// ohne Tipp, damit beim Aufdecken keine Zeile auftaucht und alles verschiebt.
const all = computed(() => {
  const list = props.result.counts.map(([value, count]) => ({ value, count }))
  const solution = props.result.solution
  if (solution !== null && !list.some(r => r.value === solution)) list.push({ value: solution, count: 0 })
  return list.map(r => ({ ...r, hit: r.value === solution }))
})
const rows = computed(() => {
  const top = all.value.slice(0, MAX_ROWS)
  const hit = all.value.find(r => r.hit)
  return hit && !top.includes(hit) ? [...top.slice(0, MAX_ROWS - 1), hit] : top
})
const rest = computed(() => all.value.length - rows.value.length)
const max = computed(() => Math.max(1, ...rows.value.map(r => r.count)))

const state = r => (showSolution.value ? (r.hit ? 'cb-on' : 'cb-off') : '')
</script>

<style scoped>
.cb-panel { width: 1100px; }

.cb-rows {
  display: grid;
  grid-template-columns: minmax(0, 300px) 1fr 64px;
  gap: 18px 24px;
  align-items: center;
  margin-top: 36px;
}

.cb-label {
  overflow: hidden;
  font-family: 'Marcellus SC', serif;
  font-size: 32px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.cb-bar { height: 34px; min-width: 4px; background: rgb(255 255 255 / 40%); }

.cb-count { font-size: 30px; text-align: right; font-variant-numeric: tabular-nums; }

.cb-on { color: var(--rv-ochre); }
.cb-bar.cb-on { background: var(--rv-ochre); }
.cb-off { color: var(--rv-faint); }
.cb-bar.cb-off { background: rgb(255 255 255 / 10%); }

.cb-winners {
  grid-column: 2 / 4;
  margin-top: -8px;
  font-size: 24px;
  color: var(--rv-ochre);
}

.cb-rest { grid-column: 1 / 4; font-size: 24px; color: var(--rv-dim); }
</style>
