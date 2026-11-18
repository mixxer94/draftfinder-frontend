<template>
  <div class="rv-stage">
    <Transition name="rv-swap" mode="out-in">
      <NameWall
        v-if="item === 'mystery'"
        key="mystery"
        :groups="mystery.groups"
        :answered="mystery.answered"
        :winners="mystery.winners"
        :solved="solved"
      />
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
    </Transition>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isAccepted, mysteryGroups, mysteryResult, questionResult } from '@/services/gliddencupStats'
import ChoiceBars from './ChoiceBars.vue'
import NameWall from './NameWall.vue'
import NumberLine from './NumberLine.vue'

/**
 * Eine Folie der Auflösung: Zusatzfrage oder „Wer ist Guy Glidden?“ auf einer
 * Fläche von 1920 × 1080 px, mit oder ohne Lösung. Ohne Daten oder mit
 * unbekannter Frage bleibt sie leer. Skaliert wird sie von RevealShow.
 */
const props = defineProps({
  tournament: { type: Object, default: null },
  // Aus loadTipsOverview; null, solange die Zuordnung nicht veröffentlicht ist.
  overview: { type: Object, default: null },
  item: { type: String, default: null },
  solved: { type: Boolean, default: false },
})

const ready = computed(() => !!(props.tournament && props.overview))
const question = computed(() => (ready.value && props.item !== 'mystery'
  ? props.tournament.questions.find(q => q.id === props.item) ?? null
  : null))
const result = computed(() => question.value && questionResult(question.value, props.overview.users, props.overview.answersByUser))

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

.rv-panel {
  position: relative;
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

/* Aufdecken: alles läuft gemeinsam in dieselbe Richtung, ohne Federn. */
.rv-fade { transition: color 0.6s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1); }

.rv-swap-enter-active,
.rv-swap-leave-active { transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

.rv-swap-enter-from,
.rv-swap-leave-to { opacity: 0; transform: translateY(16px); }

@media (prefers-reduced-motion: reduce) {
  .rv-fade,
  .rv-swap-enter-active,
  .rv-swap-leave-active { transition: none; }
}
</style>
