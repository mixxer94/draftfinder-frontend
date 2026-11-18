<template>
  <section class="rv-panel">
    <h1 class="rv-title">Rangliste</h1>
    <p v-if="pageCount > 1" class="rv-meta">Platz {{ range }}</p>
    <div class="rk-rows">
      <template v-for="r in rows" :key="r.crowd ? '' : r.user">
        <div class="rk-rank">{{ r.rank }}</div>
        <div class="rk-name" :class="{ 'rk-crowd': r.crowd }">{{ r.crowd ? 'Die Community' : r.user }}</div>
        <div class="rk-bar" :class="{ 'rk-bar--crowd': r.crowd }">
          <span :style="{ width: share(r.correct) }" />
          <span v-if="!r.crowd" class="rk-extra" :style="{ width: share(r.extra) }" />
        </div>
        <div class="rk-points" :class="{ 'rk-crowd': r.crowd }">{{ r.points }}</div>
        <div class="rk-note">{{ r.crowd ? 'Mehrheitstipp' : r.solo ? `${r.solo} allein` : '' }}</div>
      </template>
    </div>
    <p class="rk-legend">
      <span><i class="rk-key" />Pseudonyme</span>
      <span><i class="rk-key rk-extra" />Zusatzfragen und Guy Glidden</span>
      <span>„allein“: Treffer, die sonst niemand hatte</span>
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue'

/** Eine Seite der Rangliste mit bis zu 16 Plätzen als Balken. */
const props = defineProps({
  // Eine Seite aus summarize().rankingPages
  rows: { type: Array, required: true },
  pageCount: { type: Number, default: 1 },
  // Höchste Punktzahl der ganzen Rangliste, damit die Balken über alle Seiten vergleichbar bleiben
  max: { type: Number, required: true },
})

const share = n => `${(n / props.max) * 100}%`
const range = computed(() => {
  const ranks = props.rows.filter(r => !r.crowd).map(r => r.rank)
  return ranks.length ? `${Math.min(...ranks)}–${Math.max(...ranks)}` : ''
})
</script>

<style scoped>
.rk-rows {
  display: grid;
  grid-template-columns: 70px 420px 1fr 80px 180px;
  grid-auto-rows: 40px;
  column-gap: 28px;
  align-items: center;
  margin-top: 24px;
  font-size: 30px;
}

.rk-rank,
.rk-name,
.rk-points { font-family: 'Marcellus SC', serif; }

.rk-rank { text-align: right; color: var(--rv-dim); }
.rk-name { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

.rk-bar { display: flex; height: 22px; }
.rk-bar span { background: rgb(236 230 218 / 55%); }
.rk-bar .rk-extra { background: var(--rv-ochre); }
.rk-bar--crowd { border: 2px dashed var(--rv-dim); }
.rk-bar--crowd span { display: none; }

.rk-points { font-size: 32px; text-align: right; font-variant-numeric: tabular-nums; }
.rk-crowd { font-style: italic; color: var(--rv-dim); }
.rk-note { font-size: 24px; color: var(--rv-dim); white-space: nowrap; }

.rk-legend { display: flex; gap: 36px; margin: auto 0 0; font-size: 24px; color: var(--rv-dim); }

.rk-key {
  display: inline-block;
  width: 22px;
  height: 22px;
  margin-right: 10px;
  vertical-align: -3px;
  background: rgb(236 230 218 / 55%);
}

.rk-key.rk-extra { background: var(--rv-ochre); }
</style>
