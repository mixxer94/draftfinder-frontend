<template>
  <PageHeader title="Stream-Overlays" text="Zwei OBS-Browserquellen zum Vergleichen zweier Spieler. Jede Änderung erscheint nach spätestens einer Sekunde im Stream.">
    <v-btn color="secondary" variant="flat" prepend-icon="mdi-rotate-3d-variant" :disabled="!loaded" @click="flipBoth">
      Beide umdrehen
    </v-btn>
  </PageHeader>

  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>

  <v-row>
    <v-col v-for="(view, i) in views" :key="i" cols="12" md="6">
      <v-card variant="tonal">
        <v-card-title>View {{ i + 1 }}</v-card-title>
        <v-card-text>
          <v-select
            :model-value="view.player"
            :items="playerItems"
            label="Spieler"
            clearable
            density="compact"
            :disabled="!loaded"
            class="mb-3"
            @update:model-value="nr => update(i, { player: nr ?? null })"
          />

          <v-btn-toggle
            :model-value="view.side"
            mandatory
            density="compact"
            variant="outlined"
            divided
            :disabled="!loaded || !view.player"
            class="mb-4"
            @update:model-value="side => update(i, { side })"
          >
            <v-btn value="front" prepend-icon="mdi-chart-bar">Vorderseite</v-btn>
            <v-btn value="back" prepend-icon="mdi-format-quote-open">Rückseite</v-btn>
          </v-btn-toggle>

          <div class="hc-preview mb-4">
            <PlayerCard v-if="playerByNumber(view.player)" :player="playerByNumber(view.player)" :side="view.side" />
            <span v-else class="text-medium-emphasis">Keine Karte – die Quelle ist leer.</span>
          </div>

          <v-text-field :model-value="overlayUrls.live(i + 1)" label="OBS-URL" readonly density="compact" hide-details
            append-inner-icon="mdi-content-copy" @click:append-inner="copy(overlayUrls.live(i + 1))" />
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>

  <h2 class="hc-h2 mt-8">Links für Streamer</h2>
  <p class="text-medium-emphasis mb-4 hc-lead">
    Diese Overlays steuert niemand, sie zeigen immer dieselbe Karte bzw. alle Karten. In OBS: Quellen → + → Browser → URL
    einfügen. Breite und Höhe frei wählen, die Karten passen sich an; für eine Karte z. B. 440 × 700, für alle 1920 × 540.
  </p>

  <v-row dense class="mb-2">
    <v-col cols="12" md="6">
      <v-text-field :model-value="overlayUrls.all()" label="Alle Karten, Vorderseite" readonly density="compact" hide-details
        append-inner-icon="mdi-content-copy" @click:append-inner="copy(overlayUrls.all())" />
    </v-col>
    <v-col cols="12" md="6">
      <v-text-field :model-value="overlayUrls.all('back')" label="Alle Karten, Rückseite" readonly density="compact" hide-details
        append-inner-icon="mdi-content-copy" @click:append-inner="copy(overlayUrls.all('back'))" />
    </v-col>
  </v-row>

  <v-table density="compact">
    <thead>
      <tr><th>Nr.</th><th>Spieler</th><th>Vorderseite</th><th class="d-none d-md-table-cell">Rückseite</th></tr>
    </thead>
    <tbody>
      <tr v-for="p in PLAYERS" :key="p.nr">
        <td>{{ p.nr }}</td>
        <td>{{ p.player.user }}</td>
        <td><v-btn size="small" variant="text" prepend-icon="mdi-content-copy" @click="copy(overlayUrls.player(p.nr))">Link kopieren</v-btn></td>
        <td class="d-none d-md-table-cell"><v-btn size="small" variant="text" prepend-icon="mdi-content-copy" @click="copy(overlayUrls.player(p.nr, 'back'))">Link kopieren</v-btn></td>
      </tr>
    </tbody>
  </v-table>

  <v-snackbar v-model="copied" :timeout="1500">Link kopiert</v-snackbar>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { errorMessage, hcApi } from '@/services/hcApi'
import PageHeader from '@/components/gliddencup/PageHeader.vue'
import PlayerCard from '@/components/gliddencup/public/PlayerCard.vue'
import { overlayUrls, playerByNumber, PLAYERS } from '@/components/gliddencup/overlay/overlay'

const views = ref([{ player: null, side: 'front' }, { player: null, side: 'front' }])
const loaded = ref(false)
const error = ref('')
const copied = ref(false)

const playerItems = PLAYERS.map(p => ({ title: `${p.nr} · ${p.player.user}`, value: p.nr }))

async function load () {
  try {
    views.value = (await hcApi.get('/stream')).data.views
    loaded.value = true
  } catch (e) {
    error.value = errorMessage(e)
  }
}

/** Sofort lokal anzeigen, dann speichern; scheitert das, gilt wieder der Stand des Servers. */
async function save (next) {
  views.value = next
  try {
    views.value = (await hcApi.put('/stream', { views: next })).data.views
  } catch (e) {
    error.value = errorMessage(e)
    await load()
  }
}

const update = (i, patch) => save(views.value.map((v, j) => (j === i ? { ...v, ...patch } : v)))

// Jede View dreht für sich um; bei ungleichen Seiten tauschen beide.
const flipBoth = () => save(views.value.map(v => ({ ...v, side: v.side === 'back' ? 'front' : 'back' })))

onMounted(load)

async function copy (url) {
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
  } catch {
    error.value = 'Kopieren nicht möglich. Bitte den Link markieren und selbst kopieren.'
  }
}

</script>

<style scoped>
.hc-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 350px;
}

.hc-lead { max-width: 70ch; }
</style>
