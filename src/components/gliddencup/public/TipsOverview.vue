<template>
  <p v-if="!users.length" class="text-medium-emphasis">Es hat noch niemand getippt.</p>

  <div v-else class="tp">
    <nav class="tp-ranking" aria-label="Tipper nach Rangliste">
      <button
        v-for="r in ranking"
        :key="r.user"
        type="button"
        class="tp-entry"
        :class="{ 'tp-entry--active': r === current }"
        :aria-current="r === current || undefined"
        @click="selected = r.user"
      >
        <span class="tp-entry-rank">{{ r.rank }}</span>
        <span class="tp-entry-name">{{ r.user }}</span>
        <span class="tp-entry-points">{{ r.points }}</span>
      </button>
    </nav>

    <section class="tp-panel" :aria-label="`Tipps von ${current.user}`">
      <header class="tp-head">
        <div class="tp-rank" aria-label="Platz">{{ current.rank }}</div>
        <div class="tp-who">
          <h2 class="tp-name">{{ current.user }}</h2>
          <p class="tp-meta">
            {{ current.correct }}/{{ picks.length }} Pseudonyme · {{ current.extra }} aus Zusatzfragen<template v-if="current.solo"> · {{ current.solo }} allein richtig</template>
          </p>
        </div>
        <div class="tp-points"><b>{{ current.points }}</b> Punkte</div>
        <div class="tp-pager">
          <button type="button" class="tp-step" :disabled="index === 0" aria-label="Vorheriger Platz" @click="step(-1)">
            <v-icon icon="mdi-chevron-left" />
          </button>
          <button type="button" class="tp-step" :disabled="index === ranking.length - 1" aria-label="Nächster Platz" @click="step(1)">
            <v-icon icon="mdi-chevron-right" />
          </button>
        </div>
      </header>

      <h3 class="tp-heading">
        Pseudonyme
        <span class="tp-legend"><i class="tp-key tp-hit" />richtig <i class="tp-key tp-miss" />daneben, rechts steht, wer es war</span>
      </h3>
      <ul class="tp-picks">
        <li v-for="p in picks" :key="p.pseudonym" class="tp-pick" :class="p.state">
          <span class="tp-ps">{{ p.pseudonym }}</span>
          <span v-if="p.state !== 'tp-hit'" class="tp-truth">{{ p.truth || '—' }}</span>
          <span v-else-if="p.solo" class="tp-solo">allein</span>
          <span class="tp-guess">{{ p.guess || 'nicht getippt' }}</span>
        </li>
      </ul>

      <h3 class="tp-heading">Zusatzfragen</h3>
      <div class="tp-answers">
        <span class="tp-col">Frage</span>
        <span class="tp-col">Tipp</span>
        <span class="tp-col">Lösung</span>
        <span class="tp-col text-right">Punkte</span>
        <div v-for="a in answers" :key="a.id" class="tp-answer" :class="a.state">
          <span class="tp-question">{{ a.text }}</span>
          <span class="tp-value">{{ a.value === null ? 'nicht getippt' : `${a.value} ${a.unit}` }}</span>
          <span class="tp-solution">{{ a.solution === null ? 'offen' : `${a.solution} ${a.unit}` }}</span>
          <span class="tp-gain">{{ a.points ? `+${a.points}` : '0' }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { summarize } from './reveal/reveal'
import { mysteryResult, questionResult } from '@/services/gliddencupStats'

/**
 * Tipps aller Tipper nach der Veröffentlichung der Zuordnung: links die
 * Rangliste zum Auswählen, rechts alle Tipps des gewählten Tippers auf einen Blick.
 */
const props = defineProps({
  tournament: { type: Object, required: true },
  users: { type: Array, required: true },
  picksByUser: { type: Object, required: true },
  mysteryByUser: { type: Object, default: () => ({}) },
  answersByUser: { type: Object, default: () => ({}) },
})

const summary = computed(() => summarize(props.tournament, props))
const ranking = computed(() => summary.value.ranking.filter(r => !r.crowd))

// Ohne Auswahl der Erste der Rangliste, damit das Panel nie leer ist.
const selected = ref(null)
const index = computed(() => Math.max(0, ranking.value.findIndex(r => r.user === selected.value)))
const current = computed(() => ranking.value[index.value])
const step = d => { selected.value = ranking.value[index.value + d].user }

const byPseudonym = computed(() => new Map(summary.value.recognized.map(p => [p.pseudonym, p])))
const picks = computed(() => {
  const list = props.picksByUser[current.value.user] ?? []
  return props.tournament.pseudonyms.map(pseudonym => {
    const { truth = '', correct = 0 } = byPseudonym.value.get(pseudonym) ?? {}
    const guess = (list.find(p => p.pseudonym === pseudonym)?.playerName ?? '').trim()
    const hit = !!guess && guess === truth
    return { pseudonym, guess, truth, solo: hit && correct === 1, state: hit ? 'tp-hit' : guess ? 'tp-miss' : 'tp-none' }
  })
})

const results = computed(() => [
  ...(props.tournament.questions ?? []).map(q => questionResult(q, props.users, props.answersByUser)),
  mysteryResult(props.users, props.mysteryByUser, props.tournament.mysteryAnswers ?? []),
])
const answers = computed(() => results.value.map(r => {
  const { value = null, points = 0 } = r.byUser.get(current.value.user) ?? {}
  const state = value === null || r.solution === null ? 'tp-none' : points ? 'tp-hit' : 'tp-miss'
  return { id: r.question.id, text: r.question.text, unit: r.question.unit ?? '', solution: r.solution, value, points, state }
}))
</script>

<style scoped>
/* Optik der Auflösung (RevealStage): dunkles Panel vor der Kartenrückseite, Marcellus SC, Ocker für Treffer. Bewusst kleiner und dichter, da zum Lesen statt für den Stream. */
.tp {
  --tp-ink: #ece6da;
  --tp-dim: #a39d91;
  --tp-faint: #67625b;
  --tp-ochre: #d08a45;
  --tp-grey: #8a847a;
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr);
  gap: 20px;
  align-items: start;
  padding: 20px;
  color: var(--tp-ink);
  background: linear-gradient(rgb(14 13 17 / 90%), rgb(14 13 17 / 90%)), url('/gliddencup/card.webp') center / cover #0e0d11;
}

.tp-ranking,
.tp-panel {
  background: rgb(20 19 23 / 92%);
  border: 1px solid rgb(255 255 255 / 22%);
  outline: 1px solid rgb(255 255 255 / 10%);
  outline-offset: -6px;
}

.tp-ranking {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 220px);
  padding: 10px;
  overflow-y: auto;
}

.tp-entry {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  gap: 10px;
  align-items: baseline;
  padding: 4px 8px;
  border-left: 3px solid transparent;
  color: var(--tp-ink);
  text-align: left;
}

.tp-entry:hover { background: rgb(255 255 255 / 5%); }
.tp-entry:focus-visible { outline: 2px solid var(--tp-ochre); outline-offset: -2px; }
.tp-entry--active { border-left-color: var(--tp-ochre); background: rgb(208 138 69 / 14%); }
.tp-entry-rank { color: var(--tp-dim); text-align: right; font-variant-numeric: tabular-nums; }
.tp-entry-name { overflow: hidden; font-family: 'Marcellus SC', serif; white-space: nowrap; text-overflow: ellipsis; }
.tp-entry-points { font-variant-numeric: tabular-nums; }
.tp-entry--active .tp-entry-points { color: var(--tp-ochre); }

.tp-panel { padding: 22px 28px 26px; }

.tp-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 18px;
  align-items: center;
}

.tp-rank { min-width: 2ch; font: 400 2.6rem/1 'Marcellus SC', serif; color: var(--tp-dim); text-align: right; font-variant-numeric: tabular-nums; }
.tp-name { overflow: hidden; margin: 0; font: 400 1.9rem/1.15 'Marcellus SC', serif; white-space: nowrap; text-overflow: ellipsis; }
.tp-meta { margin: 2px 0 0; color: var(--tp-dim); font-variant-numeric: tabular-nums; }
.tp-points { color: var(--tp-dim); white-space: nowrap; }
.tp-points b { margin-right: 6px; font: 400 2.6rem/1 'Marcellus SC', serif; color: var(--tp-ochre); font-variant-numeric: tabular-nums; }

.tp-pager { display: flex; gap: 4px; }

.tp-step {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 4px;
  color: var(--tp-ink);
}

.tp-step:hover:not(:disabled) { border-color: var(--tp-ochre); color: var(--tp-ochre); }
.tp-step:focus-visible { outline: 2px solid var(--tp-ochre); outline-offset: 2px; }
.tp-step:disabled { opacity: 0.3; }

.tp-heading {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
  align-items: baseline;
  margin: 22px 0 10px;
  font: 400 1.25rem 'Marcellus SC', serif;
  color: var(--tp-dim);
}

.tp-legend { font: 400 0.85rem Roboto, sans-serif; }
.tp-key { display: inline-block; width: 12px; height: 12px; margin: 0 6px 0 14px; vertical-align: -1px; }
.tp-key:first-child { margin-left: 0; }

.tp-picks {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  gap: 6px 14px;
  padding: 0;
  list-style: none;
}

/* Farbleiste links wie die Segmente der Auflösung: Ocker richtig, Grau daneben, keine ohne Tipp. */
.tp-pick {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 10px;
  padding: 4px 10px;
  border-left: 4px solid transparent;
  background: rgb(255 255 255 / 4%);
}

.tp-ps { overflow: hidden; font: 400 0.9rem 'Marcellus SC', serif; color: var(--tp-dim); white-space: nowrap; text-overflow: ellipsis; }
.tp-truth,
.tp-solo { max-width: 9rem; overflow: hidden; font-size: 0.85rem; color: var(--tp-dim); white-space: nowrap; text-overflow: ellipsis; }
.tp-solo { color: var(--tp-ochre); }
.tp-guess { grid-column: 1 / -1; overflow: hidden; font-size: 1.05rem; white-space: nowrap; text-overflow: ellipsis; }

.tp-hit.tp-pick,
.tp-hit.tp-answer { border-left-color: var(--tp-ochre); }
.tp-miss.tp-pick,
.tp-miss.tp-answer { border-left-color: var(--tp-grey); }
.tp-hit .tp-guess,
.tp-hit .tp-gain { color: var(--tp-ochre); }
.tp-none .tp-guess { color: var(--tp-faint); font-style: italic; }
.tp-key.tp-hit { background: var(--tp-ochre); }
.tp-key.tp-miss { background: var(--tp-grey); }

/* Die Zeilen übernehmen die Spalten des Rasters, damit Tipp und Lösung über alle Fragen bündig stehen. */
.tp-answers {
  display: grid;
  grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1fr) 4rem;
  row-gap: 4px;
}

.tp-col { padding: 0 10px 2px 14px; font-size: 0.8rem; color: var(--tp-faint); }
.tp-col + .tp-col { padding-left: 10px; }

.tp-answer {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;
  align-items: baseline;
  padding: 5px 10px;
  border-left: 4px solid transparent;
  background: rgb(255 255 255 / 4%);
}

.tp-answer > span { padding-right: 10px; }
.tp-question { color: var(--tp-dim); }
.tp-solution { color: var(--tp-dim); }
.tp-none .tp-value { color: var(--tp-faint); font-style: italic; }
.tp-gain { text-align: right; color: var(--tp-faint); font-variant-numeric: tabular-nums; }

@media (max-width: 959px) {
  .tp { grid-template-columns: minmax(0, 1fr); padding: 10px; }
  .tp-ranking { max-height: 11rem; }
  .tp-panel { padding: 16px; }
  .tp-head { grid-template-columns: auto minmax(0, 1fr) auto; }
  .tp-points { grid-column: 2; grid-row: 2; }
  .tp-pager { grid-row: 1 / 3; grid-column: 3; flex-direction: column; }
  .tp-rank, .tp-points b { font-size: 2rem; }
  .tp-name { font-size: 1.5rem; }
}

@media (max-width: 599px) {
  .tp-answers { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 3rem; }
  .tp-col:first-child { display: none; }
  .tp-question { grid-column: 1 / -1; }
}
</style>
