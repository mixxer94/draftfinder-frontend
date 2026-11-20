<template>
  <div class="rv-stage">
    <NameWall
      v-if="item === 'mystery'"
      key="mystery"
      :groups="mystery.groups"
      :answered="mystery.answered"
      :winners="mystery.winners"
      :solved="solved"
    />
    <RankingPanel
      v-else-if="summary && item === 'ranking'"
      key="ranking"
      :rows="summary.rankingPages[page]"
      :page-count="summary.rankingPages.length"
      :max="summary.rankingMax"
    />
    <RecognizedPanel
      v-else-if="summary && item === 'recognized'"
      :key="`recognized-${page}`"
      :entries="summary.recognizedPages[page]"
      :page-count="summary.recognizedPages.length"
      :from="page * summary.recognizedPages[0].length + 1"
      :total="summary.recognized.length"
      :awards="summary.awards"
    />
    <PlayerGuessPanel v-else-if="summary && item === 'players'" key="players" :players="summary.players" />
    <NumberLine
      v-else-if="question?.type === 'NUMBER'"
      :key="question.id"
      :question="question"
      :result="result"
      :solved="solved"
      :users="overview.users"
    />
    <ChoiceBars
      v-else-if="question"
      :key="question.id"
      :question="question"
      :result="result"
      :solved="solved"
      :users="overview.users"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isAccepted, mysteryGroups, mysteryResult, questionResult } from '@/services/gliddencupStats'
import ChoiceBars from './ChoiceBars.vue'
import NameWall from './NameWall.vue'
import NumberLine from './NumberLine.vue'
import PlayerGuessPanel from './PlayerGuessPanel.vue'
import RankingPanel from './RankingPanel.vue'
import RecognizedPanel from './RecognizedPanel.vue'
import { summarize } from './reveal'

/**
 * Eine Folie der Auflösung auf einer Fläche von 1920 × 1080 px: eine
 * Zusatzfrage (ihre ID) oder „mystery“, je mit oder ohne Lösung, oder eine
 * Seite (`page`) der Gesamtauswertungen „recognized“, „players“, „ranking“.
 * Ohne Daten oder mit unbekannter Frage bleibt sie leer.
 */
const props = defineProps({
  tournament: { type: Object, default: null },
  // Aus loadTipsOverview; null, solange die Zuordnung nicht veröffentlicht ist.
  overview: { type: Object, default: null },
  item: { type: String, default: null },
  page: { type: Number, default: 0 },
  solved: { type: Boolean, default: false },
})

const SUMMARIES = ['recognized', 'players', 'ranking']
const ready = computed(() => !!(props.tournament && props.overview))
const question = computed(() => (ready.value && props.item !== 'mystery' && !SUMMARIES.includes(props.item)
  ? props.tournament.questions.find(q => q.id === props.item) ?? null
  : null))
const result = computed(() => question.value && questionResult(question.value, props.overview.users, props.overview.answersByUser))
const summary = computed(() => (ready.value && SUMMARIES.includes(props.item) ? summarize(props.tournament, props.overview) : null))

const mystery = computed(() => {
  if (!ready.value || props.item !== 'mystery') return { groups: [], answered: 0, winners: [] }
  const { users, mysteryByUser } = props.overview
  const accepted = props.tournament.mysteryAnswers
  const r = mysteryResult(users, mysteryByUser, accepted)
  const groups = mysteryGroups(users.map(u => mysteryByUser[u]), props.tournament.participants)
    .map(g => ({ ...g, ok: g.variants.some(([text]) => isAccepted(text, accepted)) }))
  return { groups, answered: r.answered, winners: users.filter(u => r.byUser.get(u)?.points) }
})
</script>

<style>
/*
 * Gemeinsam für alle Auflösungs-Ansichten. Im Vollbild für den Stream die Optik
 * der Spielerkarten: dunkles Panel, doppelte feine Rahmenlinie, Ocker, Marcellus SC.
 * Unter .rv-theme (Auswertungen-Reiter) dieselben Ansichten in den Theme-Farben der Seite.
 * Die *-rgb-Werte stehen mit Komma, damit sie wie Vuetifys --v-theme-* in rgba() passen.
 */
.rv-stage {
  --rv-ink-rgb: 236, 230, 218;
  --rv-accent-rgb: 208, 138, 69;
  --rv-ink: rgb(var(--rv-ink-rgb));
  --rv-dim: #a39d91;
  --rv-faint: #67625b;
  --rv-accent: rgb(var(--rv-accent-rgb));
  --rv-wrong-rgb: 239, 138, 111;
  --rv-badge-rgb: var(--rv-accent-rgb);
  --rv-wrong: rgb(var(--rv-wrong-rgb));
  --rv-miss: #8a847a;
  --rv-miss-2: #57524b;
  --rv-panel: rgb(20 19 23 / 92%);
  --rv-panel-solid: rgb(20 19 23);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1920px;
  height: 1080px;
  color: var(--rv-ink);
  font-family: Roboto, sans-serif;
}

/* Dunkler Grund mit der Kartenrückseite, gedämpft, damit das Panel davor klar steht. */
.rv-backdrop {
  background: linear-gradient(rgb(14 13 17 / 90%), rgb(14 13 17 / 90%)), url('/gliddencup/card.webp') center / cover #0e0d11;
}

/* Alle Panels gleich groß, damit beim Blättern nichts springt. */
.rv-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 1680px;
  height: 1000px;
  padding: 44px 56px;
  background: var(--rv-panel);
  border: 1px solid rgb(255 255 255 / 22%);
  outline: 1px solid rgb(255 255 255 / 10%);
  outline-offset: -10px;
  box-shadow: 0 18px 50px rgb(0 0 0 / 55%);
}

.rv-theme .rv-stage {
  --rv-ink-rgb: var(--v-theme-on-surface);
  --rv-accent-rgb: var(--v-theme-hit);
  --rv-wrong-rgb: var(--v-theme-miss);
  --rv-badge-rgb: var(--v-theme-secondary);
  --rv-dim: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  --rv-faint: rgba(var(--v-theme-on-surface), 0.45);
  --rv-miss: rgba(var(--v-theme-on-surface), 0.45);
  --rv-miss-2: rgba(var(--v-theme-on-surface), 0.25);
  --rv-panel: rgb(var(--v-theme-surface));
  --rv-panel-solid: rgb(var(--v-theme-surface));
}

.rv-theme .rv-backdrop { background: none; }

/* Wie die Karten im Turnierbaum: eine Linie, abgerundet, ohne Schatten. */
.rv-theme .rv-panel {
  border: 2px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  outline: none;
  box-shadow: none;
}

.rv-title {
  margin: 0;
  font-family: 'Marcellus SC', serif;
  font-size: 46px;
  font-weight: 400;
  line-height: 1.15;
  text-wrap: balance;
}

.rv-meta {
  margin-top: 10px;
  font-size: 28px;
  color: var(--rv-dim);
  font-variant-numeric: tabular-nums;
}

.rv-meta b { color: var(--rv-accent); font-weight: 700; }

/* Aufdecken: alles läuft gemeinsam in dieselbe Richtung, ohne Federn. */
.rv-fade { transition: color 0.6s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1); }

@media (prefers-reduced-motion: reduce) {
  .rv-fade { transition: none; }
}
</style>
