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
        <div class="rc-ps">
          <span class="rc-ellipsis">{{ p.pseudonym }}</span>
          <!-- Ohne Tooltip: Die Legende unter der Tabelle erklärt die Plaketten. -->
          <span v-for="a in badgesOf(p)" :key="a.icon" class="rc-badge" role="img" :aria-label="a.text">
            <v-icon :icon="a.icon" size="24" />
          </span>
        </div>
        <div class="rc-truth">{{ p.truth || '—' }}</div>
        <div class="rc-count">{{ p.correct }}</div>
        <!-- Volle Breite = alle Tipper; was fehlt, hat bei diesem Pseudonym nichts getippt. -->
        <div class="rc-bar">
          <span class="rc-ok" :style="{ width: share(p, p.correct) }" />
          <span v-for="(w, i) in p.wrong" :key="w[0]" :class="[`rc-w${i + 1}`, { 'rc-beats': w[1] > p.correct }]" :style="{ width: share(p, w[1]) }" />
          <span class="rc-rest" :style="{ width: share(p, p.rest) }" />
        </div>
        <!-- Je Verwechslung eine eigene Spalte, damit die Namen über alle Zeilen bündig stehen. -->
        <div v-for="i in [0, 1]" :key="i" class="rc-other" :class="{ 'rc-beats': p.wrong[i] && p.wrong[i][1] > p.correct }">
          <template v-if="p.wrong[i]">
            <span class="rc-key" :class="`rc-w${i + 1}`" /><span class="rc-name">{{ p.wrong[i][0] }}</span><span class="rc-n">{{ p.wrong[i][1] }}</span>
          </template>
        </div>
      </template>
    </div>
    <!-- Erklärt die Plaketten, auch im Vollbild für den Stream. -->
    <p v-if="shownAwards.length" class="rc-legend">
      <span v-for="a in shownAwards" :key="a.icon"><span class="rc-badge"><v-icon :icon="a.icon" size="24" /></span>{{ a.text }}</span>
    </p>
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
  // summarize().awards
  awards: { type: Object, default: () => ({}) },
})

/*
 * Phantom: Fedora mit Hutband und runde, volle Brillengläser, selbst gezeichnet
 * im 24er-Raster der Material Design Icons. Ein einziger Pfad ohne Löcher, damit
 * v-icon ihn mit „svg:“ zeichnen kann; das Hutband ist eine Lücke zwischen zwei
 * Teilen der Krone. Füllt das Raster in der Höhe wie mdi-drama-masks daneben.
 */
const PHANTOM_ICON = 'svg:'
  + 'M7.41 6.5 8 3.2q.9-1.4 2.5-.8l1.5.6 1.5-.6q1.6-.6 2.5.8l.59 3.3z' // Krone über dem Band
  + 'M7.2 7.7h9.6l.2 1.1H7z' // Krone unter dem Band
  + 'M2 8.8q10 3 20 0V10q-10 3.4-20 0z' // Krempe
  + 'M2.6 17.5a4.4 4.4 0 1 0 8.8 0 4.4 4.4 0 1 0-8.8 0z' // Glas links
  + 'M12.6 17.5a4.4 4.4 0 1 0 8.8 0 4.4 4.4 0 1 0-8.8 0z' // Glas rechts
  + 'M11.2 15.6q.8-.6 1.6 0v1.1q-.8-.5-1.6 0z' // Steg

function badgesOf (p) {
  const { phantom, double } = props.awards
  const list = []
  if (phantom === p.pseudonym) {
    list.push({ icon: PHANTOM_ICON, text: 'Am seltensten erkannt' })
  }
  if (double === p.pseudonym) {
    list.push({ icon: 'mdi-drama-masks', text: 'Am stärksten verwechselt' })
  }
  return list
}
const shownAwards = computed(() => props.entries.flatMap(badgesOf))

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
  grid-template-columns: 300px 230px 40px 1fr 250px 250px;
  grid-auto-rows: 1fr;
  column-gap: 24px;
  flex: 1;
  align-items: center;
  margin-top: 22px;
}

.rc-ellipsis,
.rc-truth,
.rc-name { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

.rc-ps { display: flex; align-items: center; gap: 10px; min-width: 0; font: 400 30px 'Marcellus SC', serif; }

/* Plakette für Phantom und Doppelgänger: Petrol getönt wie aktive Listeneinträge, weil es eine Auszeichnung ist, kein richtig/falsch. */
.rc-badge {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(var(--rv-badge-rgb), 0.16);
  color: rgb(var(--rv-badge-rgb));
}

.rc-legend { display: flex; gap: 40px; margin: auto 0 0; padding-top: 20px; font-size: 24px; color: var(--rv-dim); }
.rc-legend > span { display: flex; align-items: center; gap: 12px; }
.rc-truth { font-size: 26px; color: var(--rv-accent); }
.rc-count { font-size: 26px; color: var(--rv-accent); text-align: right; font-variant-numeric: tabular-nums; }

.rc-bar { display: flex; height: 28px; background: rgba(var(--rv-ink-rgb), 0.05); }

/* Nur der Name wird gekürzt; Farbquadrat und Anzahl bleiben immer sichtbar. */
.rc-other { display: flex; align-items: center; min-width: 0; font-size: 24px; }
.rc-name { flex: 1; min-width: 0; color: var(--rv-ink); }
.rc-n { flex: none; width: 44px; text-align: right; color: var(--rv-dim); font-variant-numeric: tabular-nums; }

/* Farbquadrat vor einem Namen; dieselben Farben wie die Segmente im Balken. */
.rc-key { display: inline-block; flex: none; width: 18px; height: 18px; margin-right: 8px; vertical-align: -2px; }
.rv-meta .rc-key { margin-left: 20px; }
.rv-meta .rc-key:first-child,
.rv-meta .rc-w2 { margin-left: 0; }

.rc-ok { background: var(--rv-accent); }
.rc-w1 { background: var(--rv-miss); }
.rc-w2 { background: var(--rv-miss-2); }
.rc-rest { background: rgba(var(--rv-ink-rgb), 0.14); }

/* Verwechslungen, die öfter getippt wurden als der richtige Name: rot statt grau, gedämpft, damit Grün vorn bleibt. */
.rc-other.rc-beats .rc-name,
.rc-other.rc-beats .rc-n { color: var(--rv-wrong); }
.rc-bar .rc-beats,
.rc-other.rc-beats .rc-key { background: rgba(var(--rv-wrong-rgb), 0.55); }
</style>
