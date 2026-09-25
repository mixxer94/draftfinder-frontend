<template>
  <div class="d-flex align-center flex-wrap ga-2 mb-2">
    <h2 class="text-h6">Anmeldungen &amp; Spieler</h2>
    <v-spacer />
    <v-btn variant="tonal" :loading="busy === 'rebuild'" @click="rebuild">
      <v-icon start>mdi-repeat</v-icon>Anmeldeliste neu posten
    </v-btn>
  </div>
  <p class="text-medium-emphasis mb-4">
    Discord-Namen sind verdeckt. „Aufdecken" zeigt sie für zwei Minuten und wird im Audit-Log
    protokolliert. „Neu posten" löscht die Liste im Kanal und schreibt sie unten neu — laufende
    Änderungen aktualisieren sie ohnehin von selbst.
  </p>

  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>
  <v-alert v-if="info" type="success" variant="tonal" closable class="mb-4" @click:close="info = ''">{{ info }}</v-alert>

  <v-table density="comfortable">
    <thead>
      <tr><th>Pseudonym</th><th>Discord</th><th>Status</th><th>Aktionen</th></tr>
    </thead>
    <tbody>
      <tr v-for="p in players" :key="p.id">
        <td class="font-weight-bold">{{ p.pseudonym || '—' }}</td>
        <td class="text-no-wrap">
          <template v-if="revealed[p.id]">
            <code>{{ revealed[p.id] }}</code>
          </template>
          <template v-else>
            <span class="text-medium-emphasis">••••••••</span>
            <v-btn size="x-small" variant="text" :loading="busy === `reveal-${p.id}`" @click="reveal(p)">Aufdecken</v-btn>
          </template>
        </td>
        <td>
          <v-chip size="small" variant="flat" :color="statusColor(p.status)">{{ p.status }}</v-chip>
          <div v-if="p.removal?.reason" class="text-caption text-medium-emphasis">{{ p.removal.reason }}</div>
        </td>
        <td>
          <div class="d-flex flex-wrap align-center ga-2 py-1">
            <template v-if="!p.pseudonym && !isOut(p)">
              <v-text-field
                v-model="pseudonymInput[p.id]"
                placeholder="leer = Vorschlag"
                density="compact"
                hide-details
                style="max-width: 180px"
              />
              <v-btn size="small" color="secondary" :loading="busy === `ps-${p.id}`" @click="assign(p)">
                Pseudonym vergeben
              </v-btn>
            </template>
            <v-btn v-if="!isOut(p)" size="small" color="error" variant="tonal" @click="openRemove(p)">Entfernen</v-btn>
            <v-btn v-else size="small" variant="tonal" :loading="busy === `re-${p.id}`" @click="readmit(p)">
              Wieder aufnehmen
            </v-btn>
          </div>
        </td>
      </tr>
      <tr v-if="!players.length && !loading"><td colspan="4" class="text-medium-emphasis">Noch keine Anmeldungen.</td></tr>
    </tbody>
  </v-table>

  <v-dialog v-model="removeDialog.open" max-width="480">
    <v-card title="Anmeldung entfernen">
      <v-card-text>
        <p class="mb-3">
          <strong>{{ removeDialog.player?.pseudonym || 'Spieler ohne Pseudonym' }}</strong> entfernen?
          Das Pseudonym bleibt reserviert und wird niemand anderem gegeben.
        </p>
        <v-text-field v-model="removeDialog.reason" label="Grund (Pflicht)" autofocus />
        <v-checkbox
          v-model="removeDialog.permanent"
          label="dauerhaft — nur für gesicherte Fehlanmeldungen; kann sich nicht selbst neu anmelden"
          density="compact"
          hide-details
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="removeDialog.open = false">Abbrechen</v-btn>
        <v-btn color="error" variant="flat" :disabled="!removeDialog.reason.trim()" :loading="busy === 'remove'" @click="remove">
          Entfernen
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { errorMessage, hcApi } from '@/services/hcApi'

const players = ref([])
const loading = ref(false)
const error = ref('')
const info = ref('')
const busy = ref('')
const pseudonymInput = reactive({})
const revealed = reactive({})
const timers = []
const removeDialog = reactive({ open: false, player: null, reason: '', permanent: false })

const isOut = p => p.status === 'ENTFERNT' || p.status === 'GESPERRT'
const statusColor = s =>
  s === 'VERIFIED' ? 'success' : s === 'DM_BLOCKED' || s === 'GESPERRT' ? 'error' : s === 'ENTFERNT' ? 'grey' : 'warning'

async function load () {
  loading.value = true
  try {
    players.value = (await hcApi.get('/registrations')).data.players
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

const rebuild = () => run('rebuild', () => hcApi.post('/registrations/list/rebuild'), 'Anmeldeliste neu gepostet.')

const assign = p =>
  run(`ps-${p.id}`, () => hcApi.post(`/registrations/${p.id}/pseudonym`, { pseudonym: pseudonymInput[p.id] ?? '' }))

const readmit = p => {
  if (!confirm(`Spieler wieder aufnehmen?${p.pseudonym ? ' Er behält sein Pseudonym.' : ''}`)) return
  run(`re-${p.id}`, () => hcApi.post(`/registrations/${p.id}/readmit`))
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
    const { discordTag, until } = (await hcApi.post(`/players/${p.id}/reveal`)).data
    revealed[p.id] = discordTag
    timers.push(setTimeout(() => delete revealed[p.id], Math.max(0, new Date(until) - Date.now())))
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = ''
  }
}

onMounted(load)
onUnmounted(() => timers.forEach(clearTimeout))
</script>
