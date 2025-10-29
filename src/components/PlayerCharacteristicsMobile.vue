<script setup>
import { ref, computed, watch, defineOptions } from 'vue'
import playersData from '@/assets/players.json'

defineOptions({ name: 'PlayerCharacteristics_mobile' })

const props = defineProps({
  players: { type: Array, default: () => playersData },
  initialUser: { type: String, default: '' }
})

const allPlayers = ref(props.players && props.players.length ? props.players : playersData)
const selectedUser = ref(props.initialUser || (allPlayers.value[0]?.user || ''))
const showStatsFor = ref(true)

watch(() => props.players, (val) => {
  allPlayers.value = Array.isArray(val) && val.length ? val : playersData
  if (!allPlayers.value.find(p => p.user === selectedUser.value)) {
    selectedUser.value = allPlayers.value[0]?.user || ''
  }
}, { immediate: true })

const p = computed(() => allPlayers.value.find(x => x.user === selectedUser.value) || allPlayers.value[0] || null)

function firstHint(player) {
  return (player && player.hints && player.hints[0]) || ''
}

// Use the exact stat list & value sources from the original component:
function statList(player) {
  if (!player) return []
  const m = player.median || {}
  return [
    { label: 'Micro', value: m.micro },
    { label: 'Macro', value: m.macro ?? m.macri },
    { label: 'Strategy', value: m.strategy },
    { label: 'Speed', value: m.speed },
    { label: 'Exp', value: m.experience }
  ]
}
</script>

<template>
  <div class="pcm-root">
    <!-- Top control row -->
    <div class="selector">
      <label for="player-select" class="selector-label">Spieler</label>
      <select id="player-select" v-model="selectedUser" class="select">
        <option v-for="pl in allPlayers" :key="pl.user" :value="pl.user">{{ pl.user }}</option>
      </select>

    </div>
    
    <button class="toggle-btn" @click="showStatsFor = !showStatsFor">
        <i class="fa-solid fa-angles-down" :style="{ transform: showStatsFor ? 'rotate(0deg)' : 'rotate(180deg)' }"></i>
        <span>Hinweise {{showStatsFor ? 'anzeigen' : 'ausblenden' }}</span>
      </button>

    <!-- Single card (no dragging) -->
    <div v-if="p" class="card">
      <div class="minimize-btn" style="visibility:hidden"><i class="fa-solid fa-down-left-and-up-right-to-center"></i>
      </div>

      <div class="name">{{ p.user }}</div>
      <div class="elo">{{ `${p.elo} (${p.maxElo})` }}</div>

      <div class="stats-container" v-if="showStatsFor">
        <div class="hint">{{ firstHint(p) }}</div>

        <div class="meta">
          <span>{{ (p.map || '???') }}</span>
          <hr class="divider" />
          <span>{{ (p.civ || '???') }}</span>
          <hr class="divider" />
          <span>{{ (p.unit || '???') }}</span>
        </div>

        <div class="flex-placeholder"></div>

        <div class="stats">
          <div v-for="s in statList(p)" :key="s.label" class="stat">
            <span class="label">{{ s.label }}:</span>
            <div class="bar">
              <div class="bar-mask" :style="{ width: (100 - (s.value || 0) * 10) + '%' }"></div>
            </div>
            <div class="value">{{ s.value }}</div>
          </div>
        </div>
      </div>

      <div class="extra" v-else>
        <strong>Charakter:</strong>
        <ul class="item-list">
          <li v-for="(h, idx) in p.hints" :key="idx">{{ h }}</li>
        </ul>
        <strong>(not actually) Quotes:</strong>
        <ul class="item-list">
          <li v-for="(q, idx) in p.quotes" :key="idx">"{{ q }}"</li>
        </ul>
      </div>
    </div>

    <div v-else class="empty">No player found.</div>
  </div>
</template>

<style scoped>
.pcm-root {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  gap: 8px;
  color: #fff;
  font-family: 'Marcellus SC', serif;
}

/* Selector row */
.selector {
  display: flex;
  width: min(720px, 100%);
  align-items: center;
  gap: 8px;
}

.selector-label {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.9;
}

.select {
  flex: 1 1 auto;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgb(255, 255, 255);
  /* color: inherit; */
  color:#000;
  outline: none;
}

/* Reuse original toggle icon look */
.toggle-btn {
  position: static;
  background: rgb(117, 50, 50);
  border-radius:8px;
  padding:8px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  cursor: pointer;
  color: #fff;
  font-weight: bold;
  border: none;

  span {
    margin-left:5px;
  }
}

.toggle-btn:hover {
  background: rgb(167, 50, 50);
  box-shadow: 2px 2px 2px rgba(102, 27, 27, 0.4);
}

/* Single card - keep base look from original */
.card {
  position: relative;
  /* not absolute on mobile */
  width: 100%;
  height: auto;
  background-image: url('/gliddencup/card.webp');
  background-size: cover;
  background-position: center;
  aspect-ratio: 2/3;
  border-radius: 12px;
  box-shadow: 2px 4px 9px 0px rgb(127 72 15 / 20%);
  padding: 15px 45px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.name {
  margin: 20px auto 0 auto;
  height: 24px;
  line-height: 24px;
  width: 200px;
  text-align: center;
  /* color: #ccc; */

  font-size: 20px;
  /* background-image: url('/gliddencup/name_badge.webp'); */
  background-size: 100% 100%;
  font-weight: 700;
}

.elo {
  text-align: center;
  color: #ccc;
}

.flex-placeholder {
  flex-grow: 1;
}

.meta {
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  color: #ccc;
}


.meta .divider {
  width: 10%;
  align-self: center;
  text-align: center;
  margin-left: 45%;
}

.hint {
  font-size: 16px;
  color: #aaa;
  margin-top: 4px;
  text-align: center;
  font-style: italic;
}

.stats-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.stats {
  font-size: 16px;
  line-height: 1.4;
  min-height:150px;
}

.stat {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
}

.label {
  min-width: 70px;
  text-align: right;
  opacity: 0.9;
}

  .bar {
  flex-grow: 1;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, #620c03, #f1c40f, #00ff6c);
  overflow: hidden;
  margin: 0 2px;
  position: relative;
}

.bar-mask {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  background: #000;
  border: 1px solid black;
}

.value {
  width: 24px;
  text-align: right;
  font-weight: 700;
}

.extra {
  overflow-y: auto;
  padding:20px;
  max-height:475px;
  background-color: rgba(17, 17, 17, .63);
}

.extra strong {
  color: #fff;
  text-decoration: underline;
}

.item-list {
  padding-left: 15px;
}

/* mimic hidden minimize button space */
.minimize-btn {
  display: none;
}

/* Responsive tweaks */
@media (max-width: 480px) {
  .card {
    transform: scale(0.95);
    transform-origin: top center;
  }
}
</style>
