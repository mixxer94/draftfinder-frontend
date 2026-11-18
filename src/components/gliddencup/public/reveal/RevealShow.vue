<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="root"
      class="rv-backdrop rs-root"
      role="dialog"
      aria-modal="true"
      aria-label="Auflösung"
      @click="next"
    >
      <div class="rs-fit" :style="{ zoom: fit }">
        <RevealStage :tournament="tournament" :overview="overview" :item="step.item" :page="step.page ?? 0" :solved="step.solved" />
      </div>

      <div class="rs-bar" @click.stop>
        <button type="button" class="rs-btn" :disabled="index === 0" @click="prev">Zurück</button>
        <span class="rs-count">{{ index + 1 }} / {{ steps.length }}</span>
        <button v-if="index < steps.length - 1" ref="nextButton" type="button" class="rs-btn rs-btn--main" @click="next">
          {{ steps[index + 1].solved ? 'Auflösen' : 'Weiter' }}
        </button>
        <span v-else class="rs-count">Ende</span>
        <button type="button" class="rs-btn" @click="close">Schließen</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import RevealStage from './RevealStage.vue'
import { summarize } from './reveal'

/**
 * Auflösung im Vollbild zum Durchklicken: je Frage erst die Tipps, dann die
 * Lösung, danach „Wer ist Guy Glidden?“, „Wer wurde erkannt?“ (seitenweise),
 * die Spieler-Vermutungen und zuletzt die Rangliste (seitenweise). Klick,
 * Leertaste oder → geht weiter, ← zurück, Esc schließt.
 * `start` ist die Folie (wie `item` in RevealStage), bei der es losgeht.
 */
const props = defineProps({
  tournament: { type: Object, required: true },
  // Wie aus loadTipsOverview
  overview: { type: Object, required: true },
  start: { type: String, default: null },
})
const open = defineModel('open', { type: Boolean, default: false })

// Ohne Lösung gibt es nichts aufzudecken; dann bleibt es bei der Folie mit den Tipps.
const summary = computed(() => summarize(props.tournament, props.overview))
const steps = computed(() => [
  ...props.tournament.questions.flatMap(q => [
    { item: q.id, solved: false },
    ...(q.solution != null ? [{ item: q.id, solved: true }] : []),
  ]),
  { item: 'mystery', solved: false },
  ...(props.tournament.mysteryAnswers.length ? [{ item: 'mystery', solved: true }] : []),
  ...summary.value.recognizedPages.map((_, page) => ({ item: 'recognized', page, solved: false })),
  { item: 'players', solved: false },
  ...summary.value.rankingPages.map((_, page) => ({ item: 'ranking', page, solved: false })),
])
const index = ref(0)
const step = computed(() => steps.value[index.value] ?? steps.value[0])

const root = ref(null)
const nextButton = ref(null)
const fit = ref(1)
const updateFit = () => { fit.value = Math.min(window.innerWidth / 1920, window.innerHeight / 1080) }

const next = () => { if (index.value < steps.value.length - 1) index.value++ }
const prev = () => { if (index.value > 0) index.value-- }
const close = () => { open.value = false }

function onKey (e) {
  // Leertaste und Enter auf einem Knopf löst der Knopf selbst aus, sonst ginge es zwei Schritte weiter.
  if ((e.key === ' ' || e.key === 'Enter') && e.target instanceof HTMLButtonElement) return
  if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) {
    e.preventDefault()
    next()
  } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
    e.preventDefault()
    prev()
  } else if (e.key === 'Escape') {
    close()
  }
}

// Esc im Vollbild beendet zuerst das Vollbild, ohne dass ein keydown ankommt; dann schließt auch die Auflösung.
function onFullscreenChange () {
  if (!document.fullscreenElement) close()
}

watch(open, async isOpen => {
  if (isOpen) {
    const first = steps.value.findIndex(s => s.item === props.start)
    index.value = Math.max(0, first)
    updateFit()
    window.addEventListener('resize', updateFit)
    window.addEventListener('keydown', onKey)
    document.documentElement.style.overflow = 'hidden'
    await nextTick()
    nextButton.value?.focus()
    // Ohne Vollbild-API (etwa iPhone) bleibt es bei der Ebene über der Seite.
    try {
      await root.value?.requestFullscreen?.()
      document.addEventListener('fullscreenchange', onFullscreenChange)
    } catch {}
  } else {
    cleanup()
  }
})

function cleanup () {
  window.removeEventListener('resize', updateFit)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.documentElement.style.overflow = ''
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
}

onBeforeUnmount(cleanup)
</script>

<style scoped>
.rs-root {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
}

.rs-fit { flex: none; }

.rs-bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 16px;
  cursor: default;
  font: 500 14px Roboto, sans-serif;
}

.rs-count { color: #a39d91; font-variant-numeric: tabular-nums; }

.rs-btn {
  padding: 6px 14px;
  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: 4px;
  background: transparent;
  color: #ece6da;
  font: inherit;
  cursor: pointer;
}

.rs-btn:hover:not(:disabled) { background: rgb(255 255 255 / 8%); }
.rs-btn:disabled { opacity: 0.4; cursor: default; }
.rs-btn:focus-visible { outline: 2px solid #d08a45; outline-offset: 2px; }

.rs-btn--main { border-color: #d08a45; color: #d08a45; }
</style>
