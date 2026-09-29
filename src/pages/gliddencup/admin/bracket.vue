<template>
  <PageHeader title="Bracket">
    <template v-if="admin">
      <v-switch v-model="revealMode" label="Aufdecken" color="secondary" density="compact" hide-details inset class="flex-grow-0 mr-2" />
      <v-btn
        v-if="revealMode"
        variant="tonal"
        :color="identitiesPublic ? undefined : 'error'"
        :loading="busy === 'identities'"
        @click="toggleIdentities"
      >
        {{ identitiesPublic ? 'Zuordnung zurücknehmen' : 'Zuordnung veröffentlichen' }}
      </v-btn>
    </template>
    <v-btn-toggle v-model="view" mandatory density="compact" variant="outlined" divided aria-label="Darstellung">
      <v-btn value="tree" prepend-icon="mdi-tournament">Baum</v-btn>
      <v-btn value="list" prepend-icon="mdi-format-list-bulleted">Liste</v-btn>
    </v-btn-toggle>
  </PageHeader>
  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>

  <section v-for="side in sides" :key="side.bracket" class="mb-10">
    <h2 v-if="sides.length > 1" class="text-h6 mb-4">{{ side.title }}</h2>
    <!-- Die Aufdeck-Buttons brauchen Platz in der Karte, deshalb nur im Aufdecken-Modus höher. -->
    <BracketTree v-if="view === 'tree'" :rounds="side.rounds" :admin="admin" :card-height="revealMode ? 140 : 84">
      <template v-if="revealMode" #actions="{ slot: s }">
        <div class="d-flex align-center ga-1">
          <v-chip size="small" variant="tonal" :color="REVEAL_LEVELS[level(s)].color">{{ REVEAL_LEVELS[level(s)].text }}</v-chip>
          <v-spacer />
          <v-btn
            icon="mdi-chevron-down"
            size="x-small"
            variant="text"
            :disabled="!!busy || level(s) === 0"
            :loading="busy === `${s.code}-down`"
            :aria-label="`${s.code}: Stufe niedriger`"
            @click="setLevel(s, level(s) - 1, 'down')"
          />
          <v-btn
            icon="mdi-chevron-up"
            size="x-small"
            variant="text"
            :disabled="!!busy || !s.canRaise"
            :loading="busy === `${s.code}-up`"
            :aria-label="`${s.code}: Stufe höher`"
            @click="setLevel(s, level(s) + 1, 'up')"
          />
        </div>
        <!-- Zurücknehmen auf jeder Stufe, enthüllen nur auf Stufe 2; ob der Verlierer weiterspielt, prüft der Server. -->
        <v-btn
          v-if="s.loserPublic === true || (level(s) === 2 && s.loserPublic === false)"
          size="x-small"
          variant="text"
          :color="s.loserPublic ? undefined : 'error'"
          :disabled="!!busy"
          :loading="busy === `${s.code}-loser`"
          @click="toggleLoser(s)"
        >
          {{ s.loserPublic ? 'Enthüllung zurücknehmen' : 'Verlierer enthüllen' }}
        </v-btn>
      </template>
    </BracketTree>
    <div v-for="round in side.rounds" v-else :key="round.key" class="mb-6">
      <h3 v-if="round.label !== side.title" class="hc-h2">{{ round.label }}</h3>
      <v-table density="compact" class="hc-bracket">
        <colgroup>
          <col class="hc-col-slot">
          <col>
          <col>
          <col class="hc-col-score">
          <col class="hc-col-state">
          <col class="hc-col-level">
          <col v-if="admin" class="hc-col-action">
        </colgroup>
        <thead>
          <tr><th>Slot</th><th>Spieler A</th><th>Spieler B</th><th>Ergebnis</th><th>Status</th><th>Öffentlich</th><th v-if="admin" /></tr>
        </thead>
        <tbody>
          <tr v-for="s in round.slots" :key="s.code">
            <td class="font-weight-medium">{{ s.code }}</td>
            <td :class="{ 'font-weight-bold': s.match?.winner === 'A' }">{{ s.a ?? '—' }}</td>
            <td :class="{ 'font-weight-bold': s.match?.winner === 'B' }">{{ s.b ?? '—' }}</td>
            <td>{{ s.match?.score ?? '' }}</td>
            <td><MatchStateChip :match="s.match ?? { state: s.a && s.b ? 'READY' : 'PENDING' }" /></td>
            <td>
              <v-chip size="small" variant="tonal" :color="REVEAL_LEVELS[level(s)].color">{{ REVEAL_LEVELS[level(s)].text }}</v-chip>
            </td>
            <td v-if="admin" class="text-right">
              <DetailButton v-if="s.match" :id="s.match.id" :slot-code="s.code" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { BRACKETS, errorMessage, hcApi, isAdmin, REVEAL_LEVELS } from '@/services/hcApi'
import { confirmAction } from '@/services/confirm'
import PageHeader from '@/components/gliddencup/PageHeader.vue'
import MatchStateChip from '@/components/gliddencup/MatchStateChip.vue'
import DetailButton from '@/components/gliddencup/DetailButton.vue'
import BracketTree from '@/components/gliddencup/BracketTree.vue'

const slots = ref([])
const identitiesPublic = ref(false)
// Die gewählte Darstellung bleibt über Seitenwechsel hinweg erhalten.
const view = ref(localStorage.getItem('hc_bracket_view') === 'list' ? 'list' : 'tree')
watch(view, v => localStorage.setItem('hc_bracket_view', v))
// Bewusst nicht gespeichert: Aufdecken wirkt sofort öffentlich, ein Fehlklick soll nach dem Neuladen nicht bereitliegen.
const revealMode = ref(false)
const error = ref('')
const busy = ref('')
const admin = computed(() => isAdmin())

// Spielreihenfolge: erst Winner, dann Loser, zuletzt das Grand Final.
const ORDER = ['MAIN', 'WINNERS', 'LOSERS', 'GRAND_FINAL']

/** Slots gruppiert nach Bracket-Seite und Runde, in Spielreihenfolge. */
const sides = computed(() => {
  const map = new Map()
  for (const s of slots.value) {
    if (!map.has(s.bracket)) map.set(s.bracket, { bracket: s.bracket, title: BRACKETS[s.bracket] ?? s.bracket, rounds: new Map() })
    const rounds = map.get(s.bracket).rounds
    if (!rounds.has(s.round)) rounds.set(s.round, { key: s.round, label: s.label, slots: [] })
    rounds.get(s.round).slots.push(s)
  }
  return [...map.values()]
    .sort((x, y) => ORDER.indexOf(x.bracket) - ORDER.indexOf(y.bracket))
    .map(side => ({ ...side, rounds: [...side.rounds.values()].sort((x, y) => x.key - y.key) }))
})

// Ob sich ein Slot hochstufen lässt, entscheidet der Server (`canRaise`); die Regeln stehen nur dort.
const level = s => s.revealLevel ?? 0

async function load () {
  try {
    const data = (await hcApi.get('/bracket')).data
    slots.value = data.slots
    identitiesPublic.value = data.identitiesPublic ?? false
  } catch (e) {
    error.value = errorMessage(e)
  }
}

/** Führt eine Aufdeck-Aktion aus; 409 bei unzulässigem Schritt landet als Meldung oben. */
async function run (key, fn) {
  busy.value = key
  error.value = ''
  try {
    await fn()
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = ''
  }
}

const setLevel = (s, target, dir) =>
  run(`${s.code}-${dir}`, () => hcApi.post(`/bracket/${s.code}/reveal`, { level: target }))

async function toggleLoser (s) {
  const show = !s.loserPublic
  const loser = s.match?.winner === 'A' ? s.b : s.a
  const ok = await confirmAction(show
    ? {
        title: `${loser} enthüllen?`,
        text: `Der Klarname von ${loser} wird öffentlich, in allen Matches ab Stufe „Paarung“.`,
        confirmText: 'Enthüllen',
        color: 'error',
      }
    : {
        title: `Enthüllung von ${loser} zurücknehmen?`,
        text: `${loser} erscheint öffentlich wieder nur mit Pseudonym.`,
        confirmText: 'Zurücknehmen',
      })
  if (ok) run(`${s.code}-loser`, () => hcApi.post(`/bracket/${s.code}/loser-identity`, { public: show }))
}

async function toggleIdentities () {
  const show = !identitiesPublic.value
  const ok = await confirmAction(show
    ? {
        title: 'Zuordnung veröffentlichen?',
        text: 'Alle Klarnamen, alle Tipps und die Auswertungen werden öffentlich. Tipps sind danach geschlossen.',
        confirmText: 'Veröffentlichen',
        color: 'error',
      }
    : {
        title: 'Zuordnung zurücknehmen?',
        text: 'Klarnamen, Tipps und Auswertungen sind öffentlich wieder verborgen, bis auf einzeln enthüllte Spieler.',
        confirmText: 'Zurücknehmen',
      })
  if (!ok) return
  busy.value = 'identities'
  error.value = ''
  try {
    identitiesPublic.value = (await hcApi.post('/tournament/identities', { public: show })).data.identitiesPublic
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = ''
  }
}

onMounted(load)
</script>

<style scoped>
/* Feste Spalten: in jeder Runde stehen die Namen an derselben Stelle. */
.hc-bracket :deep(table) { table-layout: fixed; width: 100%; min-width: 760px; }
.hc-bracket :deep(td) { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hc-col-slot { width: 7rem; }
.hc-col-score { width: 6rem; }
.hc-col-state { width: 11rem; }
.hc-col-level { width: 7rem; }
.hc-col-action { width: 8rem; }
</style>
