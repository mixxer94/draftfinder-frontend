<template>
  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>

  <!-- Nach der Auslosung nur noch das Ergebnis: Hier gibt es nichts mehr zu tun. -->
  <template v-if="data && locked">
    <PageHeader title="Auslosung">
      <template #meta>
        <v-chip size="small" variant="tonal" color="success" prepend-icon="mdi-check">Abgeschlossen</v-chip>
      </template>
      <v-btn variant="outlined" color="secondary" append-icon="mdi-chevron-right" to="/gliddencup/admin/activation">Zu „Matches freigeben“</v-btn>
    </PageHeader>
    <v-alert type="success" variant="tonal" icon="mdi-lock" class="mb-6 hc-done">
      Die Auslosung steht fest. Weiter geht es unter „Matches freigeben“.
    </v-alert>

    <v-table density="compact" class="hc-draw">
      <thead><tr><th>Slot</th><th>Spieler A</th><th>Spieler B</th></tr></thead>
      <tbody>
        <tr v-for="slot in drawn" :key="slot.code">
          <td class="font-weight-medium">{{ slot.code }}</td>
          <td>{{ slot.a ?? '—' }}</td>
          <td>{{ slot.b ?? '—' }}</td>
        </tr>
      </tbody>
    </v-table>
  </template>

  <template v-else-if="data">
    <PageHeader title="Auslosung" text="Erstelle die Paarungen entweder von Hand oder zufällig." />

    <div class="d-flex flex-wrap align-center ga-2 mb-3">
      <v-btn variant="tonal" prepend-icon="mdi-shuffle" @click="shuffle">Zufällig füllen</v-btn>
      <v-btn variant="text" @click="clear">Leeren</v-btn>
      <span class="text-medium-emphasis">{{ hint }}</span>
    </div>

    <v-table density="compact" class="hc-draw">
      <thead><tr><th>Slot</th><th>Spieler A</th><th>Spieler B</th></tr></thead>
      <tbody>
        <tr v-for="slot in data.firstRound" :key="slot.code">
          <td class="font-weight-medium">{{ slot.code }}</td>
          <td v-for="side in ['a', 'b']" :key="side">
            <v-select
              :model-value="picks[slot.code][side]"
              :items="options(slot.code, side)"
              item-title="pseudonym"
              item-value="id"
              clearable
              density="compact"
              hide-details
              placeholder="Spieler wählen"
              :aria-label="`${slot.code}, Spieler ${side.toUpperCase()}`"
              @update:model-value="id => pick(slot.code, side, id)"
            />
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-btn class="mt-6" color="secondary" variant="flat" :loading="saving" @click="submit">
      Auslosung eintragen
    </v-btn>
  </template>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { errorMessage, hcApi, hcSession } from '@/services/hcApi'
import { confirmAction } from '@/services/confirm'
import PageHeader from '@/components/gliddencup/PageHeader.vue'

const data = ref(null)
const picks = reactive({})
const error = ref('')
const saving = ref(false)
/** Erste Runde mit Pseudonymen, sobald ausgelost ist. */
const drawn = ref([])

const locked = computed(() => data.value && data.value.tournament.state !== 'SETUP')

async function load () {
  try {
    data.value = (await hcApi.get('/draw')).data
    hcSession.tournamentState = data.value.tournament.state
    if (locked.value) {
      // /draw kennt nur IDs der noch verifizierten Spieler; das Bracket nennt alle beim Pseudonym.
      const first = new Set(data.value.firstRound.map(s => s.code))
      drawn.value = (await hcApi.get('/bracket')).data.slots.filter(s => first.has(s.code))
      return
    }
    for (const s of data.value.firstRound) picks[s.code] = { a: s.a, b: s.b }
  } catch (e) {
    error.value = errorMessage(e)
  }
}

/** IDs aller gesetzten Spieler. */
const taken = computed(() => new Set(Object.values(picks).flatMap(p => [p.a, p.b]).filter(Boolean)))

const hint = computed(() => {
  const free = data.value.firstRound.length * 2 - taken.value.size
  const left = data.value.verified.length - taken.value.size
  if (!free && !left) return 'Alle Plätze besetzt.'
  return `${free} Plätze frei, ${left} Spieler noch nicht gesetzt.`
})

/** Auswahl für ein Feld: nur Spieler, die nirgends sonst gesetzt sind. */
function options (code, side) {
  const own = picks[code][side]
  return data.value.verified.filter(p => p.id === own || !taken.value.has(p.id))
}

/** Setzt einen Spieler und nimmt ihn aus jedem anderen Feld, damit niemand doppelt spielt. */
function pick (code, side, id) {
  for (const p of Object.values(picks)) {
    if (p.a === id) p.a = null
    if (p.b === id) p.b = null
  }
  picks[code][side] = id ?? null
}

/*
 * Reine Eingabehilfe. crypto.getRandomValues statt Math.random: Für eine
 * Turnierauslosung ist ein vorhersagbarer PRNG das falsche Werkzeug.
 */
function shuffle () {
  const ids = data.value.verified.map(p => p.id)
  const random = new Uint32Array(ids.length)
  crypto.getRandomValues(random)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = random[i] % (i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]]
  }
  const fields = data.value.firstRound.flatMap(s => [[s.code, 'a'], [s.code, 'b']])
  fields.forEach(([code, side], i) => { picks[code][side] = ids[i] ?? null })
}

function clear () {
  for (const code of Object.keys(picks)) picks[code] = { a: null, b: null }
}

async function submit () {
  const ok = await confirmAction({
    title: 'Auslosung eintragen?',
    text: 'Danach lässt sie sich nicht mehr ändern, und niemand kann mehr entfernt werden. Das Turnier beginnt dann.',
    confirmText: 'Eintragen',
  })
  if (!ok) return
  saving.value = true
  error.value = ''
  try {
    await hcApi.post('/draw', { assignments: picks })
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.hc-draw { max-width: 900px; }
.hc-draw :deep(table) { table-layout: fixed; }
.hc-draw :deep(th:first-child) { width: 8rem; }
.hc-done { max-width: 900px; }
</style>
