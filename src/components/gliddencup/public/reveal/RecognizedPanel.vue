<template>
  <section class="rv-panel">
    <h1 class="rv-title">Wer wurde erkannt?</h1>
    <p class="rv-meta">
      <span class="rc-key rc-ok" />richtig erkannt
      <span class="rc-key rc-w1" /><span class="rc-key rc-w2" />häufigste Verwechslungen
      <span class="rc-key rc-rest" />andere Namen<template v-if="pageCount > 1"> · {{ from }}–{{ from + entries.length - 1 }} von {{ total }}</template>
    </p>
    <div class="rc-rows">
      <template v-for="p in rows" :key="p.pseudonym">
        <div class="rc-ps">{{ p.pseudonym }}</div>
        <div class="rc-truth">{{ p.truth || '—' }}</div>
        <div class="rc-count">{{ p.correct }}</div>
        <!-- Volle Breite = alle Tipper; was fehlt, hat bei diesem Pseudonym nichts getippt. -->
        <div class="rc-bar">
          <span class="rc-ok" :style="{ width: share(p, p.correct) }" />
          <span v-for="(w, i) in p.wrong" :key="w[0]" :class="`rc-w${i + 1}`" :style="{ width: share(p, w[1]) }" />
          <span class="rc-rest" :style="{ width: share(p, p.rest) }" />
        </div>
        <!-- Je Verwechslung eine eigene Spalte, damit die Namen über alle Zeilen bündig stehen. -->
        <div v-for="i in [0, 1]" :key="i" class="rc-other">
          <template v-if="p.wrong[i]">
            <span class="rc-key" :class="`rc-w${i + 1}`" /><span class="rc-name">{{ p.wrong[i][0] }}</span><span class="rc-n">{{ p.wrong[i][1] }}</span>
          </template>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Eine Seite von „Wer wurde erkannt?“: je Pseudonym der Klarname und alle Tipps
 * als gestapelter Balken. Die Beschriftung steht neben dem Balken, damit sie
 * auch bei schmalen Segmenten lesbar bleibt.
 */
const props = defineProps({
  // Eine Seite aus summarize().recognizedPages
  entries: { type: Array, required: true },
  pageCount: { type: Number, default: 1 },
  // Platz des ersten Eintrags in der ganzen Liste, ab 1
  from: { type: Number, required: true },
  total: { type: Number, required: true },
})

// Die zwei häufigsten falschen Namen; alle übrigen Tipps landen gemeinsam in `rest`.
const rows = computed(() => props.entries.map(p => {
  const wrong = p.guesses.filter(([name]) => name !== p.truth)
  const given = p.guesses.reduce((sum, [, count]) => sum + count, 0)
  const top = wrong.slice(0, 2)
  return { ...p, wrong: top, rest: given - p.correct - top.reduce((sum, [, count]) => sum + count, 0) }
}))
const share = (p, count) => `${(count / (p.totalUsers || 1)) * 100}%`
</script>

<style scoped>
.rc-rows {
  display: grid;
  grid-template-columns: 240px 230px 40px 1fr 280px 280px;
  grid-auto-rows: 1fr;
  column-gap: 24px;
  flex: 1;
  align-items: center;
  margin-top: 22px;
}

.rc-ps,
.rc-truth,
.rc-name { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

.rc-ps { font: 400 30px 'Marcellus SC', serif; }
.rc-truth { font-size: 26px; color: var(--rv-ochre); }
.rc-count { font-size: 26px; color: var(--rv-ochre); text-align: right; font-variant-numeric: tabular-nums; }

.rc-bar { display: flex; height: 28px; background: rgb(255 255 255 / 5%); }

/* Nur der Name wird gekürzt; Farbquadrat und Anzahl bleiben immer sichtbar. */
.rc-other { display: flex; align-items: center; min-width: 0; font-size: 24px; }
.rc-name { flex: 1; min-width: 0; color: var(--rv-ink); }
.rc-n { flex: none; width: 44px; text-align: right; color: var(--rv-dim); font-variant-numeric: tabular-nums; }

/* Farbquadrat vor einem Namen; dieselben Farben wie die Segmente im Balken. */
.rc-key { display: inline-block; flex: none; width: 18px; height: 18px; margin-right: 8px; vertical-align: -2px; }
.rv-meta .rc-key { margin-left: 20px; }
.rv-meta .rc-key:first-child,
.rv-meta .rc-w2 { margin-left: 0; }

.rc-ok { background: var(--rv-ochre); }
.rc-w1 { background: #8a847a; }
.rc-w2 { background: #57524b; }
.rc-rest { background: rgb(255 255 255 / 14%); }
</style>
