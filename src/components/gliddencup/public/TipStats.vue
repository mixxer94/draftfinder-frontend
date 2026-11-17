<template>
  <p v-if="!users.length" class="text-medium-emphasis">Ohne Tipps gibt es nichts auszuwerten.</p>

  <v-row v-else>
    <v-col cols="12" md="3">
      <v-select
        v-if="!mdAndUp"
        v-model="view"
        :items="views"
        item-title="title"
        item-value="value"
        label="Auswertung"
        density="comfortable"
        hide-details
      />
      <v-list v-else density="compact" nav class="py-0" bg-color="transparent" aria-label="Auswertungen">
        <v-list-item
          v-for="v in views"
          :key="v.value"
          :active="view === v.value"
          color="secondary"
          :title="v.title"
          @click="view = v.value"
        />
      </v-list>
    </v-col>

    <v-col cols="12" md="9">
      <h2 class="hc-h2">{{ current.title }}</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">{{ current.text }}</p>

      <v-table v-if="view === 'ranking'" density="compact">
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
          <tr v-for="u in rankingRows" :key="u.crowd ? '' : u.user" :class="{ 'gc-crowd': u.crowd }">
            <td class="gc-rank text-medium-emphasis">{{ u.rank }}</td>
            <td>{{ u.crowd ? 'Schwarm (Mehrheitstipp)' : u.user }}</td>
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
          <h3 class="text-subtitle-1 font-weight-medium mb-1">{{ r.question.text }}</h3>
          <p class="text-body-2 mb-2">
            <template v-if="r.solution !== null">Lösung: <strong>{{ r.solution }} {{ r.question.unit }}</strong> · </template>
            {{ r.answered }} von {{ users.length }} Tippern haben geantwortet<template v-if="winnersOf(r).length">
              · {{ r.question.points }} {{ r.question.points === 1 ? 'Punkt' : 'Punkte' }} für {{ winnersOf(r).join(', ') }}
            </template>
          </p>
          <v-chip
            v-for="[value, count] in r.counts"
            :key="value"
            size="small"
            label
            class="ma-1"
            :variant="value === r.solution ? 'flat' : 'tonal'"
            :color="value === r.solution ? 'success' : undefined"
          >
            {{ value }} × {{ count }}
          </v-chip>
        </section>
      </template>

      <template v-else-if="view === 'distribution'">
        <p class="mb-3">Im Schnitt <strong>{{ avg.toFixed(2).replace('.', ',') }}</strong> von {{ total }} richtig.</p>
        <v-table density="compact">
          <thead>
            <tr><th class="text-right gc-rank">Richtig</th><th class="text-right gc-rank">Tipper</th><th><span class="d-sr-only">Anteil</span></th></tr>
          </thead>
          <tbody>
            <tr v-for="row in dist" :key="row.correct">
              <td class="text-right">{{ row.correct }}</td>
              <td class="text-right">{{ row.users }}</td>
              <td>
                <div class="gc-bar" :style="{ width: `${(row.users / maxBucket) * 100}%` }" />
              </td>
            </tr>
          </tbody>
        </v-table>
      </template>

      <template v-else-if="view === 'chameleons'">
        <div v-if="topConfusions.length" class="mb-4">
          <h3 class="text-subtitle-1 font-weight-medium mb-1">Größte Verwechslungen</h3>
          <ol class="gc-list">
            <li v-for="c in topConfusions" :key="`${c.pseudonym}→${c.guess}`">
              <strong>{{ c.pseudonym }}</strong> ({{ c.truth }}) wurde {{ c.count }}× für <strong>{{ c.guess }}</strong> gehalten
            </li>
          </ol>
        </div>
        <v-table density="compact">
          <thead>
            <tr><th>Pseudonym</th><th class="text-right">Richtig</th><th>Tipps</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in chameleonList" :key="p.pseudonym">
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
        <p v-if="!players.total" class="text-medium-emphasis">Es sind noch keine Vermutungen aufgedeckt.</p>
        <template v-else>
          <p class="mb-3">
            Die Spieler lagen bei <strong>{{ players.correct }} von {{ players.total }}</strong> Vermutungen richtig
            ({{ pct(players.pct) }}). Die Zuschauer haben dieselben Gegner zu {{ pct(players.spectatorPct) }} erkannt.
          </p>
          <v-table density="compact">
            <thead>
              <tr><th class="gc-rank">#</th><th>Vermutet wurde</th><th class="text-right">Anzahl</th><th class="text-right">Davon richtig</th></tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in players.ranking" :key="p.name">
                <td class="gc-rank text-medium-emphasis">{{ i + 1 }}</td>
                <td>{{ p.name }}</td>
                <td class="text-right">{{ p.count }}</td>
                <td class="text-right">{{ p.correct }}</td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </template>

      <template v-else-if="view === 'mystery'">
        <p v-if="!mysteryList.length" class="text-medium-emphasis">Niemand hat auf Guy Glidden getippt.</p>
        <template v-else>
          <p class="mb-3">
            {{ mysteryAnswers.length }} von {{ users.length }} Tippern haben eine Antwort abgegeben.
            <template v-if="mystery.solution">
              1 Punkt für: <strong>{{ mystery.solution }}</strong><template v-if="winnersOf(mystery).length"> – das hatten {{ winnersOf(mystery).join(', ') }}</template>.
            </template>
          </p>
          <v-table density="compact">
            <thead>
              <tr><th>Antwort</th><th class="text-right">Tipps</th><th>Schreibweisen</th></tr>
            </thead>
            <tbody>
              <tr v-for="g in mysteryList" :key="g.label">
                <td class="font-weight-medium">{{ g.label }}</td>
                <td class="text-right">{{ g.count }}</td>
                <td class="py-1">
                  <template v-if="g.variants.length > 1 || g.variants[0][0] !== g.label">
                    <v-chip v-for="[text, count] in g.variants" :key="text" size="small" label variant="tonal" class="ma-1">
                      {{ text }} × {{ count }}
                    </v-chip>
                  </template>
                </td>
              </tr>
            </tbody>
          </v-table>
        </template>
      </template>
    </v-col>
  </v-row>
</template>

<script setup>
import { computed, h, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { truthMap } from '@/services/gliddencupApi'
import {
  average, chameleons, crowdCorrect, distribution,
  globalConfusions, mysteryGroups, mysteryResult, playerGuesses, playerStats, questionResult, totalRanking, userStats,
} from '@/services/gliddencupStats'

/** Auswertungen des Tippspiels; erst mit veröffentlichter Zuordnung sinnvoll. */
const props = defineProps({
  tournament: { type: Object, required: true },
  users: { type: Array, required: true },
  picksByUser: { type: Object, required: true },
  mysteryByUser: { type: Object, default: () => ({}) },
  answersByUser: { type: Object, default: () => ({}) },
})

const VIEWS = [
  { value: 'ranking', title: 'Rangliste', text: 'Ein Punkt je richtig zugeordnetem Pseudonym, dazu die Punkte aus den Zusatzfragen und für Guy Glidden. „Allein richtig“ zählt Treffer, die sonst niemand hatte. Der Schwarm tippt bei jedem Pseudonym den häufigsten Namen.' },
  { value: 'questions', title: 'Zusatzfragen', text: 'Lösung und Antworten je Frage. Bei Zahlen bekommt die Punkte, wer am nächsten liegt; grün ist die richtige Antwort.' },
  { value: 'distribution', title: 'Trefferverteilung', text: 'Wie viele Tipper wie viele Treffer haben.' },
  { value: 'chameleons', title: 'Verwandlungskünstler', text: 'Wie oft jeder Spieler richtig getippt wurde und für wen man ihn sonst hielt: oben die besten Verwandlungskünstler, unten die schlechtesten Schauspieler. Grün ist der richtige Name.' },
  { value: 'players', title: 'Spieler-Vermutungen', text: 'Wen die Spieler nach ihrem Match hinter ihrem Gegner vermutet haben.' },
  { value: 'mystery', title: 'Wer ist Guy Glidden?', text: 'Die Antworten der Tipper; gleiche Namen in anderer Schreibweise oder mit Tippfehler sind zusammengefasst.' },
]

const { mdAndUp } = useDisplay()
const view = ref('ranking')
const results = computed(() => (props.tournament.questions ?? [])
  .map(q => questionResult(q, props.users, props.answersByUser)))
const winnersOf = r => props.users.filter(u => r.byUser.get(u)?.points)
// Guy Glidden zählt in der Rangliste mit, hat aber seine eigene Auswertung
const mystery = computed(() => mysteryResult(props.users, props.mysteryByUser, props.tournament.mysteryAnswers ?? []))
const views = computed(() => VIEWS.filter(v => v.value !== 'questions' || results.value.length))
const current = computed(() => VIEWS.find(v => v.value === view.value))

const truth = computed(() => truthMap(props.tournament))
const input = computed(() => ({
  pseudonyms: props.tournament.pseudonyms,
  truth: truth.value,
  users: props.users,
  picksByUser: props.picksByUser,
}))
const total = computed(() => props.tournament.pseudonyms.length)
const uStats = computed(() => userStats(input.value))
const pStats = computed(() => playerStats(input.value))
const chameleonList = computed(() => chameleons(pStats.value))
const topConfusions = computed(() => globalConfusions(pStats.value).slice(0, 3))
const dist = computed(() => distribution(uStats.value, total.value))
const maxBucket = computed(() => Math.max(1, ...dist.value.map(d => d.users)))
const avg = computed(() => average(uStats.value))
const players = computed(() => playerGuesses({ rounds: props.tournament.rounds, truth: truth.value, stats: pStats.value }))
const mysteryAnswers = computed(() => props.users.map(u => props.mysteryByUser[u]).filter(Boolean))
const mysteryList = computed(() => mysteryGroups(mysteryAnswers.value, props.tournament.participants))

// Gereiht wird nach Punkten: Pseudonyme plus Zusatzfragen. Der Schwarm tippt nur
// Pseudonyme, steht hinter allen Tippern mit mindestens so vielen Punkten und bekommt keinen Platz.
const rankingRows = computed(() => {
  const rows = totalRanking(uStats.value, [...results.value, mystery.value]).map((u, i) => ({ ...u, rank: i + 1 }))
  const crowd = { crowd: true, correct: crowdCorrect(pStats.value), rank: '' }
  const at = rows.findIndex(u => u.points < crowd.correct)
  rows.splice(at === -1 ? rows.length : at, 0, crowd)
  return rows
})

const pct = v => `${v.toFixed(1).replace('.', ',')} %`

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
.gc-crowd { font-style: italic; background: rgba(var(--v-theme-secondary), 0.08); }
.gc-bar {
  height: 8px;
  border-radius: 4px;
  background: rgb(var(--v-theme-secondary));
}
</style>
