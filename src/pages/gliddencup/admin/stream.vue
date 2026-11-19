<template>
  <PageHeader title="Stream-Overlays" text="Zwei OBS-Browserquellen zum Vergleichen zweier Spieler. Jede Änderung erscheint nach spätestens einer Sekunde im Stream.">
    <v-btn color="secondary" variant="flat" prepend-icon="mdi-rotate-3d-variant" @click="flipBoth">
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
            class="mb-3"
            @update:model-value="nr => update(i, { player: nr ?? null })"
          />

          <v-btn-toggle
            :model-value="view.side"
            mandatory
            density="compact"
            variant="outlined"
            divided
            :disabled="!view.player"
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
    <v-col cols="12" md="6">
      <v-text-field :model-value="overlayUrls.bracket()" label="Turnierbaum, aktualisiert sich selbst" readonly density="compact" hide-details
        append-inner-icon="mdi-content-copy" @click:append-inner="copy(overlayUrls.bracket())" />
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
import { ref } from 'vue'
import { errorMessage, hcApi } from '@/services/hcApi'
import PageHeader from '@/components/gliddencup/PageHeader.vue'
import PlayerCard from '@/components/gliddencup/public/PlayerCard.vue'
import { overlayUrls, playerByNumber, PLAYERS, useStreamOverlay } from '@/components/gliddencup/overlay/overlay'

// Mehrere Leute steuern gleichzeitig: Die Seite fragt wie die Overlays jede Sekunde ab.
const { views, apply } = useStreamOverlay()
const error = ref('')
const copied = ref(false)

const playerItems = PLAYERS
  .map(p => ({ title: `${p.nr} · ${p.player.user}`, value: p.nr, name: p.player.user }))
  .sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }))

/** Antwort des Servers sofort übernehmen, statt auf die nächste Abfrage zu warten. */
async function send (request) {
  try {
    apply((await request).data)
  } catch (e) {
    error.value = errorMessage(e)
  }
}

// Nur die geänderte View geht an den Server, damit niemand die andere mit einem alten Stand überschreibt.
const update = (i, patch) => send(hcApi.put(`/stream/${i + 1}`, { ...views.value[i], ...patch }))

const flipBoth = () => send(hcApi.post('/stream/flip'))

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
