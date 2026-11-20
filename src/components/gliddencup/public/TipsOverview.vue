<template>
  <p v-if="!users.length" class="text-medium-emphasis">Es hat noch niemand getippt.</p>

  <div v-else class="tp gc-stepper" tabindex="0" aria-label="Tipps, mit Pfeiltasten blättern" @keydown="onKey">
    <v-select
      v-if="!mdAndUp"
      :model-value="current.user"
      :items="ranking"
      :item-title="r => `${r.rank}. ${r.user} · ${r.points} Punkte`"
      item-value="user"
      label="Tipper"
      density="comfortable"
      hide-details
      @update:model-value="selected = $event"
    />
    <nav v-else ref="rankingNav" class="tp-ranking" aria-label="Tipper nach Rangliste">
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
        <span class="tp-num">{{ r.points }}</span>
      </button>
    </nav>

    <section :aria-label="`Tipps von ${current.user}`">
      <!-- Kopf des Tippers: Platz als Kästchen wie die Ergebnisse im Turnierbaum, Name größer als die Abschnittsüberschriften. -->
      <header class="tp-head">
        <span class="tp-rank tp-num" :aria-label="`Platz ${current.rank}`">{{ current.rank }}</span>
        <div>
          <h2 class="tp-name">{{ current.user }}</h2>
          <span class="text-body-2 text-medium-emphasis tp-num">{{ current.points }} Punkte</span>
        </div>
      </header>

      <!-- Dieselben drei Spalten wie im Tippformular: Frage, Tipp, Lösung; die Kopfzeile benennt die Spalten. -->
      <div class="tp-row tp-row--head mt-6">
        <span class="d-flex align-center ga-3">
          <h3 class="tp-h3">Zusatzfragen</h3>
          <span class="text-body-2 text-medium-emphasis tp-num">{{ current.extra }}/{{ answers.length }}</span>
        </span>
        <span class="tp-col">Tipp</span>
        <span class="tp-col">Lösung</span>
      </div>
      <div v-for="a in answers" :key="a.id" class="tp-row">
        <span>{{ a.text }}</span>
        <div class="tp-answer" :class="a.state" :title="a.tip">
          <v-icon v-if="a.state !== 'tp-none'" :icon="a.state === 'tp-hit' ? 'mdi-check' : 'mdi-close'" size="18" />
          <span class="tp-ellipsis">{{ a.tip }}</span>
        </div>
        <span class="text-body-2 tp-ellipsis" :title="a.solutionText">{{ a.solutionText }}</span>
      </div>

      <div class="tp-section d-flex align-center flex-wrap ga-3 py-3 mt-6">
        <h3 class="tp-h3">Pseudonyme</h3>
        <span class="text-body-2 text-medium-emphasis tp-num">{{ current.correct }}/{{ picks.length }}</span>
        <span v-if="current.solo" class="text-body-2 text-medium-emphasis">· {{ current.solo }} allein richtig</span>
      </div>
      <!-- Dieselben Felder und Farben wie im Tippen-Reiter. -->
      <v-row dense class="mt-2">
        <v-col v-for="p in picks" :key="p.pseudonym" cols="6" md="4" lg="3">
          <v-text-field
            :model-value="p.guess"
            :label="p.pseudonym"
            :base-color="p.state || undefined"
            :hint="p.hint"
            persistent-hint
            persistent-placeholder
            placeholder="nicht getippt"
            readonly
            density="comfortable"
            :class="['gc-pick', p.state && `gc-pick--${p.state}`]"
          />
        </v-col>
      </v-row>
      <div class="d-flex flex-wrap ga-4 mt-3 text-body-2 text-medium-emphasis">
        <span v-for="l in pickLegend(true)" :key="l.state" class="d-flex align-center ga-2">
          <span :class="['gc-swatch', `gc-pick--${l.state}`]" />{{ l.text }}
        </span>
      </div>

      <!-- Klebt am unteren Bildschirmrand, damit Weiterblättern ohne Scrollen geht. -->
      <StepBar
        class="tp-bar mt-6"
        :position="`Tipper ${index + 1} von ${ranking.length}`"
        next-label="Nächster Tipper"
        :can-back="index > 0"
        :can-next="index < ranking.length - 1"
        @back="step(-1)"
        @next="step(1)"
      />
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { summarize } from './reveal/reveal'
import { mysteryResult, questionResult } from '@/services/gliddencupStats'
import { pickLegend, pickStateOf } from './pickStates'
import StepBar, { onStepKey } from './StepBar.vue'
import './pickStates.css'

/**
 * Tipps aller Tipper nach der Veröffentlichung der Zuordnung, in der Optik des
 * Tippformulars nach Tippschluss: links die Rangliste zum Auswählen, rechts
 * die bewerteten Tipps des gewählten Tippers.
 */
const props = defineProps({
  tournament: { type: Object, required: true },
  users: { type: Array, required: true },
  picksByUser: { type: Object, required: true },
  mysteryByUser: { type: Object, default: () => ({}) },
  answersByUser: { type: Object, default: () => ({}) },
})

const { mdAndUp } = useDisplay()

const summary = computed(() => summarize(props.tournament, props))
const ranking = computed(() => summary.value.ranking.filter(r => !r.crowd))

// Ohne Auswahl der Erste der Rangliste, damit nie nichts zu sehen ist.
const selected = ref(null)
const index = computed(() => Math.max(0, ranking.value.findIndex(r => r.user === selected.value)))
const current = computed(() => ranking.value[index.value])
function step (d) {
  const next = ranking.value[index.value + d]
  if (next) selected.value = next.user
}
const onKey = e => onStepKey(e, { back: () => step(-1), next: () => step(1) })

// Beim Blättern mit Tasten bleibt der gewählte Tipper in der Rangliste sichtbar.
const rankingNav = ref(null)
watch(current, async () => {
  await nextTick()
  rankingNav.value?.querySelector('.tp-entry--active')?.scrollIntoView({ block: 'nearest' })
})

const byPseudonym = computed(() => new Map(summary.value.recognized.map(p => [p.pseudonym, p])))
const picks = computed(() => {
  const list = props.picksByUser[current.value.user] ?? []
  return props.tournament.pseudonyms.map(pseudonym => {
    const { truth = '', correct = 0 } = byPseudonym.value.get(pseudonym) ?? {}
    const guess = (list.find(p => p.pseudonym === pseudonym)?.playerName ?? '').trim()
    const hit = !!guess && guess === truth
    // Unter dem Feld wie im Tippen-Reiter, wer es war; bei Treffern, ob sonst niemand richtig lag.
    const hint = hit ? (correct === 1 ? 'allein richtig' : '') : `war ${truth || '—'}`
    return { pseudonym, guess, hint, state: pickStateOf(guess, truth) }
  })
})

const results = computed(() => [
  ...(props.tournament.questions ?? []).map(q => questionResult(q, props.users, props.answersByUser)),
  mysteryResult(props.users, props.mysteryByUser, props.tournament.mysteryAnswers ?? []),
])
const answers = computed(() => results.value.map(r => {
  const { value = null, points = 0 } = r.byUser.get(current.value.user) ?? {}
  const state = value === null || r.solution === null ? 'tp-none' : points ? 'tp-hit' : 'tp-miss'
  // Bei Zahlenfragen gewinnt der nächste Tipp; ein Treffer muss die Lösung also nicht genau getroffen haben.
  const showSolution = !points || (r.question.type === 'NUMBER' && value !== r.solution)
  const unit = r.question.unit ? ` ${r.question.unit}` : ''
  return {
    id: r.question.id,
    text: r.question.text,
    tip: value === null ? 'nicht getippt' : `${value}${unit}`,
    solutionText: !showSolution ? '' : r.solution === null ? 'offen' : `${r.solution}${unit}`,
    state,
  }
}))
</script>

<style scoped>
.tp {
  display: grid;
  grid-template-columns: 15rem minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.tp-num { font-variant-numeric: tabular-nums; }
.tp-h3 { margin: 0; font-size: 1rem; font-weight: 600; line-height: 1.4; }

/* Wie die Navigationsliste der Auswertungen (v-list nav), plus Platz und Punkte. */
.tp-bar {
  position: sticky;
  bottom: 0;
  z-index: 1;
  padding: 8px 0;
  background: rgb(var(--v-theme-background));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.tp-ranking {
  position: sticky;
  top: 64px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: calc(100vh - 96px);
  overflow-y: auto;
}

.tp-entry {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 4px;
  text-align: left;
  transition: background-color 120ms ease-out;
}

.tp-entry:hover { background: rgba(var(--v-theme-on-surface), 0.04); }
.tp-entry:focus-visible { outline: 2px solid rgb(var(--v-theme-secondary)); outline-offset: -2px; }
.tp-entry--active { background: rgba(var(--v-theme-secondary), 0.14); color: rgb(var(--v-theme-secondary)); font-weight: 500; }
.tp-entry-rank { text-align: right; font-variant-numeric: tabular-nums; color: rgba(var(--v-theme-on-surface), var(--v-disabled-opacity)); }
.tp-entry-name { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

/* Spaltenbreiten wie .gc-row in TipForm, damit beide Reiter gleich aussehen. */
/* Tipp und Lösung einzeilig, damit die Zeilen beim Blättern zwischen Tippern nicht springen; der volle Text steht im title. */
.tp-row {
  max-width: 54rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 13rem 11rem;
  gap: 4px 16px;
  align-items: center;
  padding: 8px 0;
}

.tp-row + .tp-row { border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.tp-row--head { padding-bottom: 4px; }
.tp-col { font-size: 0.8125rem; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); }

.tp-head { display: flex; align-items: center; gap: 16px; }
.tp-name { margin: 0; font-size: 1.5rem; font-weight: 600; line-height: 1.25; }

/* Wie ein gewonnenes Ergebnis im Turnierbaum: Petrol gefüllt, Ziffern gleich breit. */
.tp-rank {
  display: grid;
  place-items: center;
  min-width: 48px;
  height: 48px;
  padding: 0 8px;
  border-radius: 8px;
  background: rgb(var(--v-theme-secondary));
  color: rgb(var(--v-theme-on-secondary));
  font-size: 1.375rem;
  font-weight: 700;
}

.tp-section {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

/* Wie die geschlossenen Antworten im Tippformular: Text statt Feld, in den Farben der Pseudonym-Felder. */
.tp-answer { display: flex; align-items: center; gap: 6px; min-width: 0; min-height: 40px; }
.tp-answer.tp-hit { color: rgb(var(--v-theme-hit)); font-weight: 500; }
.tp-answer.tp-miss { color: rgb(var(--v-theme-miss)); }
.tp-answer.tp-none { font-style: italic; color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); }

/* Kleiner als ein getippter Name, damit leere und getippte Felder unterscheidbar bleiben. */
.gc-pick :deep(input::placeholder) { font-size: 0.8125rem; font-style: italic; }

@media (max-width: 959px) {
  .tp { grid-template-columns: minmax(0, 1fr); }
}

/* Schmal: Frage, darunter Tipp und Lösung nebeneinander. */
@media (max-width: 640px) {
  .tp-row { grid-template-columns: minmax(0, 1fr) 8rem; padding: 10px 0; }
  .tp-row > :first-child { grid-column: 1 / -1; }
  .tp-name { font-size: 1.25rem; }
}
</style>
