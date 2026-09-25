<template>
  <h2 class="text-h6 mb-2">Runden, Best of und Draft-Presets</h2>
  <p class="text-medium-emphasis mb-4">
    Beim ersten Speichern mit „auf alle Runden übernehmen" gelten die Werte überall. Danach
    einzelne Runden überschreiben — typischerweise ab dem Halbfinale auf Bo5. Losers-Runden
    erben vom parallelen Winners-Rundenlabel.
  </p>

  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>
  <v-alert v-if="info" type="success" variant="tonal" closable class="mb-4" @click:close="info = ''">{{ info }}</v-alert>

  <v-card variant="tonal" class="mb-6">
    <v-card-text>
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <v-select v-model="form.label" :items="labels" label="Rundenlabel" density="compact" />
        </v-col>
        <v-col cols="12" sm="6" md="2">
          <v-select v-model="form.bestOf" :items="[3, 5, 7]" label="Best of" density="compact" />
        </v-col>
        <v-col cols="12" md="7" />
        <v-col cols="12" md="6">
          <v-text-field v-model="form.mapPresetUrl" label="Map-Draft-Preset" placeholder="https://aoe2cm.net/preset/…" density="compact" />
        </v-col>
        <v-col cols="12" md="6">
          <v-text-field v-model="form.civPresetUrl" label="Civ-Draft-Preset" placeholder="https://aoe2cm.net/preset/…" density="compact" />
        </v-col>
      </v-row>
      <v-checkbox v-model="form.applyToAll" label="auf alle Runden übernehmen" density="compact" hide-details />
    </v-card-text>
    <v-card-actions>
      <v-btn color="secondary" variant="flat" :loading="saving" :disabled="!form.label" @click="save">Speichern</v-btn>
    </v-card-actions>
  </v-card>

  <v-table density="compact">
    <thead>
      <tr><th>Bracket</th><th>Runde</th><th>Label</th><th>Best of</th><th>Map-Draft</th><th>Civ-Draft</th><th /></tr>
    </thead>
    <tbody>
      <tr v-for="r in rounds" :key="`${r.bracket}-${r.number}`">
        <td>{{ r.bracket }}</td>
        <td>{{ r.number }}</td>
        <td>
          {{ r.label }}
          <span v-if="r.inheritsLabelFrom" class="text-medium-emphasis">← erbt von {{ r.inheritsLabelFrom }}</span>
        </td>
        <td>{{ r.bestOf }}</td>
        <td class="text-caption">{{ r.mapPresetUrl || '—' }}</td>
        <td class="text-caption">{{ r.civPresetUrl || '—' }}</td>
        <td><v-chip v-if="r.overridden" size="x-small" color="warning" variant="flat">abweichend</v-chip></td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { errorMessage, hcApi } from '@/services/hcApi'

const rounds = ref([])
const error = ref('')
const info = ref('')
const saving = ref(false)
const form = reactive({ label: '', bestOf: 3, mapPresetUrl: '', civPresetUrl: '', applyToAll: false })

const labels = computed(() => [...new Set(rounds.value.filter(r => !r.inheritsLabelFrom).map(r => r.label))])

async function load () {
  try {
    rounds.value = (await hcApi.get('/rounds')).data.rounds
    form.label ||= labels.value[0] ?? ''
  } catch (e) {
    error.value = errorMessage(e)
  }
}

async function save () {
  saving.value = true
  error.value = ''
  try {
    rounds.value = (await hcApi.put('/rounds', form)).data.rounds
    info.value = form.applyToAll ? 'Für alle Runden gespeichert.' : `„${form.label}" gespeichert.`
  } catch (e) {
    error.value = errorMessage(e)
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
