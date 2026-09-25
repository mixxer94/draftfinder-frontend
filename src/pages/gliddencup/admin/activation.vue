<template>
  <h2 class="text-h6 mb-2">Aktivierungs-Warteschlange</h2>
  <p class="text-medium-emphasis mb-4">
    Sortiert nach der Anzahl abhängiger Folge-Slots — je mehr an einem Match hängt, desto teurer
    ist seine Verzögerung. Ein Match wird <em>bereit</em>, sobald seine Zubringer gewertet sind;
    <em>aktiviert</em> wird es ausschließlich hier. Zeiten gelten in der Turnierzone
    ({{ data?.tournament.timezone }}).
  </p>

  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>
  <v-alert v-if="info" type="success" variant="tonal" closable class="mb-4" @click:close="info = ''">{{ info }}</v-alert>

  <p v-if="data && !data.ready.length">Derzeit ist kein Match bereit.</p>

  <v-card v-for="r in data?.ready ?? []" :key="r.code" variant="tonal" class="mb-3">
    <v-card-title class="d-flex flex-wrap align-center ga-2 text-body-1">
      <strong>{{ r.code }}</strong>
      <span>{{ r.label }}</span>
      <span class="text-medium-emphasis">{{ r.a }} vs. {{ r.b }}</span>
      <v-chip size="x-small" variant="flat" :color="r.dependentSlotCount > 2 ? 'warning' : 'grey'">
        {{ r.dependentSlotCount }} abhängige Slots
      </v-chip>
    </v-card-title>
    <v-card-text>
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <v-text-field v-model="forms[r.code].from" type="datetime-local" label="Fenster von" density="compact" hide-details />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field v-model="forms[r.code].to" type="datetime-local" label="Fenster bis" density="compact" hide-details />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field v-model="forms[r.code].deadline" type="datetime-local" label="Deadline" density="compact" hide-details />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-text-field v-model="forms[r.code].override" label="Sperre übersteuern (Grund)" placeholder="nur wenn nötig" density="compact" hide-details />
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-btn color="secondary" variant="flat" :loading="busy === r.code" @click="activate(r)">Match aktivieren</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { errorMessage, hcApi } from '@/services/hcApi'

const data = ref(null)
const forms = reactive({})
const error = ref('')
const info = ref('')
const busy = ref('')

async function load () {
  try {
    data.value = (await hcApi.get('/activation')).data
    const w = data.value.defaultWindow
    for (const r of data.value.ready) {
      forms[r.code] ??= { from: w.from, to: w.to, deadline: w.to, override: '' }
    }
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function activate (r) {
  busy.value = r.code
  error.value = ''
  try {
    await hcApi.post(`/activation/${r.code}`, forms[r.code])
    info.value = `${r.code} aktiviert — die Eröffnungs-DMs sind unterwegs.`
    delete forms[r.code]
    await load()
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    busy.value = ''
  }
}

onMounted(load)
</script>
