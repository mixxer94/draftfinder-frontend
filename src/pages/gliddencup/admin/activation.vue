<template>
  <PageHeader title="Matches freigeben" />
  <dl class="hc-actions text-medium-emphasis mb-6">
    <dt>Freigeben</dt>
    <dd>Der Bot lädt beide Spieler zur Terminfindung ein. 15 Minuten vor dem vereinbarten Termin schickt er die Draft-Links.</dd>
    <dt>Sofort starten</dt>
    <dd>Nur für den Notfall, wenn die Terminfindung nicht klappt. Der Bot schickt die Draft-Links sofort, das Spiel beginnt jetzt.</dd>
  </dl>

  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>
  <v-alert v-if="info" type="success" variant="tonal" closable class="mb-4" @click:close="info = ''">{{ info }}</v-alert>

  <template v-if="data">
    <p v-if="!data.ready.length" class="text-medium-emphasis">Kein Match bereit.</p>

    <template v-else>
      <div class="d-flex flex-wrap align-center ga-4 mb-6">
        <span>Spielzeitraum</span>
        <v-text-field v-model="period.from" type="date" label="von" density="compact" hide-details class="hc-date" />
        <v-text-field v-model="period.to" type="date" label="bis" density="compact" hide-details class="hc-date" />
        <span class="text-medium-emphasis">Bis dahin muss gespielt sein.</span>
      </div>

      <v-table density="compact">
        <thead>
          <tr><th>Slot</th><th class="d-none d-md-table-cell">Runde</th><th>Paarung</th><th /></tr>
        </thead>
        <tbody>
          <tr v-for="r in data.ready" :key="r.code">
            <td class="font-weight-medium text-no-wrap">{{ r.code }}</td>
            <td class="d-none d-md-table-cell">{{ r.label }}</td>
            <td>{{ r.a }} vs. {{ r.b }}</td>
            <td>
              <div class="d-flex flex-wrap justify-end ga-2 py-1">
                <v-btn
                  size="small"
                  color="secondary"
                  variant="flat"
                  prepend-icon="mdi-play"
                  :disabled="!validWindow || !!busy"
                  :loading="busy === r.code"
                  @click="activate(r)"
                >
                  Freigeben
                </v-btn>
                <!-- Notfall-Aktion, falls die Terminfindung nicht funktioniert; bewusst zurückhaltend. -->
                <v-btn
                  size="small"
                  variant="text"
                  :disabled="!validWindow || !!busy"
                  :loading="busy === `${r.code}-now`"
                  @click="activate(r, true)"
                >
                  Sofort starten
                </v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>
      <p v-if="!validWindow" class="text-error mt-2">Das Ende des Zeitraums liegt vor dem Anfang.</p>
    </template>
  </template>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { errorMessage, hcApi, hcSession } from '@/services/hcApi'
import { confirmAction } from '@/services/confirm'
import PageHeader from '@/components/gliddencup/PageHeader.vue'

// Sperren, die sich mit Begründung übergehen lassen (Audit-Log).
const OVERRIDABLE = ['PLAYER_BUSY', 'REPLAY_MISSING', 'DM_UNVERIFIED']

const data = ref(null)
const period = reactive({ from: '', to: '' })
const error = ref('')
const info = ref('')
const busy = ref('')

const validWindow = computed(() => period.from && period.to && period.from <= period.to)

async function load () {
  try {
    data.value = (await hcApi.get('/activation')).data
    hcSession.readyCount = data.value.ready.length
    const w = data.value.defaultWindow
    period.from ||= w.from.slice(0, 10)
    period.to ||= w.to.slice(0, 10)
  } catch (e) {
    error.value = errorMessage(e)
  }
}

/** Ganze Tage in der Turnierzone; die Frist zur Terminfindung ist das Ende des Zeitraums. */
function body (startNow, override) {
  const to = `${period.to}T23:59`
  return { from: `${period.from}T00:00`, to, deadline: to, startNow, ...(override ? { override } : {}) }
}

async function activate (r, startNow = false) {
  if (startNow) {
    const ok = await confirmAction({
      title: `${r.code} sofort starten?`,
      text: `Bist du wirklich sicher? Der Bot schickt ${r.a} und ${r.b} direkt die Draft-Links und das Spiel startet.`,
      confirmText: 'Sofort starten',
    })
    if (!ok) return
  }
  busy.value = startNow ? `${r.code}-now` : r.code
  error.value = ''
  try {
    if (!await post(r, startNow)) return
    info.value = startNow ? `${r.code} gestartet.` : `${r.code} freigegeben. Die Einladungen sind unterwegs.`
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = ''
  }
}

/**
 * Bei einer übergehbaren Sperre fragt der Dialog nach einem Grund und
 * versucht es erneut. `false`, wenn die Turnierleitung abbricht.
 */
async function post (r, startNow) {
  try {
    await hcApi.post(`/activation/${r.code}`, body(startNow))
    return true
  } catch (e) {
    if (!OVERRIDABLE.includes(e.response?.data?.error)) throw e
    const reason = await confirmAction({
      title: 'Freigabe gesperrt',
      text: `${errorMessage(e)}\nTrotzdem freigeben? Der Grund steht danach im Audit-Log.`,
      confirmText: 'Trotzdem freigeben',
      color: 'warning',
      reasonLabel: 'Grund',
    })
    if (!reason) return false
    await hcApi.post(`/activation/${r.code}`, body(startNow, reason))
    return true
  }
}

onMounted(load)
</script>

<style scoped>
.hc-date { max-width: 180px; }
.hc-actions { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; max-width: 80ch; margin-top: -0.75rem; }
.hc-actions dt { font-weight: 600; color: rgb(var(--v-theme-on-surface)); }
</style>
