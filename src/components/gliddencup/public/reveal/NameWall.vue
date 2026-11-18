<template>
  <section class="rv-panel nw-panel">
    <h1 class="rv-title nw-title">Wer ist Guy Glidden?</h1>
    <p class="rv-meta nw-meta">{{ tipsText(answered) }}</p>
    <div class="nw-wall">
      <span
        v-for="g in arranged"
        :key="g.label"
        class="nw-name rv-fade"
        :class="solved && (g.ok ? 'nw-ok' : 'nw-off')"
        :style="{ fontSize: `${size(g.count)}px` }"
      >{{ g.label }}</span>
    </div>
    <!-- Wer richtig lag, wie bei den Auswahlfragen unter der Lösung; die Zeile ist immer da, damit beim Aufdecken nichts springt. -->
    <p class="nw-winners rv-fade" :class="{ 'nw-winners--on': solved }">
      {{ winners.length ? namesText(winners, 8) : 'Niemand lag richtig' }}
    </p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { namesText, tipsText } from './reveal'

/** Antworten auf „Wer ist Guy Glidden?“ als Namenswand; die Größe folgt der Zahl der Tipps. */
const props = defineProps({
  // Aus mysteryGroups, je Gruppe mit `ok`, ob sie zählt.
  groups: { type: Array, required: true },
  answered: { type: Number, required: true },
  // Tipper mit richtiger Antwort
  winners: { type: Array, required: true },
  solved: { type: Boolean, default: false },
})

// Mehr Namen machen die Wand unlesbar; die seltensten fallen weg, richtige Antworten nie.
const MAX_NAMES = 24

// Die größten Namen in die Mitte, kleinere abwechselnd davor und dahinter.
const arranged = computed(() => {
  const shown = props.groups.filter((g, i) => i < MAX_NAMES || g.ok)
  const out = []
  shown.forEach((g, i) => (i % 2 ? out.unshift(g) : out.push(g)))
  return out
})
const max = computed(() => Math.max(1, ...props.groups.map(g => g.count)))
const size = count => Math.round(30 + 80 * Math.sqrt(count / max.value))
</script>

<style scoped>
.nw-panel { justify-content: center; }

.nw-title { font-size: 64px; text-align: center; }

.nw-wall {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: 14px 46px;
  margin-top: 36px;
  font-family: 'Marcellus SC', serif;
  line-height: 1.05;
}

.nw-name { color: var(--rv-ink); }
.nw-off { color: var(--rv-faint); }
.nw-ok { color: var(--rv-ochre); text-shadow: 0 4px 30px rgb(208 138 69 / 45%); }

.nw-meta { text-align: center; }

.nw-winners {
  margin-top: 40px;
  font-size: 28px;
  text-align: center;
  color: var(--rv-ochre);
  opacity: 0;
}

.nw-winners--on { opacity: 1; }
</style>
