<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import playersData from '@/assets/players.json'

// reaktive Daten
const players = ref(playersData)
const positions = reactive(JSON.parse(localStorage.getItem('cardPositions') || '{}'))
const showStats = reactive({})
const dragging = ref(null)
const zoomLevel = ref(1)
const zCounter = ref(0)
const gridMode = ref(false)
const allFlipped = ref(false)

function startDrag(p, e) {
  e.preventDefault()
  const card = e.currentTarget
  const container = card.offsetParent // pc-root
  const containerRect = container.getBoundingClientRect()
  const rect = card.getBoundingClientRect()

  dragging.value = {
    name: p.user,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
    containerTop: containerRect.top,
    containerLeft: containerRect.left
  }

  zCounter.value++
  positions[p.user] = positions[p.user] || {}
  positions[p.user].zIndex = zCounter.value
}

function onDrag(e) {
  if (!dragging.value) return
  const { name, offsetX, offsetY, containerTop, containerLeft } = dragging.value
  positions[name] = positions[name] || {}
  positions[name].top = e.clientY - containerTop - offsetY
  positions[name].left = e.clientX - containerLeft - offsetX

  // positions[name] = {
  //   top: e.clientY - containerTop - offsetY,
  //   left: e.clientX - containerLeft - offsetX
  // }
}

function endDrag() {
  dragging.value = null
}

function onHoverStart(p) {
  if (dragging.value) return
  zCounter.value++
  positions[p.user] = positions[p.user] || {}
  positions[p.user].hoverZ = zCounter.value
}

function onHoverEnd(p) {
  if (dragging.value) return
  if (positions[p.user]) delete positions[p.user].hoverZ
}



watch(positions, (val) => {
  if (!gridMode.value)
    localStorage.setItem('cardPositions', JSON.stringify(val))
}, { deep: true })


function statList(p) {
  const m = p.median || {}
  return [
    { label: 'Micro', value: m.micro },
    { label: 'Macro', value: m.macro ?? m.macri },
    { label: 'Strategy', value: m.strategy },
    { label: 'Speed', value: m.speed },
    { label: 'Exp', value: m.experience }
  ]
}

function firstHint(p) {
  return (p.hints && p.hints[0]) || ''
}

function isShowingStats(name) {
  return showStats[name] !== false
}

function toggle(name) {
  showStats[name] = !isShowingStats(name)
}

// -- Toolbar Button functions ----------------
function reset() {
  Object.keys(positions).forEach(k => delete positions[k])
  localStorage.removeItem('cardPositions')
}

function zoom() {
  zoomLevel.value *= 1.1
}

function resetZoom() {
  zoomLevel.value = 1;
}

function toggleGrid() {
  gridMode.value = !gridMode.value
}

function toggleAll() {
  allFlipped.value = !allFlipped.value
  // alle Karten in denselben Zustand bringen
  players.value.forEach(p => {
    showStats[p.user] = !allFlipped.value
  })
}

// ------------------------------------------
function cardStyle(p, i) {
  if (gridMode.value) {
    // 8x2 Rasterlayout
    const row = Math.floor(i / 8)
    const col = i % 8
    return {
      top: `${row * 420 + 25}px`,
      left: `${col * 240 - 5}px`,
      transform: `scale(${zoomLevel.value})`,
      zIndex: 1,
    }
  }

  // Standard: freie Positionierung
  const pos = positions[p.user] || { top: 40 + i * 30, left: 40 + (i % 5) * 260 }
  const z = dragging.value?.name === p.user
    ? zCounter.value + 1
    : pos.hoverZ || pos.zIndex || 10 + i
  return {
    top: pos.top + 'px',
    left: pos.left + 'px',
    transform: `scale(${zoomLevel.value})`,
    zIndex: z
  }
}
/*
function cardStyle(p, i) {
  const pos = positions[p.user] || { top: 40 + i * 30, left: 40 + (i % 5) * 260 }
  const z = pos.hoverZ || pos.zIndex || 10 + i
  return {
    top: pos.top + 'px',
    left: pos.left + 'px',
    transform: `scale(${zoomLevel.value})`,
    zIndex: z,
  }
}
*/

onMounted(() => {
  if (!document.getElementById('fa-6-6-0')) {
    const link = document.createElement('link')
    link.id = 'fa-6-6-0'
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css'
    document.head.appendChild(link)

    // load and apply saved z-indeces 
    const saved = Object.values(positions)
    const maxZ = saved.length ? Math.max(...saved.map(p => p.zIndex || 0)) : 0
    zCounter.value = maxZ
  }
})
</script>

<template>
  <div class="pc-root" @pointermove="onDrag" @pointerup="endDrag" @pointerleave="endDrag">
    <!-- Toolbar -->
    <div class="toolbar">
      <button class="toolbar-btn" @click="resetZoom">
        <i class="fa-solid fa-magnifying-glass-minus"></i>
      </button>
      <button class="toolbar-btn" @click="zoom">
        <i class="fa-solid fa-magnifying-glass-plus"></i>
      </button>
      <button class="toolbar-btn" :class="{ active: gridMode }" @click="toggleGrid">
        <i class="fa-solid fa-table-cells-large"></i>
      </button>
      <button class="toolbar-btn" @click="toggleAll">
        <i class="fa-solid" :class="allFlipped ? 'fa-angles-up' : 'fa-angles-down'"></i>
      </button>
      <button class="toolbar-btn" style="right: 15px" @click="reset">
        <i class="fa-solid fa-rotate-left"></i> Reset
      </button>
    </div>

    <!-- Cards -->
    <div v-for="(p, i) in players" :key="p.user" class="card" :style="cardStyle(p, i)"
      @pointerdown="startDrag(p, $event)" @mouseenter="onHoverStart(p)" @mouseleave="onHoverEnd(p)">
      <div class="toggle-btn" :class="{ rotated: !isShowingStats(p.user) }" @click.stop="toggle(p.user)">
        <i class="fa-solid fa-angles-down"></i>
      </div>

      <div class="name">{{ p.user }}</div>
      <!-- <div class="meta">{{ (p.civ || '???') + ' | ' + (p.map || '???') + ' | ' + (p.unit || '???') }}</div> -->
      <div class="stats-container" v-if="isShowingStats(p.user)">
        <div class="hint">{{ firstHint(p) }}</div>
        <div class="flex-placeholder"></div>

        <div class="meta">
          <span>{{ (p.civ || '???') }}</span>
          <hr class="divider" />
          <span>{{ (p.map || '???') }}</span>
          <hr class="divider" />
          <span>{{ (p.unit || '???') }}</span>
        </div>

        <!-- Stats -->
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

      <!-- Extra -->
      <div class="extra" v-else>
        <strong>Hints:</strong>
        <ul class="item-list">
          <li v-for="(h, idx) in p.hints" :key="idx">{{ h }}</li>
        </ul>
        <strong>(not actually) Quotes:</strong>
        <ul class="item-list">
          <li v-for="(q, idx) in p.quotes" :key="idx">"{{ q }}"</li>
        </ul>
      </div>
    </div>
  </div>
</template>



<style scoped>
.pc-root {
  background-color: #0f0f0f;
  height: calc(100vh - 98px);
  color: #fff;
  position: relative;
  overflow: hidden;
  font-family: 'Marcellus SC', serif;
  user-select: none;
}

.card {
  position: absolute;
  width: 240px;
  height: 390px;
  background-image: url('/gliddencup/card.png');
  background-size: cover;
  background-position: center;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6);
  cursor: grab;
  padding: 15px 20px;
  box-sizing: border-box;
  transition: transform 0.25s ease;
  display: flex;
  flex-direction: column;
}

.card:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.8);
}

.card.dragging {
  transform: scale(1.03);
  cursor: grabbing;
  transition: none;
}

.name {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-top: 10px;
  /* text-decoration: underline; */
}

.flex-placeholder {
  flex-grow:1;
}

.meta {
  font-size: 16px;
  font-weight: bold;
  margin-top: 6px;
  text-align: center;
  color: #ccc;

  .divider {
    width: 10%;
    align-self: center;
    text-align: center;
    margin-left: 45%;
  }
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
}

.stat {
  margin: 4px 0;

  display: flex;
  align-items: center;
}

.label {
  display: inline-block;
  width: 68px;
}

.value {
  font-weight: bold;
  font-weight: bold;
  border-radius: 4px;
  color: #fff;
  width: 26px;
  text-align: right;
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

.toggle-btn {
  position: absolute;
  top: 10px;
  right: 6px;
  cursor: pointer;
  background: rgb(117, 50, 50);
  border-radius: 20%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
  transition: background 0.2s;
}

.toggle-btn:hover {
  background: rgb(167, 50, 50);
  box-shadow: 2px 2px 2px rgba(102, 27, 27, 0.4);
}

.toolbar-btn.active {
  background: #10e110;
}

.toggle-btn i {
  transition: transform 0.3s ease;
}

.toggle-btn.rotated i {
  transform: rotate(180deg);
}

.extra {
  font-size: 16px;
  margin-top: 10px;
  margin-bottom: 20px;
  background-color:rgba(17, 17, 17, .63);
  color: #ccc;
  overflow-y: auto;
}

.extra strong {
  color: #fff;
  text-decoration: underline;
}

.item-list {
  padding-left: 15px;
}

.toolbar {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 999;
}

.toolbar-btn {
  background: #fff;
  color: #000;
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 4px 14px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  margin-left: 6px;
}

.toolbar-btn:hover {
  background: rgb(100, 100, 100);
  border-color: rgba(255, 255, 255, 0.5);
}
</style>
