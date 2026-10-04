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

    <div v-if="p" class="pcm-card" :style="{ '--player-color': playerColorCss(p) }">
      <div class="pennant" />
      <div class="plate">
        <div class="name">{{ p.user }}</div>
        <div class="elo">{{ p.elo }} ({{ p.maxElo }})</div>
      </div>

      <div v-if="showStats" class="stats-container">
        <div class="hint">{{ spotlightText(p) }}</div>
        <hr class="divider">
        <div class="facts">
          <span class="fact-label">Ambition</span><span>{{ ambitionText(p) }}</span>
          <span class="fact-label">Angstgegner</span><span>{{ p.angstgegner || '???' }}</span>
        </div>

        <div class="meta">
          <template v-for="m in metaItems(p)" :key="m.kind">
            <v-tooltip v-if="m.src" :text="m.text" location="bottom" content-class="pc-tooltip" open-on-click>
              <template #activator="{ props }">
                <span v-if="m.badge" v-bind="props" class="badged">
                  <img :src="m.src" :alt="m.text">
                  <span class="badge">{{ m.badge }}</span>
                </span>
                <img v-else v-bind="props" :src="m.src" :alt="m.text">
              </template>
            </v-tooltip>
            <span v-else>{{ m.text }}</span>
          </template>
        </div>

        <div class="stats">
          <div v-for="s in statList(p)" :key="s.label" class="stat">
            <span class="label">{{ s.label }}</span>
            <div class="segs">
              <i v-for="(seg, i) in statSegments(s.value)" :key="i" :style="seg.fill ? { backgroundImage: `linear-gradient(90deg, ${seg.color} ${seg.fill * 100}%, transparent 0)` } : null" />
            </div>
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
import { ambitionText, spotlightText, metaItems, playerColorCss, statList, statSegments } from '@/components/gliddencup/public/playerCards'

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

<style src="@/components/gliddencup/public/playerCards.css"></style>

<style scoped>
.pcm-root { max-width: 480px; margin: 0 auto; }

/*
 * Die Karte ist Spielgrafik mit dunklem Hintergrundbild; Schrift darauf
 * bleibt deshalb in beiden Themes hell.
 */
.pcm-card {
  position: relative;
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

.pennant { position: absolute; top: 0; left: 18px; z-index: 1; width: 36px; height: 62px; background: linear-gradient(90deg, color-mix(in srgb, var(--player-color) 75%, black), var(--player-color) 45%, color-mix(in srgb, var(--player-color) 80%, black)); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%); }
.plate { --plate: rgb(0 0 0 / 45%); position: relative; margin: 14px -24px 0; padding: 4px 0 6px; background: linear-gradient(90deg, transparent, var(--plate) 18%, var(--plate) 82%, transparent); text-shadow: 0 1px 2px #000; }
.plate::before, .plate::after { content: ''; position: absolute; left: 10%; right: 10%; height: 1px; background: linear-gradient(90deg, transparent, rgb(255 255 255 / 45%), transparent); }
.plate::before { top: 0; }
.plate::after { bottom: 0; }
.name, .elo { position: relative; z-index: 2; }
.name { font-size: 20px; font-weight: 700; text-align: center; overflow-wrap: anywhere; }
.elo { text-align: center; color: #ccc; }

.stats-container { flex-grow: 1; display: flex; flex-direction: column; }
.hint { flex-grow: 1; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #aaa; margin: 8px 0 4px; text-align: center; font-style: italic; }
.meta { display: grid; grid-template-columns: repeat(2, auto); justify-content: center; align-items: center; justify-items: center; gap: 8px 32px; margin-bottom: 10px; font-size: 16px; font-weight: 700; text-align: center; color: #ddd; overflow-wrap: anywhere; }
.meta img { width: auto; max-width: 130px; height: 51px; object-fit: contain; }
.badged { position: relative; display: inline-block; line-height: 0; }
.badged img { width: auto; }
.badge { position: absolute; left: -5px; bottom: -5px; padding: 2px; border-radius: 50px; background-color: #00a91b; font-size: 18px; line-height: 1; font-weight: 700; color: #fff; text-shadow: 0 0 2px #000, 1px 1px 1px #000; }
.divider { flex-shrink: 0; width: 10%; margin: 6px 45%; border-color: rgb(255 255 255 / 40%); }
.facts { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: baseline; column-gap: 10px; row-gap: 4px; margin-bottom: 10px; font-size: 18px; color: #ddd; font-weight: 700; white-space: nowrap; }
.facts > span { overflow: hidden; text-overflow: ellipsis; }
.fact-label { font-size: 15px; color: #aaa; }

.stats { font-size: 16px; line-height: 1.4; }
.stat { display: grid; grid-template-columns: 70px 1fr 24px; align-items: center; gap: 8px; }
.value { text-align: right; color: #ddd; }
.segs { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 3px; }
.segs i { height: 9px; border-radius: 1px; background-color: rgb(255 255 255 / 10%); }

.extra { flex-grow: 1; min-height: 0; margin: 12px 0; padding: 12px; overflow-y: auto; color: #ddd; background: rgb(17 17 17 / 63%); border-radius: 6px; }
.extra strong { color: #fff; }
.item-list { padding-left: 15px; margin-bottom: 8px; }
</style>
