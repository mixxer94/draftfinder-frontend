<template>
  <p v-if="!users.length" class="text-medium-emphasis">Ohne Tipps gibt es nichts auszuwerten.</p>

  <v-row v-else>
    <v-col cols="12" md="3">
      <v-btn
        block
        color="secondary"
        variant="flat"
        prepend-icon="mdi-presentation-play"
        class="mb-4"
        @click="showOpen = true"
      >
        Auflösung im Vollbild
      </v-btn>
      <RevealShow
        v-model:open="showOpen"
        :tournament="tournament"
        :overview="overview"
        :start="view === 'questions' ? null : view"
      />
      <v-select
        v-if="!mdAndUp"
        v-model="view"
        :items="VIEWS"
        item-title="title"
        item-value="value"
        label="Auswertung"
        density="comfortable"
        hide-details
      />
      <v-list v-else density="compact" nav class="py-0" bg-color="transparent" aria-label="Auswertungen">
        <v-list-item
          v-for="v in VIEWS"
          :key="v.value"
          :active="view === v.value"
          color="secondary"
          :title="v.title"
          @click="view = v.value"
        />
      </v-list>
    </v-col>

    <v-col cols="12" md="9">
      <!-- Der Titel steht schon im gewählten Menüpunkt; sichtbar wäre er doppelt. -->
      <h2 class="d-sr-only">{{ current.title }}</h2>
      <!-- Die Folien erklären sich selbst; die Tabellen in der schmalen Ansicht brauchen den Hinweis. -->
      <p v-if="!mdAndUp && current.text" class="text-body-2 text-medium-emphasis mb-4">{{ current.text }}</p>

      <!-- Ab mittlerer Breite dieselben Folien wie im Vollbild; schmaler wären sie zu klein zum Lesen, dort bleiben die Tabellen. -->
      <SlidePager v-if="mdAndUp && view === 'questions'" :slides="slides" :label="current.title">
        <template #default="{ slide }">
          <StageFit>
            <RevealStage
              :tournament="tournament"
              :overview="overview"
              :item="slide.item"
              :page="slide.page"
              :solvable="slide.solvable"
              :solved="slide.solvable && shownSolutions.has(slide.item)"
              @toggle="toggleSolution(slide.item)"
            />
          </StageFit>
        </template>
      </SlidePager>
      <template v-else-if="mdAndUp">
        <StageFit>
          <RevealStage :tournament="tournament" :overview="overview" :item="view" :page="page" />
        </StageFit>
        <div v-if="pageCount > 1" class="d-flex align-center justify-end ga-1 mt-1">
          <v-btn icon="mdi-chevron-left" size="small" variant="text" :disabled="page === 0" aria-label="Vorherige Seite" @click="page--" />
          <span class="text-body-2 text-medium-emphasis gc-page">{{ page + 1 }} / {{ pageCount }}</span>
          <v-btn icon="mdi-chevron-right" size="small" variant="text" :disabled="page === pageCount - 1" aria-label="Nächste Seite" @click="page++" />
        </div>
      </template>

      <v-table v-else-if="view === 'ranking'" density="compact">
        <thead>
          <tr>
            <th class="gc-rank">#</th>
            <th>Tipper</th>
            <th class="text-right">Punkte</th>
            <th class="text-right">Pseudonyme</th>
            <th class="text-right">Zusatzfragen</th>
            <th class="text-right">Allein richtig</th>
            <th class="text-right">Quote</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in summary.ranking" :key="u.crowd ? '' : u.user" :class="{ 'gc-crowd': u.crowd }">
            <td class="gc-rank text-medium-emphasis">{{ u.rank }}</td>
            <td>{{ u.crowd ? 'Die Community (Mehrheitstipp)' : u.user }}</td>
            <td class="text-right font-weight-medium">{{ u.crowd ? '' : u.points }}</td>
            <td class="text-right">{{ u.correct }} / {{ total }}</td>
            <td class="text-right">{{ u.crowd ? '' : u.extra }}</td>
            <td class="text-right">{{ u.crowd ? '' : u.solo }}</td>
            <td class="text-right">{{ pct((u.correct / (total || 1)) * 100) }}</td>
          </tr>
        </tbody>
      </v-table>

      <template v-else-if="view === 'questions'">
        <section v-for="r in results" :key="r.question.id" class="mb-6">
          <div class="d-flex align-start ga-4 mb-1">
            <h3 class="text-subtitle-1 font-weight-medium flex-grow-1">
              {{ r.question.text }} <span class="text-medium-emphasis font-weight-regular">({{ tipsText(r.answered) }})</span>
            </h3>
            <v-btn
              v-if="r.solution !== null"
              size="small"
              variant="outlined"
              color="secondary"
              class="flex-shrink-0"
              @click="toggleSolution(r.question.id)"
            >
              {{ isShown(r) ? 'Lösung verbergen' : 'Lösung zeigen' }}
            </v-btn>
          </div>
          <p v-if="isShown(r)" class="text-body-2 mb-2">
            <strong class="text-success">{{ r.solution }} {{ r.question.unit }}</strong><template v-if="winnersOf(r).length">
              <br>Korrekt: {{ winnersOf(r).join(', ') }}
            </template>
          </p>
          <v-chip
            v-for="[value, count] in r.counts"
            :key="value"
            size="small"
            label
            class="ma-1"
            :variant="isShown(r) && value === r.solution ? 'flat' : 'tonal'"
            :color="isShown(r) && value === r.solution ? 'success' : undefined"
          >
            {{ value }} × {{ count }}
          </v-chip>
        </section>
        <section>
          <div class="d-flex align-start ga-4 mb-1">
            <h3 class="text-subtitle-1 font-weight-medium flex-grow-1">
              Wer ist Guy Glidden? <span class="text-medium-emphasis font-weight-regular">({{ tipsText(mystery.answered) }})</span>
            </h3>
            <v-btn
              v-if="mystery.solution !== null"
              size="small"
              variant="outlined"
              color="secondary"
              class="flex-shrink-0"
              @click="toggleSolution('mystery')"
            >
              {{ isShown(mystery) ? 'Lösung verbergen' : 'Lösung zeigen' }}
            </v-btn>
          </div>
          <p class="text-body-2 text-medium-emphasis mb-2">Gleiche Namen in anderer Schreibweise oder mit Tippfehler sind zusammengefasst.</p>
          <p v-if="isShown(mystery)" class="text-body-2 mb-2">
            <strong class="text-success">{{ mystery.solution }}</strong><template v-if="winnersOf(mystery).length">
              <br>Korrekt: {{ winnersOf(mystery).join(', ') }}</template>
          </p>
          <v-chip v-for="g in mysteryList" :key="g.label" size="small" label variant="tonal" class="ma-1">
            {{ g.label }} × {{ g.count }}
          </v-chip>
        </section>
      </template>

      <template v-else-if="view === 'recognized'">
        <div v-if="summary.confusions.length" class="mb-4">
          <h3 class="text-subtitle-1 font-weight-medium mb-1">Größte Verwechslungen</h3>
          <ol class="gc-list">
            <li v-for="c in summary.confusions" :key="`${c.pseudonym}→${c.guess}`">
              <strong>{{ c.pseudonym }}</strong> ({{ c.truth }}) wurde {{ c.count }}× für <strong>{{ c.guess }}</strong> gehalten
            </li>
          </ol>
        </div>
        <v-table density="compact">
          <thead>
            <tr><th>Pseudonym</th><th class="text-right">Richtig</th><th>Tipps</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in summary.recognized" :key="p.pseudonym">
              <td><PseudonymCell :pseudonym="p.pseudonym" :truth="p.truth" /></td>
              <td class="text-right text-no-wrap">{{ pct(p.pct) }}</td>
              <td class="py-1">
                <v-chip
                  v-for="[name, count] in p.guesses"
                  :key="name"
                  size="small"
                  label
                  class="ma-1"
                  :variant="name === p.truth ? 'flat' : 'tonal'"
                  :color="name === p.truth ? 'success' : undefined"
                >
                  {{ name }} × {{ count }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </template>

      <template v-else-if="view === 'players'">
        <p v-if="!summary.players.total" class="text-medium-emphasis">Es sind noch keine Vermutungen aufgedeckt.</p>
        <template v-else>
          <p class="mb-3">
            Die Spieler lagen bei <strong>{{ summary.players.correct }} von {{ summary.players.total }}</strong> Vermutungen richtig
            ({{ pct(summary.players.pct) }}). Die Tipper haben dieselben Gegner zu {{ pct(summary.players.spectatorPct) }} erkannt.
          </p>
          <v-table density="compact">
            <thead>
              <tr><th class="gc-rank">#</th><th>Vermutet wurde</th><th class="text-right">Anzahl</th><th class="text-right">Davon richtig</th></tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in summary.players.ranking" :key="p.name">
                <td class="gc-rank text-medium-emphasis">{{ i + 1 }}</td>
                <td>{{ p.name }}</td>
                <td class="text-right">{{ p.count }}</td>
                <td class="text-right">{{ p.correct }}</td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </template>

    </v-col>
  </v-row>
</template>

<script setup>
import { computed, h, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import RevealShow from './reveal/RevealShow.vue'
import RevealStage from './reveal/RevealStage.vue'
import SlidePager from './reveal/SlidePager.vue'
import StageFit from './reveal/StageFit.vue'
import { pct, summarize } from './reveal/reveal'
import { mysteryGroups, mysteryResult, questionResult } from '@/services/gliddencupStats'

/** Auswertungen des Tippspiels; erst mit veröffentlichter Zuordnung sinnvoll. */
const props = defineProps({
  tournament: { type: Object, required: true },
  users: { type: Array, required: true },
  picksByUser: { type: Object, required: true },
  mysteryByUser: { type: Object, default: () => ({}) },
  answersByUser: { type: Object, default: () => ({}) },
})

// Die Rangliste steht zuletzt: Wer die Auswertung öffnet, soll nicht als Erstes das Endergebnis sehen.
// „Wer ist Guy Glidden?“ gehört zu den Zusatzfragen, wie beim Tippen.
const VIEWS = [
  { value: 'questions', title: 'Zusatzfragen', text: '' },
  { value: 'recognized', title: 'Wer wurde erkannt?', text: 'Wer hinter welchem Pseudonym steckte und wie viele es erkannt haben, am häufigsten erkannt zuerst.' },
  { value: 'players', title: 'Spieler-Vermutungen', text: 'Wen die Spieler nach ihrem Match hinter ihrem Gegner vermutet haben.' },
  { value: 'ranking', title: 'Rangliste', text: 'Ein Punkt je richtigem Pseudonym plus die Punkte aus Zusatzfragen und Guy Glidden. „Allein richtig“ zählt Treffer, die sonst niemand hatte; „Die Community“ tippt je Pseudonym den häufigsten Namen.' },
]

const { mdAndUp } = useDisplay()
const showOpen = ref(false)
const view = ref(VIEWS[0].value)
const current = computed(() => VIEWS.find(v => v.value === view.value))
const overview = computed(() => ({
  users: props.users,
  picksByUser: props.picksByUser,
  answersByUser: props.answersByUser,
  mysteryByUser: props.mysteryByUser,
}))
const summary = computed(() => summarize(props.tournament, overview.value))
const results = computed(() => (props.tournament.questions ?? [])
  .map(q => questionResult(q, props.users, props.answersByUser)))
const mystery = computed(() => mysteryResult(props.users, props.mysteryByUser, props.tournament.mysteryAnswers ?? []))
const mysteryList = computed(() => mysteryGroups(props.users.map(u => props.mysteryByUser[u]).filter(Boolean), props.tournament.participants))
const winnersOf = r => props.users.filter(u => r.byUser.get(u)?.points)
const tipsText = n => `${n} ${n === 1 ? 'Tipp' : 'Tipps'}`
const total = computed(() => props.tournament.pseudonyms.length)

// Lösungen erst auf Klick, damit man beim Stream mitraten kann, statt sie hier vorher zu lesen.
const shownSolutions = ref(new Set())
const isShown = r => r.solution !== null && shownSolutions.value.has(r.question.id)
function toggleSolution (id) {
  const next = new Set(shownSolutions.value)
  if (!next.delete(id)) next.add(id)
  shownSolutions.value = next
}

// Die Zusatzfragen werden als Folien geblättert, Guy Glidden zuletzt.
const slides = computed(() => [...results.value, mystery.value]
  .map(r => ({ key: r.question.id, item: r.question.id, solvable: r.solution !== null })))

// Rangliste und „Wer wurde erkannt?“ haben ab 17 Einträgen mehrere Seiten.
const page = ref(0)
const pageCount = computed(() => ({
  ranking: summary.value.rankingPages.length,
  recognized: summary.value.recognizedPages.length,
})[view.value] ?? 1)
watch(view, () => { page.value = 0 })

/** Pseudonym mit dem Klarnamen darunter, in allen Tabellen gleich. */
const PseudonymCell = p => h('div', [
  h('div', { class: 'font-weight-medium' }, p.pseudonym),
  h('div', { class: 'text-caption text-medium-emphasis' }, p.truth || '—'),
])
PseudonymCell.props = ['pseudonym', 'truth']
</script>

<style scoped>
.gc-rank { width: 4.5rem; }
.gc-list { padding-left: 1.25rem; }
.gc-page { min-width: 4.5em; text-align: center; font-variant-numeric: tabular-nums; }
.gc-crowd { font-style: italic; background: rgba(var(--v-theme-secondary), 0.08); }
</style>
