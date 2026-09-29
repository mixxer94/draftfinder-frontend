<template>
  <p v-if="!users.length" class="text-medium-emphasis">Ohne Tipps gibt es nichts auszuwerten.</p>

  <v-row v-else>
    <v-col cols="12" md="3">
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
      <h2 class="hc-h2">{{ current.title }}</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">{{ current.text }}</p>

      <v-table v-if="view === 'ranking'" density="compact">
        <thead>
          <tr><th class="gc-rank">#</th><th>Tipper</th><th class="text-right">Richtig</th><th class="text-right">Quote</th></tr>
        </thead>
        <tbody>
          <tr v-for="(u, i) in uStats" :key="u.user">
            <td class="gc-rank text-medium-emphasis">{{ i + 1 }}</td>
            <td>{{ u.user }}</td>
            <td class="text-right">{{ u.correct }} / {{ u.total }}</td>
            <td class="text-right">{{ pct(u.pct) }}</td>
          </tr>
        </tbody>
      </v-table>

      <v-table v-else-if="view === 'chameleons' || view === 'obvious'" density="compact">
        <thead>
          <tr><th>Pseudonym</th><th class="text-right">Richtig getippt</th><th class="text-right">Quote</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in (view === 'chameleons' ? chameleonList : obviousList)" :key="p.pseudonym">
            <td><PseudonymCell :pseudonym="p.pseudonym" :truth="p.truth" /></td>
            <td class="text-right">{{ p.correct }}</td>
            <td class="text-right">{{ pct(p.pct) }}</td>
          </tr>
        </tbody>
      </v-table>

      <v-table v-else-if="view === 'controversial'" density="compact">
        <thead>
          <tr><th>Pseudonym</th><th class="text-right">Namen</th><th>Tipps</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in controversialList" :key="p.pseudonym">
            <td><PseudonymCell :pseudonym="p.pseudonym" :truth="p.truth" /></td>
            <td class="text-right">{{ p.diversity }}</td>
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

      <v-table v-else-if="view === 'consensus'" density="compact">
        <thead>
          <tr><th>Pseudonym</th><th>Häufigster Tipp</th><th>Zweithäufigster Tipp</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in consensusList" :key="row.pseudonym">
            <td><PseudonymCell :pseudonym="row.pseudonym" :truth="row.truth" /></td>
            <td>
              <v-chip
                v-if="row.top1Name"
                size="small"
                label
                :variant="row.truthOnTop ? 'flat' : 'tonal'"
                :color="row.truthOnTop ? 'success' : undefined"
              >
                {{ row.top1Name }} · {{ pct(row.top1Pct) }}
              </v-chip>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
            <td>
              <v-chip v-if="row.top2Name" size="small" label variant="tonal">{{ row.top2Name }} · {{ pct(row.top2Pct) }}</v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>

      <template v-else-if="view === 'confusions'">
        <h3 class="text-subtitle-1 font-weight-medium mb-2">Häufigste falsche Paare</h3>
        <v-table density="compact" class="mb-8">
          <thead>
            <tr><th>Pseudonym</th><th>Falscher Tipp</th><th class="text-right">Anzahl</th><th class="text-right">Quote</th></tr>
          </thead>
          <tbody>
            <tr v-for="pair in globalList" :key="`${pair.pseudonym}→${pair.guess}`">
              <td><PseudonymCell :pseudonym="pair.pseudonym" :truth="pair.truth" /></td>
              <td>{{ pair.guess }}</td>
              <td class="text-right">{{ pair.count }}</td>
              <td class="text-right">{{ pct(pair.pct) }}</td>
            </tr>
          </tbody>
        </v-table>

        <h3 class="text-subtitle-1 font-weight-medium mb-2">Je Pseudonym</h3>
        <v-table density="compact">
          <thead>
            <tr><th>Pseudonym</th><th>Falsche Tipps</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in perPseudonymList" :key="p.pseudonym">
              <td><PseudonymCell :pseudonym="p.pseudonym" :truth="p.truth" /></td>
              <td class="py-1">
                <span v-if="!p.wrong.length" class="text-medium-emphasis">keine</span>
                <v-chip v-for="w in p.wrong.slice(0, 6)" :key="w.name" size="small" label variant="tonal" class="ma-1">
                  {{ w.name }} × {{ w.count }}
                </v-chip>
              </td>
            </tr>
          </tbody>
        </v-table>
      </template>
    </v-col>
  </v-row>
</template>

<script setup>
import { computed, h, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { truthMap } from '@/services/gliddencupApi'
import {
  average, chameleons, consensus, controversial, distribution,
  globalConfusions, obviousPlayers, perPseudonymConfusions, playerStats, userStats,
} from '@/services/gliddencupStats'

/** Auswertungen des Tippspiels; erst mit veröffentlichter Zuordnung sinnvoll. */
const props = defineProps({
  tournament: { type: Object, required: true },
  users: { type: Array, required: true },
  picksByUser: { type: Object, required: true },
})

const VIEWS = [
  { value: 'ranking', title: 'Rangliste', text: 'Wer am meisten Pseudonyme richtig zugeordnet hat.' },
  { value: 'chameleons', title: 'Verwandlungskünstler', text: 'Spieler, die am seltensten richtig getippt wurden.' },
  { value: 'obvious', title: 'Schlechte Schauspieler', text: 'Spieler, die am häufigsten richtig getippt wurden.' },
  { value: 'controversial', title: 'Kontrovers', text: 'Pseudonyme mit den meisten verschiedenen Tipps. Grün ist der richtige Name.' },
  { value: 'distribution', title: 'Trefferverteilung', text: 'Wie viele Tipper wie viele Treffer haben.' },
  { value: 'consensus', title: 'Konsens', text: 'Die beiden häufigsten Tipps je Pseudonym. Grün heißt: Die Mehrheit lag richtig.' },
  { value: 'confusions', title: 'Verwechslungen', text: 'Mit wem die Spieler am häufigsten verwechselt wurden.' },
]

const { mdAndUp } = useDisplay()
const view = ref('ranking')
const current = computed(() => VIEWS.find(v => v.value === view.value))

const input = computed(() => ({
  pseudonyms: props.tournament.pseudonyms,
  truth: truthMap(props.tournament),
  users: props.users,
  picksByUser: props.picksByUser,
}))
const total = computed(() => props.tournament.pseudonyms.length)
const uStats = computed(() => userStats(input.value))
const pStats = computed(() => playerStats(input.value))
const chameleonList = computed(() => chameleons(pStats.value))
const obviousList = computed(() => obviousPlayers(pStats.value))
const controversialList = computed(() => controversial(pStats.value))
const consensusList = computed(() => consensus(pStats.value))
const globalList = computed(() => globalConfusions(pStats.value).slice(0, 25))
const perPseudonymList = computed(() => perPseudonymConfusions(pStats.value))
const dist = computed(() => distribution(uStats.value, total.value))
const maxBucket = computed(() => Math.max(1, ...dist.value.map(d => d.users)))
const avg = computed(() => average(uStats.value))

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
.gc-bar {
  height: 8px;
  border-radius: 4px;
  background: rgb(var(--v-theme-secondary));
}
</style>
