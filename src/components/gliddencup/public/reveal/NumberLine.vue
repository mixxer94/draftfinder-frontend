<template>
  <section class="rv-panel nl-panel">
    <h1 class="rv-title">{{ question.text }}</h1>
    <p class="rv-meta">
      {{ tipsText(result.answered) }}
      <template v-if="showSolution">· <b>{{ result.solution }} {{ question.unit }}</b></template>
      <template v-else-if="question.unit">· in {{ question.unit }}</template>
    </p>

    <div class="nl-axis" :style="{ height: `${axisHeight}px` }">
      <div class="nl-line" :style="{ left: `${scale.left}px`, right: `${WIDTH - scale.right}px` }" />
      <div v-if="scale.outLeft" class="nl-runout" :style="{ left: 0, width: `${scale.left}px` }" />
      <div v-if="scale.outRight" class="nl-runout" :style="{ left: `${scale.right}px`, right: 0 }" />
      <span v-for="t in scale.ticks" :key="t" class="nl-tick" :style="{ left: `${x(t)}px` }">{{ t }}</span>
      <div
        v-for="p in points"
        :key="p.user"
        class="nl-point rv-fade"
        :class="{ 'nl-hit': solved && p.hit, 'nl-dim': showSolution && !p.hit }"
      >
        <div class="nl-dot" :style="{ left: `${p.x}px` }" />
        <div
          v-if="p.out"
          class="nl-name nl-outname"
          :style="{ top: `${OUT_TOP + p.row * OUT_ROW}px`, [p.out]: 0 }"
        >
          {{ p.user }} <span class="nl-value">{{ p.value }}</span>
        </div>
        <template v-else-if="p.lane !== null">
          <div class="nl-stem" :style="{ left: `${p.x}px`, top: `${laneTop(p.lane) + 36}px`, height: `${AXIS_Y - laneTop(p.lane) - 36}px` }" />
          <div
            class="nl-name"
            :style="p.flip
              ? { right: `${WIDTH - p.x + 8}px`, top: `${laneTop(p.lane)}px` }
              : { left: `${p.x + 8}px`, top: `${laneTop(p.lane)}px` }"
          >
            {{ p.user }} <span class="nl-value">{{ p.value }}</span>
          </div>
        </template>
      </div>
      <div class="nl-solution" :class="{ 'nl-solution--on': showSolution }" :style="{ left: `${x(result.solution ?? 0)}px` }" />
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { tipsText } from './reveal'

/**
 * Zahlenfrage als Zahlenstrahl; jeder Tipp ein Punkt mit Namen, die Lösung
 * als Linie. Ausreißer stehen außerhalb der Skala am Rand, damit ein Tipp
 * weit daneben nicht alle anderen auf einen Haufen drückt.
 */
const props = defineProps({
  question: { type: Object, required: true },
  result: { type: Object, required: true },
  users: { type: Array, required: true },
  solved: { type: Boolean, default: false },
})

// Innenbreite des Panels: 1680 − 2 × 56 Innenabstand.
const WIDTH = 1568
// Platz am Rand für Ausreißer; die Punkte rücken darin nebeneinander, ihre
// Namen stehen darunter, wo die Skala nicht hinreicht.
const RUNOUT = 200
const OUT_GAP = 30
const OUT_TOP = 312
const OUT_ROW = 32
const LANES = 4
const LANE_H = 40
const AXIS_Y = 260

const showSolution = computed(() => props.solved && props.result.solution !== null)
const answers = computed(() => props.users
  .map(user => ({ user, value: props.result.byUser.get(user)?.value }))
  .filter(a => typeof a.value === 'number'))

function median (sorted) {
  const mid = (sorted.length - 1) / 2
  return (sorted[Math.floor(mid)] + sorted[Math.ceil(mid)]) / 2
}

/**
 * Bereich der Skala. Ausreißer liegen weiter als 5 × die mittlere Abweichung
 * vom Median entfernt; das hält auch, wenn ein Drittel der Tipps exotisch ist,
 * anders als Quartile. Die Lösung liegt immer auf der Skala, schon vor dem
 * Aufdecken, sonst springt die Achse beim Aufdecken.
 */
const scale = computed(() => {
  const solution = props.result.solution
  const sorted = answers.value.map(a => a.value).sort((a, b) => a - b)
  let core = sorted
  if (sorted.length >= 4) {
    const m = median(sorted)
    const mad = median(sorted.map(v => Math.abs(v - m)).sort((a, b) => a - b))
    // Untergrenze, damit bei lauter gleichen Tipps nicht jede Abweichung als Ausreißer gilt.
    const reach = 5 * Math.max(mad, Math.abs(m) * 0.05, 1)
    core = sorted.filter(v => Math.abs(v - m) <= reach)
  }
  const values = [...core]
  if (solution !== null) values.push(solution)
  if (!values.length) values.push(0, 10)
  const min = Math.min(...values)
  const max = Math.max(...values)

  const raw = Math.max(1, max - min) / 6
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map(f => f * mag).find(s => s >= raw)
  const lo = Math.floor(min / step) * step
  const hi = Math.max(lo + step, Math.ceil(max / step) * step)
  const ticks = []
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6)

  const outLeft = sorted.filter(v => v < lo)
  const outRight = sorted.filter(v => v > hi)
  return {
    lo,
    hi,
    ticks,
    outLeft: outLeft.length,
    outRight: outRight.length,
    left: outLeft.length ? RUNOUT : 0,
    right: WIDTH - (outRight.length ? RUNOUT : 0),
  }
})

const x = v => scale.value.left + ((v - scale.value.lo) / (scale.value.hi - scale.value.lo)) * (scale.value.right - scale.value.left)
const laneTop = lane => AXIS_Y - 64 - lane * LANE_H

// Ausreißer je Seite nach Wert geordnet: Punkte von innen nach außen, Namen von oben nach unten.
const outliers = computed(() => {
  const byValue = (p, q) => (p.value - q.value) || p.user.localeCompare(q.user)
  return {
    left: answers.value.filter(a => a.value < scale.value.lo).sort(byValue).reverse(),
    right: answers.value.filter(a => a.value > scale.value.hi).sort(byValue),
  }
})
const axisHeight = computed(() => {
  const rows = Math.max(outliers.value.left.length, outliers.value.right.length)
  return Math.max(330, OUT_TOP + rows * OUT_ROW + 8)
})

// Namen in Spuren über der Achse: Ein Name weicht nach oben aus, wenn links
// davon noch ein anderer steht. Gewinner werden zuerst verteilt, damit sie
// nie wegen Platzmangel ohne Namen bleiben; ohne freie Spur bleibt nur der Punkt.
const points = computed(() => {
  const placed = answers.value.map(a => {
    const p = { ...a, hit: !!props.result.byUser.get(a.user)?.points, out: null }
    for (const side of ['left', 'right']) {
      const list = outliers.value[side]
      const row = list.indexOf(a)
      if (row === -1) continue
      const spread = Math.min(OUT_GAP, (RUNOUT - 60) / Math.max(1, list.length - 1))
      const fromEdge = 12 + (list.length - 1 - row) * spread
      return { ...p, out: side, row, x: side === 'left' ? fromEdge : WIDTH - fromEdge }
    }
    return { ...p, x: x(a.value) }
  })
  const order = placed.filter(p => !p.out).sort((a, b) => (Number(b.hit) - Number(a.hit)) || (a.value - b.value))
  const taken = Array.from({ length: LANES }, () => [])
  for (const p of order) {
    const width = (p.user.length + String(p.value).length + 2) * 13
    // Am rechten Rand steht der Name links vom Punkt, sonst ragt er aus dem Panel.
    p.flip = p.x + width > WIDTH + 40
    const [from, to] = p.flip ? [p.x - width - 8, p.x + 8] : [p.x - 8, p.x + width]
    const free = taken.findIndex(spans => spans.every(([a, b]) => to < a || from > b))
    p.lane = free === -1 ? null : free
    if (free !== -1) taken[free].push([from, to])
  }
  return placed
})
</script>

<style scoped>

.nl-axis { position: relative; margin-top: 24px; }

.nl-line {
  position: absolute;
  top: 260px;
  height: 2px;
  background: rgba(var(--rv-ink-rgb), 0.35);
}

/* Auslauf zu den Ausreißern: gestrichelt, weil der Abstand dort nicht maßstäblich ist. */
.nl-runout {
  position: absolute;
  top: 260px;
  height: 2px;
  background: repeating-linear-gradient(90deg, rgba(var(--rv-ink-rgb), 0.3) 0 8px, transparent 8px 16px);
}

.nl-tick {
  position: absolute;
  top: 274px;
  transform: translateX(-50%);
  font-size: 24px;
  color: var(--rv-dim);
  font-variant-numeric: tabular-nums;
}

.nl-dot {
  position: absolute;
  top: 261px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--rv-ink);
  transform: translate(-50%, -50%);
  transition: inherit;
}

.nl-stem {
  position: absolute;
  border-left: 1px solid rgba(var(--rv-ink-rgb), 0.22);
}

/* Eigener Grund in Panelfarbe, damit Linien und Striche hinter dem Namen verschwinden statt ihn zu durchkreuzen. */
.nl-name {
  position: absolute;
  z-index: 2;
  padding: 0 6px;
  margin-left: -6px;
  background: var(--rv-panel-solid);
  font-size: 24px;
  white-space: nowrap;
  transition: inherit;
}

.nl-value { opacity: 0.7; font-variant-numeric: tabular-nums; }

.nl-outname { margin-left: 0; font-size: 22px; }

/* Abblenden über die Farbe, nicht über opacity: Sonst schimmern Linien durch den Namensgrund. */
.nl-dim .nl-dot { background: var(--rv-faint); }
.nl-dim .nl-name { color: var(--rv-faint); }

.nl-hit .nl-dot { background: var(--rv-accent); box-shadow: 0 0 0 6px rgba(var(--rv-accent-rgb), 0.25); }
.nl-hit .nl-name { color: var(--rv-accent); font-weight: 700; }
.nl-hit .nl-stem { border-color: var(--rv-accent); }

.nl-solution {
  position: absolute;
  z-index: 1;
  top: 20px;
  height: 300px;
  width: 3px;
  background: var(--rv-accent);
  transform: translateX(-50%) scaleY(0);
  transform-origin: top;
  transition: transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.nl-solution--on { transform: translateX(-50%) scaleY(1); }

@media (prefers-reduced-motion: reduce) {
  .nl-solution { transition: none; }
}
</style>
