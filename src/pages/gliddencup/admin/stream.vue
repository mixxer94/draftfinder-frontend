<template>
  <PageHeader title="Stream-Overlays">
    <template #meta>
      <v-tooltip location="bottom" max-width="320">
        <template #activator="{ props }">
          <v-icon v-bind="props" icon="mdi-information-outline" size="small" class="text-medium-emphasis" tabindex="0" aria-label="Erklärung" />
        </template>
        Zwei OBS-Browserquellen zum Vergleichen zweier Spieler. Jede Änderung erscheint nach spätestens einer Sekunde im Stream.
      </v-tooltip>
    </template>
    <v-btn color="secondary" variant="flat" prepend-icon="mdi-rotate-3d-variant" @click="flipBoth">
      Beide umdrehen
    </v-btn>
    <v-btn variant="tonal" prepend-icon="mdi-eraser" :disabled="views.every(v => !v.player)" @click="clear(0); clear(1)">
      Beide leeren
    </v-btn>
  </PageHeader>

  <v-alert v-if="error" type="error" variant="tonal" closable class="mb-4" @click:close="error = ''">{{ error }}</v-alert>

  <v-row>
    <v-col v-for="(view, i) in views" :key="i" cols="12" lg="6">
      <v-card variant="tonal" class="pa-3">
        <div class="d-flex align-center ga-2 mb-2">
          <span class="text-subtitle-1 font-weight-bold">View {{ i + 1 }}</span>
          <v-chip v-if="view.player" size="small" color="error" variant="flat" prepend-icon="mdi-circle-medium">Live</v-chip>
          <span v-else class="text-medium-emphasis text-body-2">leer</span>
          <v-spacer />
          <v-btn-toggle
            :model-value="view.side"
            mandatory
            density="compact"
            variant="outlined"
            color="secondary"
            divided
            :disabled="!view.player"
            @update:model-value="side => update(i, { side })"
          >
            <v-btn value="front">Vorne</v-btn>
            <v-btn value="back">Hinten</v-btn>
          </v-btn-toggle>
          <v-btn icon="mdi-close" size="small" variant="text" :disabled="!view.player" :aria-label="`View ${i + 1} leeren`" @click="clear(i)" />
        </div>

        <div class="hc-view">
          <div class="hc-preview">
            <PlayerCard v-if="playerByNumber(view.player)" :player="playerByNumber(view.player)" :side="view.side" />
            <span v-else class="text-medium-emphasis text-body-2">Karte auswählen</span>
          </div>

          <div class="hc-names" :style="{ gridTemplateRows: `repeat(${Math.ceil(playerItems.length / 2)}, auto)` }" role="group" :aria-label="`Spieler für View ${i + 1}`">
            <v-btn
              v-for="p in playerItems"
              :key="p.nr"
              :variant="view.player === p.nr ? 'flat' : 'tonal'"
              :color="view.player === p.nr ? 'secondary' : undefined"
              :aria-pressed="view.player === p.nr"
              class="hc-name"
              :title="p.user"
              @click="update(i, { player: p.nr })"
            >
              <span class="hc-dot" :style="{ background: p.color }" />
              <span class="hc-name-text">{{ p.user }}</span>
            </v-btn>
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>

  <h2 class="hc-h2 mt-8">OBS-Quellen für die Live-Views</h2>
  <p class="text-medium-emphasis mb-4 hc-lead">
    Einmal in OBS als Browserquelle einrichten, z. B. 440 × 700. Sie zeigen, was oben eingestellt ist.
  </p>

  <v-row dense>
    <v-col v-for="n in [1, 2]" :key="n" cols="12" md="6">
      <v-text-field :model-value="overlayUrls.live(n)" :label="`View ${n}`" readonly density="compact" hide-details
        append-inner-icon="mdi-content-copy" @click:append-inner="copy(overlayUrls.live(n))" />
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
import { hasPlayerColor, playerColorCss } from '@/components/gliddencup/public/playerCards'

// Mehrere Leute steuern gleichzeitig: Die Seite fragt wie die Overlays jede Sekunde ab.
const { views, apply } = useStreamOverlay()
const error = ref('')
const copied = ref(false)

// Ohne eigene Spielerfarbe ein neutraler Punkt, damit „keine“ oder „?“ nicht wie Blau aussehen.
const playerItems = PLAYERS
  .map(p => ({ nr: p.nr, user: p.player.user, color: hasPlayerColor(p.player) ? playerColorCss(p.player) : 'transparent' }))
  .sort((a, b) => a.user.localeCompare(b.user, 'de', { sensitivity: 'base' }))

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

// Leer heißt: keine Karte, und die nächste beginnt wieder mit der Vorderseite.
const clear = i => update(i, { player: null, side: 'front' })

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
/* Karte links, Namen rechts; wird es zu eng, rutschen die Namen unter die Karte. */
.hc-view {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
}

/*
 * Karte auf 80 %, damit beide Views auch auf kleinen Monitoren ohne Scrollen
 * passen. `zoom` statt `transform: scale` wie in OverlayStage: Die Schrift
 * bleibt scharf, und das Layout bekommt die verkleinerte Größe mit.
 */
.hc-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 176px;
  height: 280px;
  text-align: center;
}

.hc-preview > :deep(:not(span)) {
  zoom: 0.8;
}

.hc-preview > span {
  padding: 16px;
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

/* Zwei Spalten ergeben bei 16 Namen ungefähr die Höhe der Karte; das Alphabet läuft spaltenweise. */
.hc-names {
  flex: 1 1 240px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-flow: column;
  gap: 4px 6px;
}

.hc-name {
  justify-content: flex-start;
  height: 31px !important;
  padding-inline: 10px;
}

.hc-name :deep(.v-btn__content) {
  min-width: 0;
  gap: 8px;
}

.hc-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hc-dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(var(--v-theme-on-surface), 0.35);
}

.hc-lead { max-width: 70ch; }
</style>
