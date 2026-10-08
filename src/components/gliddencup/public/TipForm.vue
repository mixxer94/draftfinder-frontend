<template>
  <div>
    <v-alert
      v-if="loginFailed"
      type="error"
      variant="tonal"
      closable
      class="mb-4"
      text="Die Anmeldung über Discord hat nicht geklappt. Versuch es bitte noch einmal."
      @click:close="loginFailed = false"
    />

    <!-- Konto -->
    <section class="mb-6">
      <div v-if="account === 'loading'" class="py-2"><v-progress-linear indeterminate color="secondary" /></div>

      <v-alert v-else-if="account === 'down'" type="warning" variant="tonal">
        Das Tippspiel ist gerade nicht erreichbar. Lade die Seite in ein paar Minuten neu.
      </v-alert>

      <div v-else-if="account === 'anon'" class="d-flex align-center flex-wrap ga-3">
        <p class="text-body-1 mr-2">Melde dich an, um deine Tipps zu speichern. Es reicht ein Discord-Konto.</p>
        <v-btn color="secondary" variant="flat" :href="LOGIN_URL" prepend-icon="mdi-login">Mit Discord anmelden</v-btn>
      </div>

      <div v-else class="d-flex align-center flex-wrap ga-2">
        <span class="text-body-1 mr-2">Du tippst als <strong>{{ me.displayName }}</strong></span>
        <v-btn variant="text" prepend-icon="mdi-pencil" @click="openNameDialog">Name ändern</v-btn>
        <v-btn variant="text" prepend-icon="mdi-logout" :loading="loggingOut" @click="logout">Abmelden</v-btn>
      </div>
    </section>

    <!-- Turnierstand -->
    <v-alert v-if="!tournament && notFound" type="info" variant="tonal" class="mb-4">
      Das Turnier ist noch nicht ausgelost. Sobald die Pseudonyme feststehen, kannst du hier tippen.
    </v-alert>
    <v-alert v-else-if="!tournament && hcError" type="warning" variant="tonal" class="mb-4">
      Die Turnierdaten sind gerade nicht erreichbar. Die Seite versucht es alle paar Sekunden erneut.
    </v-alert>
    <div v-else-if="!tournament" class="d-flex justify-center pa-8"><v-progress-circular indeterminate /></div>

    <template v-else>
      <v-alert v-if="!tournament.tipsOpen" type="info" variant="tonal" class="mb-4">
        Tippen ist geschlossen.
      </v-alert>

      <div class="d-flex align-baseline flex-wrap ga-2 mb-3">
        <h2 class="hc-h2 mb-0">Wer steckt hinter welchem Pseudonym?</h2>
        <span class="text-body-2 text-medium-emphasis">{{ filled }} von {{ pseudonyms.length }} getippt</span>
      </div>

      <v-row dense>
        <v-col v-for="ps in pseudonyms" :key="ps" cols="12" sm="6" md="4" lg="3">
          <v-autocomplete
            v-model="picks[ps]"
            v-model:search="searches[ps]"
            :label="ps"
            :items="participants"
            :disabled="!editable"
            :error="duplicatePseudonyms.has(ps)"
            persistent-placeholder
            placeholder="Nicht getippt"
            clearable
            density="comfortable"
            hide-details
            auto-select-first
            @blur="autoFill(ps)"
          />
        </v-col>
      </v-row>

      <v-alert v-if="duplicates.length" type="warning" variant="tonal" class="mt-4" title="Derselbe Name steht mehrmals in deinen Tipps">
        <ul class="gc-list mt-1">
          <li v-for="d in duplicates" :key="d.name">
            <strong>{{ d.name }}</strong> bei {{ d.pseudonyms.join(', ') }}
          </li>
        </ul>
      </v-alert>

      <h2 class="hc-h2 mt-8 mb-1">Wer ist Guy Glidden?</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        In dieser Ausgabe ist ein Spieler angetreten, von dem weder Zuschauer noch Spieler die Identität kennen.
      </p>
      <v-text-field
        v-model="mystery"
        label="Dein Tipp"
        :disabled="!editable"
        :counter="MYSTERY_MAX_LENGTH"
        :maxlength="MYSTERY_MAX_LENGTH"
        persistent-placeholder
        placeholder="Nicht getippt"
        clearable
        density="comfortable"
        class="gc-mystery"
      />

      <div v-if="account === 'in' && tournament.tipsOpen" class="gc-savebar d-flex align-center justify-end flex-wrap ga-3 mt-4 py-3">
        <v-alert v-if="saveError" type="error" variant="tonal" density="compact" class="flex-grow-1">{{ saveError }}</v-alert>
        <span v-else-if="dirty" class="text-body-2 text-medium-emphasis">Ungespeicherte Änderungen</span>
        <span v-else-if="savedAt" class="text-body-2 text-medium-emphasis">
          <v-icon icon="mdi-check" size="small" color="success" /> Gespeichert um {{ savedAt }}
        </span>
        <v-btn color="secondary" variant="flat" :loading="saving" :disabled="!dirty" @click="save">Tipps speichern</v-btn>
      </div>
    </template>

    <!-- Anzeigename -->
    <v-dialog v-model="nameDialog.open" max-width="440">
      <v-card class="gc-dialog pa-2">
        <v-card-title class="text-h6 text-wrap">{{ me?.needsName ? 'Wie sollen wir dich nennen?' : 'Name ändern' }}</v-card-title>
        <v-card-text>
          <p class="mb-4">Unter diesem Namen erscheinen deine Tipps, sobald die Zuordnung veröffentlicht ist.</p>
          <v-text-field
            v-model="nameDialog.value"
            label="Anzeigename"
            counter="24"
            :error-messages="nameDialog.error"
            autofocus
            @keyup.enter="saveName"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="nameDialog.open = false">{{ me?.needsName ? 'Später' : 'Abbrechen' }}</v-btn>
          <v-btn color="secondary" variant="flat" :loading="nameDialog.saving" @click="saveName">Speichern</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gcApi, LOGIN_URL } from '@/services/gliddencupApi'
import { bestMatch, duplicateNames } from '@/services/gliddencupStats'

/** Tippen: Discord-Anmeldung, Anzeigename und ein Feld je Pseudonym. */
const props = defineProps({
  tournament: { type: Object, default: null },
  notFound: { type: Boolean, default: false },
  hcError: { type: String, default: '' },
})

const route = useRoute()
const loginFailed = ref(route.query.login === 'failed')

const me = ref(null)
// loading | anon | in | down
const account = ref('loading')
const loggingOut = ref(false)

const pseudonyms = computed(() => props.tournament?.pseudonyms ?? [])
const participants = computed(() => props.tournament?.participants ?? [])
const editable = computed(() => account.value === 'in' && !!props.tournament?.tipsOpen)

// Tipps als Pseudonym → Name. Die Abfrage alle 10 s ersetzt nur die
// Pseudonymliste, nie diese Eingaben.
const picks = reactive({})
const searches = reactive({})
const saved = ref({})
const saving = ref(false)
const saveError = ref('')
const savedAt = ref('')

const MYSTERY_MAX_LENGTH = 60
const mystery = ref('')
const savedMystery = ref('')

const clean = s => (s ?? '').trim()
const current = () => Object.fromEntries(pseudonyms.value.map(ps => [ps, clean(picks[ps])]))
const dirty = computed(() => clean(mystery.value) !== savedMystery.value ||
  pseudonyms.value.some(ps => clean(picks[ps]) !== (saved.value[ps] ?? '')))
const filled = computed(() => pseudonyms.value.filter(ps => clean(picks[ps])).length)
const duplicates = computed(() => duplicateNames(current()))
const duplicatePseudonyms = computed(() => new Set(duplicates.value.flatMap(d => d.pseudonyms)))

watch(dirty, d => { if (d) savedAt.value = '' })

function autoFill (ps) {
  const match = bestMatch(searches[ps] || picks[ps], participants.value)
  if (match) picks[ps] = match
}

function applyTips ({ picks: list, mysteryGuess } = {}) {
  const map = Object.fromEntries((list ?? []).map(p => [p.pseudonym, clean(p.playerName)]))
  for (const ps of Object.keys(picks)) delete picks[ps]
  Object.assign(picks, map)
  saved.value = map
  mystery.value = savedMystery.value = clean(mysteryGuess)
}

async function loadMe () {
  try {
    me.value = (await gcApi.get('/me')).data
    account.value = 'in'
    if (me.value.needsName) openNameDialog()
    await loadTips()
  } catch (e) {
    me.value = null
    account.value = e.response?.status === 401 ? 'anon' : 'down'
  }
}

async function loadTips () {
  try {
    applyTips((await gcApi.get('/tips/me')).data)
  } catch (e) {
    // Ohne gespeicherte Tipps ist das Formular leer; das ist kein Fehler, den man anzeigen muss.
    if (e.response?.status === 401) signedOut()
  }
}

function signedOut () {
  me.value = null
  account.value = 'anon'
}

async function save () {
  saving.value = true
  saveError.value = ''
  try {
    const picks = Object.entries(current()).map(([pseudonym, playerName]) => ({ pseudonym, playerName }))
    const sent = { picks, mysteryGuess: clean(mystery.value) }
    const res = await gcApi.put('/tips', sent)
    applyTips(Array.isArray(res.data?.picks) ? res.data : sent)
    savedAt.value = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  } catch (e) {
    saveError.value = saveErrorText(e)
  } finally {
    saving.value = false
  }
}

function saveErrorText (e) {
  const status = e.response?.status
  if (status === 401) {
    signedOut()
    return 'Deine Anmeldung ist abgelaufen. Melde dich neu an und speichere noch einmal.'
  }
  if (status === 409) return 'Tippen ist inzwischen geschlossen. Es zählen deine zuletzt gespeicherten Tipps.'
  if (status === 400) return 'Ein Tipp passt nicht zur aktuellen Teilnehmerliste. Lade die Seite neu und prüf deine Auswahl.'
  if (status === 503) return 'Die Turnierdaten sind gerade nicht erreichbar. Deine Tipps sind noch nicht gespeichert; versuch es gleich noch einmal.'
  return 'Speichern hat nicht geklappt. Deine Eingaben sind noch da; versuch es gleich noch einmal.'
}

async function logout () {
  loggingOut.value = true
  await gcApi.post('/auth/logout').catch(() => {})
  loggingOut.value = false
  signedOut()
  applyTips()
}

const nameDialog = reactive({ open: false, value: '', error: '', saving: false })

function openNameDialog () {
  Object.assign(nameDialog, { open: true, value: me.value?.displayName ?? '', error: '' })
}

async function saveName () {
  const name = nameDialog.value.trim()
  if (name.length < 3 || name.length > 24) {
    nameDialog.error = 'Der Name braucht 3 bis 24 Zeichen.'
    return
  }
  nameDialog.saving = true
  nameDialog.error = ''
  try {
    me.value = (await gcApi.patch('/me', { displayName: name })).data
    nameDialog.open = false
  } catch (e) {
    const status = e.response?.status
    if (status === 401) {
      nameDialog.open = false
      signedOut()
    } else {
      nameDialog.error = {
        409: 'Der Name ist schon vergeben.',
        400: 'Der Name braucht 3 bis 24 Zeichen.',
      }[status] ?? 'Speichern hat nicht geklappt. Versuch es gleich noch einmal.'
    }
  } finally {
    nameDialog.saving = false
  }
}

onMounted(loadMe)
</script>

<style scoped>
.gc-list { padding-left: 1.25rem; }
.gc-mystery { max-width: 28rem; }

/* Auf dem Handy liegen 16 Felder untereinander; der Speichern-Button bleibt in Reichweite. */
.gc-savebar {
  position: sticky;
  bottom: 0;
  z-index: 1;
  background: rgb(var(--v-theme-background));
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
