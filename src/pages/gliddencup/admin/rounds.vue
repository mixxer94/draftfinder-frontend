<template>
  <PageHeader title="Runden" :text="lead" />

  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>
  <v-alert v-if="info" type="success" variant="tonal" closable class="mb-4" @click:close="info = ''">{{ info }}</v-alert>

  <v-sheet border rounded class="pa-4 mb-8">
    <v-row dense>
      <v-col cols="12" sm="6" md="3">
        <v-select v-model="form.label" :items="labels" label="Runde" density="compact" />
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
    <div class="d-flex flex-wrap align-center ga-4 mt-2">
      <v-checkbox v-model="form.applyToAll" label="Für alle Runden übernehmen" density="compact" hide-details />
      <v-spacer />
      <v-btn color="secondary" variant="flat" :loading="saving" :disabled="!form.label" @click="save">Speichern</v-btn>
    </div>
  </v-sheet>

  <v-table density="compact">
    <thead>
      <tr><th>Bracket</th><th>Nr.</th><th>Runde</th><th>Best of</th><th>Map-Draft</th><th>Civ-Draft</th><th /></tr>
    </thead>
    <tbody>
      <tr v-for="r in rounds" :key="`${r.bracket}-${r.number}`">
        <td>{{ BRACKETS[r.bracket] ?? r.bracket }}</td>
        <td>{{ r.number }}</td>
        <td>
          {{ r.label }}
          <span v-if="r.inheritsLabelFrom" class="text-medium-emphasis">(wie {{ r.inheritsLabelFrom }})</span>
        </td>
        <td>{{ r.bestOf }}</td>
        <td><PresetLink :url="r.mapPresetUrl" /></td>
        <td><PresetLink :url="r.civPresetUrl" /></td>
        <td><v-chip v-if="r.overridden" size="small" color="warning" variant="tonal">abweichend</v-chip></td>
      </tr>
    </tbody>
  </v-table>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { BRACKETS, errorMessage, hcApi } from '@/services/hcApi'
import PageHeader from '@/components/gliddencup/PageHeader.vue'
import PresetLink from '@/components/gliddencup/PresetLink.vue'

const rounds = ref([])
const error = ref('')
const info = ref('')
const saving = ref(false)
const form = reactive({ label: '', bestOf: 3, mapPresetUrl: '', civPresetUrl: '', applyToAll: false })

// Den Hinweis auf Loser-Runden gibt es nur bei Double Elimination.
const lead = computed(() => rounds.value.some(r => r.bracket === 'LOSERS')
  ? 'Best of und Draft-Presets je Runde. Loser-Runden übernehmen die Werte der gleichnamigen Winner-Runde.'
  : 'Best of und Draft-Presets je Runde.')
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
