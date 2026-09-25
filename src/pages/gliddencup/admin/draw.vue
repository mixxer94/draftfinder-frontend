<template>
  <h2 class="text-h6 mb-2">Erstrundensetzung</h2>
  <p class="text-medium-emphasis mb-2">
    Jeder Spieler genau einmal, alle Slots belegt, nur verifizierte Spieler. Danach ist
    „Entfernen" gesperrt.
  </p>
  <p class="text-medium-emphasis mb-4">
    „Zufällig verteilen" füllt die Felder nur aus — geschrieben wird erst mit „Auslosung
    eintragen". Für ein echtes Turnier bleibt eine nachvollziehbare Auslosung vor Publikum die
    bessere Wahl: Was der Browser hier würfelt, kann niemand überprüfen.
  </p>

  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>
  <v-alert v-if="locked" type="info" variant="tonal" class="mb-4">
    Die Auslosung wurde bereits eingetragen (Status: {{ data.tournament.state }}).
  </v-alert>

  <template v-if="data">
    <div v-if="!locked" class="d-flex flex-wrap align-center ga-2 mb-3">
      <v-btn variant="tonal" @click="shuffle"><v-icon start>mdi-shuffle</v-icon>Zufällig verteilen</v-btn>
      <v-btn variant="text" @click="clear">Felder leeren</v-btn>
      <span class="text-medium-emphasis">{{ hint }}</span>
    </div>

    <v-table density="compact">
      <thead><tr><th>Slot</th><th>Spieler A</th><th>Spieler B</th></tr></thead>
      <tbody>
        <tr v-for="slot in data.firstRound" :key="slot.code">
          <td class="font-weight-medium">{{ slot.code }}</td>
          <td v-for="side in ['a', 'b']" :key="side" style="min-width: 200px">
            <v-select
              v-model="picks[slot.code][side]"
              :items="data.verified"
              item-title="pseudonym"
              item-value="id"
              :disabled="locked"
              clearable
              density="compact"
              hide-details
              placeholder="— wählen —"
            />
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-btn v-if="!locked" class="mt-4" color="secondary" variant="flat" :loading="saving" @click="submit">
      Auslosung eintragen
    </v-btn>
  </template>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { errorMessage, hcApi } from '@/services/hcApi'

const router = useRouter()
const data = ref(null)
const picks = reactive({})
const error = ref('')
const hint = ref('')
const saving = ref(false)

const locked = computed(() => data.value && data.value.tournament.state !== 'SETUP')

async function load () {
  try {
    data.value = (await hcApi.get('/draw')).data
    for (const s of data.value.firstRound) picks[s.code] = { a: s.a, b: s.b }
    hint.value = `${data.value.verified.length} verifizierte Spieler auf ${data.value.firstRound.length * 2} Plätze`
  } catch (e) {
    error.value = errorMessage(e)
  }
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

  const open = fields.length - ids.length
  hint.value = open > 0 ? `${open} Plätze bleiben leer — es fehlen Spieler.`
    : open < 0 ? `${-open} Spieler haben keinen Platz bekommen.`
      : 'Alle Plätze besetzt.'
}

function clear () {
  for (const code of Object.keys(picks)) picks[code] = { a: null, b: null }
  hint.value = 'Felder geleert.'
}

async function submit () {
  saving.value = true
  error.value = ''
  try {
    await hcApi.post('/draw', { assignments: picks })
    router.push('/gliddencup/admin/bracket')
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
