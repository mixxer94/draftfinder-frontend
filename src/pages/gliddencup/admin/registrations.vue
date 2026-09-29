<template>
  <PageHeader title="Anmeldungen" text="Discord-Namen sind verdeckt. Aufdecken zeigt sie zwei Minuten lang und steht im Audit-Log.">
    <v-btn variant="tonal" prepend-icon="mdi-repeat" :loading="busy === 'rebuild'" @click="rebuild">Liste im Kanal neu posten</v-btn>
  </PageHeader>

  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>
  <v-alert v-if="info" type="success" variant="tonal" closable class="mb-4" @click:close="info = ''">{{ info }}</v-alert>

  <v-table density="comfortable">
    <thead>
      <tr><th>Pseudonym</th><th>Discord</th><th>Status</th><th>Aktionen</th></tr>
    </thead>
    <tbody>
      <tr v-for="(p, i) in players" :key="p.id">
        <td class="font-weight-bold">{{ p.pseudonym || '—' }}</td>
        <td class="text-no-wrap">
          <template v-if="revealed[p.id]">
            <code>{{ revealed[p.id].discordTag }}</code>
            <div v-if="nameEdit.id !== p.id" class="d-flex align-center ga-1">
              <span>{{ revealed[p.id].displayName ?? '—' }}</span>
              <v-btn v-if="setup" icon="mdi-pencil" size="x-small" variant="text" :aria-label="`Anzeigename bearbeiten: ${rowName(p, i)}`" @click="editName(p)" />
            </div>
            <div v-else class="d-flex align-center ga-2 py-1">
              <v-text-field
                v-model="nameEdit.value"
                label="Anzeigename"
                density="compact"
                hide-details
                maxlength="64"
                autofocus
                style="min-width: 180px; max-width: 240px"
                @keyup.enter="saveName(p)"
              />
              <v-btn size="small" color="secondary" variant="flat" :disabled="!nameValid" :loading="busy === `name-${p.id}`" @click="saveName(p)">Speichern</v-btn>
              <v-btn size="small" variant="text" @click="nameEdit.id = null">Abbrechen</v-btn>
            </div>
          </template>
          <template v-else>
            <span class="text-medium-emphasis">••••••••</span>
            <v-btn size="small" variant="text" :loading="busy === `reveal-${p.id}`" :aria-label="`Aufdecken: ${rowName(p, i)}`" @click="reveal(p)">Aufdecken</v-btn>
          </template>
        </td>
        <td>
          <v-chip size="small" variant="tonal" :color="statusColor(p.status)">{{ PLAYER_STATUS[p.status] ?? p.status }}</v-chip>
          <div v-if="p.removal?.reason" class="text-body-2 text-medium-emphasis">{{ p.removal.reason }}</div>
        </td>
        <td>
          <div class="d-flex flex-wrap align-center ga-2 py-1">
            <template v-if="!p.pseudonym && !isOut(p)">
              <v-text-field
                v-model="pseudonymInput[p.id]"
                label="Pseudonym"
                placeholder="Leer = Vorschlag"
                density="compact"
                hide-details
                style="max-width: 220px"
              />
              <v-btn size="small" color="secondary" variant="flat" :loading="busy === `ps-${p.id}`" :aria-label="`Vergeben: ${rowName(p, i)}`" @click="assign(p)">
                Vergeben
              </v-btn>
            </template>
            <v-btn v-if="!isOut(p)" size="small" color="error" variant="text" :aria-label="`Entfernen: ${rowName(p, i)}`" @click="openRemove(p)">Entfernen</v-btn>
            <v-btn v-else size="small" variant="tonal" :loading="busy === `re-${p.id}`" :aria-label="`Wieder aufnehmen: ${rowName(p, i)}`" @click="readmit(p)">
              Wieder aufnehmen
            </v-btn>
          </div>
        </td>
      </tr>
      <tr v-if="!players.length && !loading"><td colspan="4" class="text-medium-emphasis">Noch keine Anmeldungen.</td></tr>
    </tbody>
  </v-table>

  <v-dialog v-model="removeDialog.open" max-width="480">
    <v-card class="hc-dialog pa-2" title="Anmeldung entfernen">
      <v-card-text>
        <p class="mb-3">
          <strong>{{ removeDialog.player?.pseudonym || 'Spieler ohne Pseudonym' }}</strong> entfernen?
          Das Pseudonym bleibt reserviert.
        </p>
        <v-text-field v-model="removeDialog.reason" label="Grund" autofocus />
        <v-checkbox
          v-model="removeDialog.permanent"
          label="Dauerhaft sperren (keine Neuanmeldung möglich)"
          density="compact"
          hide-details
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="removeDialog.open = false">Abbrechen</v-btn>
        <v-btn color="error" variant="flat" :disabled="!removeDialog.reason.trim()" :loading="busy === 'remove'" @click="remove">
          Entfernen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { errorMessage, hcApi, PLAYER_STATUS } from '@/services/hcApi'
import { confirmAction } from '@/services/confirm'
import PageHeader from '@/components/gliddencup/PageHeader.vue'

const players = ref([])
/*
 * Turnierzustand aus der eigenen Antwort statt aus hcSession.tournamentState:
 * Das setzt das Layout erst nach einem Dashboard-Abruf, beim direkten Aufruf
 * der Seite also womöglich später oder gar nicht.
 */
const tournamentState = ref(null)
// Nach der Auslosung steht der Anzeigename fest, an ihm hängen die Tipps (409 NAME_FIXED).
const setup = computed(() => tournamentState.value === 'SETUP')
const loading = ref(false)
const error = ref('')
const info = ref('')
const busy = ref('')
const pseudonymInput = reactive({})
const revealed = reactive({})
const timers = []
const removeDialog = reactive({ open: false, player: null, reason: '', permanent: false })

const isOut = p => p.status === 'ENTFERNT' || p.status === 'GESPERRT'
// Zeilenname für Screenreader; ohne Pseudonym bleibt nur die Position, der Discord-Name ist verdeckt.
const rowName = (p, i) => p.pseudonym || `Anmeldung ${i + 1}`
const statusColor = s =>
  s === 'VERIFIED' ? 'success' : s === 'DM_BLOCKED' || s === 'GESPERRT' ? 'error' : s === 'ENTFERNT' ? 'grey' : 'warning'

async function load () {
  loading.value = true
  try {
    const data = (await hcApi.get('/registrations')).data
    players.value = data.players
    tournamentState.value = data.tournament?.state ?? null
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    loading.value = false
  }
}

/** Führt eine Aktion aus, meldet Fehler und lädt danach neu. */
async function run (key, fn, success) {
  busy.value = key
  error.value = ''
  info.value = ''
  try {
    await fn()
    if (success) info.value = success
    await load()
    return true
  } catch (e) {
    error.value = errorMessage(e)
    return false
  } finally {
    busy.value = ''
  }
}

const rebuild = () => run('rebuild', () => hcApi.post('/registrations/list/rebuild'), 'Liste neu gepostet.')

const assign = p =>
  run(`ps-${p.id}`, () => hcApi.post(`/registrations/${p.id}/pseudonym`, { pseudonym: pseudonymInput[p.id] ?? '' }))

async function readmit (p) {
  const ok = await confirmAction({
    title: `${p.pseudonym || 'Spieler'} wieder aufnehmen?`,
    text: p.pseudonym ? 'Das Pseudonym bleibt erhalten.' : '',
    confirmText: 'Wieder aufnehmen',
  })
  if (ok) run(`re-${p.id}`, () => hcApi.post(`/registrations/${p.id}/readmit`))
}

function openRemove (p) {
  Object.assign(removeDialog, { open: true, player: p, reason: '', permanent: false })
}

async function remove () {
  const { player, reason, permanent } = removeDialog
  const done = await run('remove', () => hcApi.post(`/registrations/${player.id}/remove`, { reason, permanent }))
  if (done) removeDialog.open = false
}

/** Klarname nur bis zum Ablauf des Reveal-Fensters, dann wieder verdeckt. */
async function reveal (p) {
  busy.value = `reveal-${p.id}`
  try {
    const { discordTag, displayName, until } = (await hcApi.post(`/players/${p.id}/reveal`)).data
    revealed[p.id] = { discordTag, displayName }
    timers.push(setTimeout(() => {
      delete revealed[p.id]
      if (nameEdit.id === p.id) nameEdit.id = null
    }, Math.max(0, new Date(until) - Date.now())))
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = ''
  }
}

// Bearbeiten nur im Reveal-Fenster: ohne Aufdecken kennt die Seite den Namen nicht.
const nameEdit = reactive({ id: null, value: '' })
const nameValid = computed(() => nameEdit.value.trim().length >= 1 && nameEdit.value.trim().length <= 64)

function editName (p) {
  Object.assign(nameEdit, { id: p.id, value: revealed[p.id].displayName ?? '' })
}

async function saveName (p) {
  if (!nameValid.value) return
  const displayName = nameEdit.value.trim()
  busy.value = `name-${p.id}`
  error.value = ''
  try {
    await hcApi.put(`/players/${p.id}/display-name`, { displayName })
    if (revealed[p.id]) revealed[p.id].displayName = displayName
    nameEdit.id = null
    info.value = `Anzeigename von ${p.pseudonym || 'Spieler'} gespeichert.`
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = ''
  }
}

onMounted(load)
onUnmounted(() => timers.forEach(clearTimeout))
</script>
