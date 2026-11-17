<template>
  <PageHeader
    title="Tippspiel-Fragen"
    text="Zusatzfragen für die Zuschauer. Eine Frage schließt von selbst, sobald ihre Runde im Bracket komplett auf „Ergebnis“ steht, oder von Hand. Lösungen bleiben verdeckt, bis die Zuordnung veröffentlicht ist."
  >
    <v-switch v-model="showSolutions" label="Lösungen zeigen" color="secondary" density="compact" hide-details inset />
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
      <span v-if="!showSolutions" class="text-body-2 text-medium-emphasis">Die Lösung trägst du mit „Lösungen zeigen“ ein.</span>
      <v-spacer />
      <v-btn v-if="editing" variant="text" @click="reset">Abbrechen</v-btn>
      <v-btn color="secondary" variant="flat" :loading="saving" :disabled="!form.text.trim()" @click="save">
        {{ editing ? 'Speichern' : 'Anlegen' }}
      </v-btn>
    </div>
  </v-sheet>

  <v-table density="compact">
    <thead>
      <tr><th>Frage</th><th>Typ</th><th class="text-right">Punkte</th><th>Schließt</th><th>Zustand</th><th>Lösung</th><th /></tr>
    </thead>
    <tbody>
      <tr v-for="q in questions" :key="q.id" :class="{ 'text-medium-emphasis': q.hidden }">
        <td>{{ q.text }}</td>
        <td class="text-no-wrap">{{ q.type === 'NUMBER' ? `Zahl${q.unit ? ` (${q.unit})` : ''}` : `Auswahl (${q.options.length})` }}</td>
        <td class="text-right">{{ q.points }}</td>
        <td class="text-no-wrap">{{ q.closeAfterRound ? `nach ${q.closeAfterRound}` : 'nur von Hand' }}</td>
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
        <td colspan="7" class="text-medium-emphasis py-4">Noch keine Fragen.</td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { errorMessage, hcApi } from '@/services/hcApi'
import { confirmAction } from '@/services/confirm'
import PageHeader from '@/components/gliddencup/PageHeader.vue'

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

const EMPTY = { text: '', type: 'CHOICE', points: 1, unit: '', options: '', closeAfterRound: null, solution: null }
const form = reactive({ ...EMPTY })
const editing = ref(null)

const closeItems = computed(() => [
  { value: null, title: 'nur von Hand' },
  ...rounds.value.map(r => ({ value: r, title: `nach ${r}` })),
])
const formOptions = computed(() => form.options.split('\n').map(o => o.trim()).filter(Boolean))

function apply (data) {
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

const patch = (q, body, done) => send(() => hcApi.put(`/questions/${q.id}`, body), `„${q.text}“ ${done}.`)

async function toggleHidden (q) {
  if (!q.hidden && !await confirmAction({
    title: 'Frage ausblenden?',
    text: 'Zuschauer sehen die Frage dann nicht mehr, und sie zählt nicht in der Wertung. Die abgegebenen Antworten bleiben gespeichert; du kannst die Frage wieder einblenden.',
    confirmText: 'Ausblenden',
  })) return
  await patch(q, { hidden: !q.hidden }, q.hidden ? 'eingeblendet' : 'ausgeblendet')
}

onMounted(async () => {
  try {
    apply((await hcApi.get('/questions')).data)
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loaded.value = true
  }
})
</script>
