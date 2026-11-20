<template>
  <PageHeader
    title="Tippspiel-Fragen"
    text="Zusatzfragen für die Zuschauer."
  >
    <v-switch v-model="showSolutions" label="Lösungen zeigen" color="secondary" density="compact" hide-details inset />
    <!-- Schließt nur von Hand, damit ein Fehlklick beim Aufdecken das Tippspiel nicht zumacht. -->
    <v-btn
      v-if="loaded"
      variant="tonal"
      :color="tipsClosed ? undefined : 'error'"
      :prepend-icon="tipsClosed ? 'mdi-lock-open-variant-outline' : 'mdi-lock-outline'"
      :loading="savingTips"
      @click="toggleTips"
    >
      {{ tipsClosed ? 'Tippspiel öffnen' : 'Tippspiel schließen' }}
    </v-btn>
  </PageHeader>

  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>
  <v-alert v-if="info" type="success" variant="tonal" closable class="mb-4" @click:close="info = ''">{{ info }}</v-alert>

  <v-sheet border rounded class="pa-4 mb-8">
    <h2 class="hc-h2">{{ editing ? 'Frage bearbeiten' : 'Neue Frage' }}</h2>
    <v-row dense>
      <v-col cols="12" md="8">
        <v-text-field v-model="form.text" label="Frage" counter="200" maxlength="200" density="compact" />
      </v-col>
      <v-col cols="6" md="2">
        <!-- Der Typ ist nach dem Anlegen fest: Gespeicherte Antworten passen sonst nicht mehr. -->
        <v-select v-model="form.type" :items="TYPES" item-title="title" item-value="value" label="Typ" :disabled="!!editing" density="compact" />
      </v-col>
      <v-col cols="6" md="2">
        <v-text-field v-model.number="form.points" type="number" min="1" max="100" label="Punkte" density="compact" />
      </v-col>

      <v-col v-if="form.type === 'NUMBER'" cols="12" md="4">
        <v-text-field v-model="form.unit" label="Einheit" placeholder="z. B. Minuten" maxlength="20" density="compact" />
      </v-col>
      <v-col v-else cols="12">
        <v-textarea
          v-model="form.options"
          label="Optionen, eine je Zeile"
          rows="5"
          auto-grow
          density="compact"
          :hint="editing ? 'Vorhandene Optionen bleiben, du kannst nur neue ergänzen.' : ''"
          persistent-hint
        />
        <div v-if="!editing" class="d-flex align-center flex-wrap ga-2 mt-1 mb-2">
          <span class="text-body-2 text-medium-emphasis">Vorlage:</span>
          <v-btn v-for="t in TEMPLATES" :key="t.key" size="small" variant="tonal" @click="useTemplate(t.key)">
            {{ t.title }} ({{ templates[t.key]?.length ?? 0 }})
          </v-btn>
        </div>
      </v-col>

      <v-col cols="12" md="4">
        <v-select v-model="form.closeAfterRound" :items="closeItems" item-title="title" item-value="value" label="Schließt" density="compact" />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="form.closeNote"
          label="Hinweis zum Tippschluss"
          placeholder="z. B. nach dem Raid"
          maxlength="80"
          hint="Steht bei der Frage als „Offen bis: …“. Leer: Die Runde wird genannt."
          persistent-hint
          density="compact"
        />
      </v-col>
      <v-col v-if="showSolutions" cols="12" md="4">
        <v-text-field
          v-if="form.type === 'NUMBER'"
          v-model="form.solution"
          type="number"
          min="0"
          :suffix="form.unit"
          label="Lösung"
          clearable
          density="compact"
        />
        <v-autocomplete v-else v-model="form.solution" :items="formOptions" label="Lösung" clearable density="compact" />
      </v-col>
    </v-row>
    <div class="d-flex flex-wrap align-center ga-3 mt-2">
      <v-spacer />
      <v-btn v-if="editing" variant="text" @click="reset">Abbrechen</v-btn>
      <v-btn color="secondary" variant="flat" :loading="saving" :disabled="!form.text.trim()" @click="save">
        {{ editing ? 'Speichern' : 'Anlegen' }}
      </v-btn>
    </div>
  </v-sheet>

  <v-sheet border rounded class="pa-4 mb-8">
    <h2 class="hc-h2">Wer ist Guy Glidden?</h2>
    <v-textarea
      v-if="showSolutions"
      v-model="mystery"
      label="Akzeptierte Antworten, eine je Zeile"
      placeholder="Name und alle Nicknames, die zählen"
      rows="3"
      auto-grow
      density="compact"
      hide-details
    />
    <div class="d-flex flex-wrap align-center ga-3 mt-2">
      <span class="text-body-2 text-medium-emphasis">
        {{ mysteryCount ? `${mysteryCount} ${mysteryCount === 1 ? 'Antwort' : 'Antworten'} eingetragen.` : 'Noch nichts eingetragen.' }}
      </span>
      <v-spacer />
      <v-btn v-if="showSolutions" color="secondary" variant="flat" :loading="savingMystery" @click="saveMystery">Speichern</v-btn>
    </div>

    <template v-if="guesses">
      <h3 class="text-subtitle-1 font-weight-medium mt-6 mb-1">Abgegebene Antworten</h3>
      <p class="text-body-2 text-medium-emphasis mb-2">
        {{ guessStats.answered }} von {{ guesses.userCount }} Tippern haben geantwortet, {{ guessStats.winners }} bekommen
        mit den eingetragenen Antworten einen Punkt (grün). Gleiche Namen in anderer Schreibweise oder mit Tippfehler sind zusammengefasst.
      </p>
      <v-table v-if="guessRows.length" density="compact">
        <thead>
          <tr><th>Antwort</th><th class="text-right">Tipps</th><th>Schreibweise: Tipper</th></tr>
        </thead>
        <tbody>
          <tr v-for="g in guessRows" :key="g.label">
            <td class="font-weight-medium">{{ g.label }}</td>
            <td class="text-right">{{ g.count }}</td>
            <td class="py-1">
              <v-chip
                v-for="v in g.variants"
                :key="v.text"
                size="small"
                label
                class="ma-1 gc-guess"
                :variant="v.hit ? 'flat' : 'tonal'"
                :color="v.hit ? 'success' : undefined"
              >
                {{ v.text }}: {{ v.users.join(', ') }}
              </v-chip>
            </td>
          </tr>
        </tbody>
      </v-table>
    </template>
    <p v-else-if="guessesHint" class="text-body-2 text-medium-emphasis mt-4 mb-0">{{ guessesHint }}</p>
  </v-sheet>

  <v-table density="compact">
    <thead>
      <tr><th /><th>Frage</th><th>Typ</th><th class="text-right">Punkte</th><th>Schließt</th><th>Zustand</th><th>Lösung</th><th /></tr>
    </thead>
    <tbody>
      <tr
        v-for="q in questions"
        :key="q.id"
        draggable="true"
        :class="{ 'text-medium-emphasis': q.hidden, 'gc-dragging': q.id === dragId }"
        @dragstart="startDrag($event, q)"
        @dragover.prevent="dragOver(q)"
        @drop.prevent
        @dragend="endDrag"
      >
        <td class="gc-handle pr-0"><v-icon size="small">mdi-drag-vertical</v-icon></td>
        <td>{{ q.text }}</td>
        <td class="text-no-wrap">{{ q.type === 'NUMBER' ? `Zahl${q.unit ? ` (${q.unit})` : ''}` : `Auswahl (${q.options.length})` }}</td>
        <td class="text-right">{{ q.points }}</td>
        <td>
          {{ q.closeAfterRound ? `nach ${q.closeAfterRound}` : 'nur von Hand' }}
          <div v-if="q.closeNote" class="text-caption text-medium-emphasis">Hinweis: {{ q.closeNote }}</div>
        </td>
        <td><v-chip size="small" variant="tonal" :color="stateOf(q).color">{{ stateOf(q).text }}</v-chip></td>
        <td class="text-no-wrap">
          <span v-if="q.solution === null" class="text-medium-emphasis">offen</span>
          <span v-else-if="showSolutions">{{ q.solution }} {{ q.unit }}</span>
          <span v-else>eingetragen</span>
        </td>
        <td class="text-right text-no-wrap">
          <v-btn size="small" variant="text" @click="edit(q)">Bearbeiten</v-btn>
          <v-btn v-if="!q.published" size="small" variant="text" color="secondary" :disabled="q.hidden" @click="patch(q, { published: true }, 'veröffentlicht')">
            Veröffentlichen
          </v-btn>
          <v-btn v-else-if="!q.closedManually" size="small" variant="text" :disabled="q.hidden" @click="patch(q, { closedManually: true }, 'geschlossen')">
            Schließen
          </v-btn>
          <v-btn v-else size="small" variant="text" :disabled="q.hidden" @click="patch(q, { closedManually: false }, 'wieder freigegeben')">
            Wieder öffnen
          </v-btn>
          <v-btn size="small" variant="text" @click="toggleHidden(q)">{{ q.hidden ? 'Einblenden' : 'Ausblenden' }}</v-btn>
        </td>
      </tr>
      <tr v-if="loaded && !questions.length">
        <td colspan="8" class="text-medium-emphasis py-4">Noch keine Fragen.</td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { errorMessage, hcApi } from '@/services/hcApi'
import { confirmAction } from '@/services/confirm'
import PageHeader from '@/components/gliddencup/PageHeader.vue'
import { gcApi, loadPublicTournament } from '@/services/gliddencupApi'
import { mysteryGroups, mysteryResult } from '@/services/gliddencupStats'

const TYPES = [
  { value: 'CHOICE', title: 'Auswahl' },
  { value: 'NUMBER', title: 'Zahl' },
]
const TEMPLATES = [
  { key: 'pseudonyms', title: 'Pseudonyme' },
  { key: 'maps', title: 'Maps' },
  { key: 'civs', title: 'Civs' },
]

const questions = ref([])
const rounds = ref([])
const templates = ref({})
const loaded = ref(false)
const error = ref('')
const info = ref('')
const saving = ref(false)
// Aus, damit im Stream oder beim Teilen des Bildschirms keine Lösung zu sehen ist.
const showSolutions = ref(false)

const EMPTY = { text: '', type: 'CHOICE', points: 1, unit: '', options: '', closeAfterRound: null, closeNote: '', solution: null }
const form = reactive({ ...EMPTY })
const editing = ref(null)

const closeItems = computed(() => [
  { value: null, title: 'nur von Hand' },
  ...rounds.value.map(r => ({ value: r, title: `nach ${r}` })),
])
const formOptions = computed(() => form.options.split('\n').map(o => o.trim()).filter(Boolean))

const mystery = ref('')
const mysteryCount = ref(0)
const savingMystery = ref(false)
const acceptedList = computed(() => mystery.value.split('\n').map(a => a.trim()).filter(Boolean))

// Abgegebene Antworten auf „Wer ist Guy Glidden?“. Sie liegen im Tippspiel, und
// das gibt sie erst nach der Veröffentlichung der Zuordnung heraus.
const guesses = ref(null) // { byUser: { Tipper: Antwort }, userCount, participants }
const guessesHint = ref('')
// Gewertet wird gegen die Liste im Textfeld, damit eine Änderung schon vor dem Speichern sichtbar ist.
const guessResult = computed(() => guesses.value &&
  mysteryResult(Object.keys(guesses.value.byUser), guesses.value.byUser, acceptedList.value))
const guessStats = computed(() => {
  const points = [...(guessResult.value?.byUser.values() ?? [])]
  return { answered: guessResult.value?.answered ?? 0, winners: points.filter(p => p.points).length }
})
const guessRows = computed(() => {
  if (!guesses.value) return []
  const usersByText = new Map()
  for (const [user, raw] of Object.entries(guesses.value.byUser)) {
    const text = raw.trim()
    if (text) usersByText.set(text, [...(usersByText.get(text) ?? []), user])
  }
  return mysteryGroups(Object.values(guesses.value.byUser), guesses.value.participants).map(g => ({
    ...g,
    variants: g.variants.map(([text]) => {
      const users = usersByText.get(text) ?? []
      return { text, users, hit: !!guessResult.value.byUser.get(users[0])?.points }
    }),
  }))
})

async function loadGuesses () {
  try {
    const [overview, tournament] = await Promise.all([gcApi.get('/overview'), loadPublicTournament()])
    if (!overview.data?.tipsVisible) {
      guessesHint.value = 'Die abgegebenen Antworten erscheinen hier, sobald die Zuordnung veröffentlicht ist.'
      return
    }
    guesses.value = {
      byUser: Object.fromEntries(Object.entries(overview.data.mysteryByUser ?? {}).filter(([, v]) => typeof v === 'string')),
      userCount: overview.data.users?.length ?? 0,
      participants: tournament.participants,
    }
  } catch {
    guessesHint.value = 'Die abgegebenen Antworten sind gerade nicht erreichbar.'
  }
}

const tipsClosed = ref(false)
const savingTips = ref(false)

async function toggleTips () {
  const close = !tipsClosed.value
  if (!await confirmAction(close
    ? {
        title: 'Tippspiel schließen?',
        text: 'Zuschauer können ihre Tipps auf die Zuordnung nicht mehr ändern. Spätestens vor der ersten Vermutung im Stream schließen.',
        confirmText: 'Schließen',
        color: 'error',
      }
    : {
        title: 'Tippspiel öffnen?',
        text: 'Zuschauer können wieder tippen und ihre Tipps ändern.',
        confirmText: 'Öffnen',
      })) return
  savingTips.value = true
  error.value = ''
  try {
    tipsClosed.value = (await hcApi.post('/tournament/tips', { closed: close })).data.tipsClosed
    info.value = tipsClosed.value ? 'Tippspiel geschlossen.' : 'Tippspiel geöffnet.'
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    savingTips.value = false
  }
}

function apply (data) {
  tipsClosed.value = data.tipsClosed ?? false
  mystery.value = (data.mysteryAnswers ?? []).join('\n')
  mysteryCount.value = (data.mysteryAnswers ?? []).length
  questions.value = data.questions
  rounds.value = data.rounds
  templates.value = data.templates
}

function stateOf (q) {
  if (q.hidden) return { text: 'Ausgeblendet' }
  if (!q.published) return { text: 'Entwurf', color: 'warning' }
  if (q.open) return { text: 'Offen', color: 'success' }
  return { text: q.closedManually ? 'Geschlossen (von Hand)' : 'Geschlossen' }
}

function useTemplate (key) {
  form.options = (templates.value[key] ?? []).join('\n')
}

function reset () {
  editing.value = null
  Object.assign(form, EMPTY)
}

function edit (q) {
  editing.value = q.id
  Object.assign(form, {
    text: q.text,
    type: q.type,
    points: q.points,
    unit: q.unit,
    options: q.options.join('\n'),
    closeAfterRound: q.closeAfterRound,
    closeNote: q.closeNote,
    solution: q.solution,
  })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function send (request, done) {
  error.value = ''
  try {
    apply((await request()).data)
    info.value = done
    return true
  } catch (e) {
    error.value = errorMessage(e)
    return false
  }
}

async function save () {
  const body = {
    text: form.text,
    points: form.points,
    closeAfterRound: form.closeAfterRound,
    closeNote: form.closeNote,
    ...(form.type === 'NUMBER' ? { unit: form.unit } : { options: formOptions.value }),
    // Ohne den Schalter ist das Feld nicht zu sehen; dann bleibt die gespeicherte Lösung unberührt.
    ...(showSolutions.value ? { solution: form.solution ?? null } : {}),
  }
  saving.value = true
  const ok = editing.value
    ? await send(() => hcApi.put(`/questions/${editing.value}`, body), 'Frage gespeichert.')
    : await send(() => hcApi.post('/questions', { ...body, type: form.type }), 'Frage als Entwurf angelegt. Zuschauer sehen sie erst nach „Veröffentlichen“.')
  saving.value = false
  if (ok) reset()
}

async function saveMystery () {
  savingMystery.value = true
  await send(() => hcApi.put('/questions/mystery', { answers: acceptedList.value }), 'Antworten auf „Wer ist Guy Glidden?“ gespeichert.')
  savingMystery.value = false
}

const patch = (q, body, done) => send(() => hcApi.put(`/questions/${q.id}`, body), `„${q.text}“ ${done}.`)

async function toggleHidden (q) {
  if (!q.hidden && !await confirmAction({
    title: 'Frage ausblenden?',
    text: 'Zuschauer sehen die Frage dann nicht mehr, und sie zählt nicht in der Wertung. Die abgegebenen Antworten bleiben gespeichert; du kannst die Frage wieder einblenden.',
    confirmText: 'Ausblenden',
  })) return
  await patch(q, { hidden: !q.hidden }, q.hidden ? 'eingeblendet' : 'ausgeblendet')
}

// Ziehen sortiert die Liste schon beim Überfahren um; gespeichert wird beim Loslassen.
const dragId = ref(null)
let orderBefore = []

function startDrag (event, q) {
  dragId.value = q.id
  orderBefore = questions.value.map(x => x.id)
  event.dataTransfer.effectAllowed = 'move'
}

function dragOver (target) {
  if (!dragId.value || target.id === dragId.value) return
  const list = [...questions.value]
  const from = list.findIndex(x => x.id === dragId.value)
  const to = list.findIndex(x => x.id === target.id)
  list.splice(to, 0, ...list.splice(from, 1))
  questions.value = list
}

async function endDrag () {
  dragId.value = null
  const ids = questions.value.map(x => x.id)
  if (ids.join() === orderBefore.join()) return
  const ok = await send(() => hcApi.put('/questions/order', { ids }), 'Reihenfolge gespeichert.')
  if (!ok) questions.value = orderBefore.map(id => questions.value.find(x => x.id === id))
}

onMounted(async () => {
  loadGuesses()
  try {
    apply((await hcApi.get('/questions')).data)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loaded.value = true
  }
})
</script>

<style scoped>
.gc-handle { cursor: grab; width: 1px; }
.gc-dragging { opacity: 0.4; }
/* Bei vielen Tippern mit derselben Schreibweise umbrechen statt die Tabelle zu sprengen. */
.gc-guess { height: auto !important; min-height: 24px; white-space: normal; }
</style>
