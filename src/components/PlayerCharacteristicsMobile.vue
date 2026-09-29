<template>
  <div class="pcm-root">
    <div class="d-flex align-center ga-1 mb-3">
      <v-btn icon="mdi-chevron-left" variant="text" aria-label="Vorheriger Spieler" @click="step(-1)" />
      <v-select
        v-model="selectedUser"
        :items="players"
        item-title="user"
        item-value="user"
        label="Spieler"
        density="comfortable"
        hide-details
      />
      <v-btn icon="mdi-chevron-right" variant="text" aria-label="Nächster Spieler" @click="step(1)" />
    </div>

    <div class="d-flex justify-center mb-3">
      <v-btn variant="tonal" prepend-icon="mdi-rotate-3d-variant" @click="showStats = !showStats">
        {{ showStats ? 'Zitate zeigen' : 'Werte zeigen' }}
      </v-btn>
    </div>

    <div v-if="p" class="pcm-card">
      <div class="name">{{ p.user }}</div>
      <div class="elo">{{ p.elo }} ({{ p.maxElo }})</div>

      <div v-if="showStats" class="stats-container">
        <div class="hint">{{ firstHint(p) }}</div>

        <div class="meta">
          <span>{{ p.map || '???' }}</span>
          <hr class="divider">
          <span>{{ p.civ || '???' }}</span>
          <hr class="divider">
          <span>{{ p.unit || '???' }}</span>
        </div>

        <div class="flex-grow-1" />

        <div class="stats">
          <div v-for="s in statList(p)" :key="s.label" class="stat">
            <span class="label">{{ s.label }}</span>
            <div class="bar"><div class="bar-mask" :style="{ width: `${100 - (s.value || 0) * 10}%` }" /></div>
            <div class="value">{{ s.value }}</div>
          </div>
        </div>
      </div>

      <div v-else class="extra">
        <strong>Charakter</strong>
        <ul class="item-list">
          <li v-for="(hint, idx) in p.hints" :key="idx">{{ hint }}</li>
        </ul>
        <strong>Zitate (nicht wirklich)</strong>
        <ul class="item-list">
          <li v-for="(q, idx) in p.quotes" :key="idx">„{{ q }}“</li>
        </ul>
      </div>
    </div>

    <p v-else class="text-medium-emphasis">Noch keine Teilnehmer eingetragen.</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import playersData from '@/assets/players.json'
import { firstHint, statList } from '@/components/gliddencup/public/playerCards'

/** Teilnehmerkarten für Touch und kleine Bildschirme: eine Karte, Auswahl oben. */
const players = playersData
const selectedUser = ref(players[0]?.user ?? null)
const showStats = ref(true)

const p = computed(() => players.find(x => x.user === selectedUser.value) ?? null)

function step (dir) {
  const i = players.findIndex(x => x.user === selectedUser.value)
  selectedUser.value = players[(i + dir + players.length) % players.length]?.user ?? null
}
</script>

<style scoped>
.pcm-root { max-width: 480px; margin: 0 auto; }

/*
 * Die Karte ist Spielgrafik mit dunklem Hintergrundbild; Schrift darauf
 * bleibt deshalb in beiden Themes hell.
 */
.pcm-card {
  display: flex;
  flex-direction: column;
  aspect-ratio: 2 / 3;
  /* Hält das Seitenverhältnis auch bei langen Zitaten; die scrollen innen. */
  overflow: hidden;
  padding: 15px clamp(24px, 10%, 45px);
  box-sizing: border-box;
  color: #fff;
  font-family: 'Marcellus SC', serif;
  background-image: url('/gliddencup/card.webp');
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 25%);
}

.name { margin-top: 20px; font-size: 20px; font-weight: 700; text-align: center; overflow-wrap: anywhere; }
.elo { text-align: center; color: #ccc; }

.stats-container { flex-grow: 1; display: flex; flex-direction: column; }
.hint { font-size: 16px; color: #bbb; margin-top: 4px; text-align: center; font-style: italic; }
.meta { font-size: 16px; font-weight: 700; text-align: center; color: #ddd; }
.meta .divider { width: 10%; margin: 2px 45%; border-color: rgb(255 255 255 / 40%); }

.stats { font-size: 16px; line-height: 1.4; }
.stat { display: grid; grid-template-columns: 70px 1fr 24px; align-items: center; gap: 8px; }
.value { text-align: right; font-weight: 700; }
/* Farbverlauf ist die Skala der Werte 1–10; die Maske deckt den Rest ab. */
.bar { position: relative; height: 8px; border-radius: 4px; overflow: hidden; background: linear-gradient(90deg, #620c03, #f1c40f, #00ff6c); }
.bar-mask { position: absolute; top: 0; right: 0; height: 100%; background: #000; }

.extra { flex-grow: 1; min-height: 0; margin: 12px 0; padding: 12px; overflow-y: auto; color: #ddd; background: rgb(17 17 17 / 63%); border-radius: 6px; }
.extra strong { color: #fff; }
.item-list { padding-left: 15px; margin-bottom: 8px; }
</style>
