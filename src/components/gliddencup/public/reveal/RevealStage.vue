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
    <!-- Sitzt in der unteren rechten Ecke des Panels; alle Panels sind gleich groß. -->
    <button v-if="solvable" type="button" class="rv-solve" @click.stop="emit('toggle')">
      {{ solved ? 'Lösung verbergen' : 'Lösung zeigen' }}
    </button>
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
 * Ohne Daten oder mit unbekannter Frage bleibt sie leer. Mit `solvable` gibt
 * es in der Folie einen Knopf, der `toggle` meldet.
 */
const props = defineProps({
  tournament: { type: Object, default: null },
  // Aus loadTipsOverview; null, solange die Zuordnung nicht veröffentlicht ist.
  overview: { type: Object, default: null },
  item: { type: String, default: null },
  page: { type: Number, default: 0 },
  solved: { type: Boolean, default: false },
  solvable: { type: Boolean, default: false },
})
const emit = defineEmits(['toggle'])

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
/* Gemeinsam für alle Auflösungs-Ansichten; Optik der Spielerkarten: dunkles Panel, doppelte feine Rahmenlinie, Marcellus SC. */
.rv-stage {
  --rv-ink: #ece6da;
  --rv-dim: #a39d91;
  --rv-faint: #67625b;
  --rv-ochre: #d08a45;
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
  background: rgb(20 19 23 / 92%);
  border: 1px solid rgb(255 255 255 / 22%);
  outline: 1px solid rgb(255 255 255 / 10%);
  outline-offset: -10px;
  box-shadow: 0 18px 50px rgb(0 0 0 / 55%);
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

.rv-meta b { color: var(--rv-ochre); font-weight: 700; }

/* Wie der Hauptknopf der Vollbild-Leiste, in der unteren rechten Ecke des Panels (1680 × 1000, mittig). */
.rv-solve {
  position: absolute;
  right: 160px;
  bottom: 64px;
  padding: 12px 28px;
  border: 1px solid var(--rv-ochre);
  border-radius: 4px;
  background: rgb(20 19 23 / 92%);
  color: var(--rv-ochre);
  font: 500 26px Roboto, sans-serif;
  cursor: pointer;
}

.rv-solve:hover { background: rgb(208 138 69 / 14%); }
.rv-solve:focus-visible { outline: 3px solid var(--rv-ochre); outline-offset: 3px; }

/* Aufdecken: alles läuft gemeinsam in dieselbe Richtung, ohne Federn. */
.rv-fade { transition: color 0.6s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1); }

@media (prefers-reduced-motion: reduce) {
  .rv-fade { transition: none; }
}
</style>
