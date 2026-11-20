<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="root"
      :class="['rs-root', 'rv-theme', `v-theme--${theme.global.name.value}`, { 'rs-idle': idle }]"
      role="dialog"
      aria-modal="true"
      aria-label="Auflösung"
      @mousemove="wake"
    >
      <div class="rs-fit" :style="{ zoom: fit }">
        <RevealStage
          :tournament="tournament"
          :overview="overview"
          :item="deck.current.value.item"
          :page="deck.current.value.page"
          :solved="deck.isSolved(deck.current.value)"
        />
      </div>

      <div class="rs-bar">
        <button type="button" class="rs-btn" :disabled="deck.index.value === 0" @click="deck.prev">Zurück</button>
        <span class="rs-count">{{ deck.position.value }}</span>
        <button ref="nextButton" type="button" class="rs-btn rs-btn--main" :disabled="deck.atEnd.value && !deck.needsSolve.value" @click="deck.advance">
          {{ deck.nextLabel.value }}
        </button>
        <button type="button" class="rs-btn" @click="close">Schließen</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useTheme } from 'vuetify'
import RevealStage from './RevealStage.vue'

/**
 * Auflösung im Vollbild für den Stream. Zeigt dieselbe Folienfolge wie der
 * Auswertungen-Reiter (`deck` aus useRevealDeck) und macht an derselben Stelle
 * weiter. → , Leertaste oder Enter: Lösung zeigen bzw. weiter; ← zurück; Esc schließt.
 * Ohne Mausbewegung verschwinden nach kurzer Zeit Zeiger und Knopfleiste.
 */
const props = defineProps({
  tournament: { type: Object, required: true },
  // Wie aus loadTipsOverview
  overview: { type: Object, required: true },
  deck: { type: Object, required: true },
})

const theme = useTheme()
const open = defineModel('open', { type: Boolean, default: false })

const root = ref(null)
const nextButton = ref(null)

// Die Knopfleiste liegt unter der Folie, nicht darüber; die Folie bekommt den Rest der Höhe.
const BAR = 64
const fit = ref(1)
const updateFit = () => { fit.value = Math.min(window.innerWidth / 1920, (window.innerHeight - BAR) / 1080) }

const IDLE_MS = 2500
const idle = ref(false)
let idleTimer = 0
function wake () {
  idle.value = false
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => { idle.value = true }, IDLE_MS)
}

const close = () => { open.value = false }

function onKey (e) {
  // Leertaste und Enter auf einem Knopf löst der Knopf selbst aus, sonst ginge es zwei Schritte weiter.
  if ((e.key === ' ' || e.key === 'Enter') && e.target instanceof HTMLButtonElement) return
  if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) {
    e.preventDefault()
    props.deck.advance()
  } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
    e.preventDefault()
    props.deck.prev()
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
    updateFit()
    wake()
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
  clearTimeout(idleTimer)
  window.removeEventListener('resize', updateFit)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.documentElement.style.overflow = ''
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
}

onBeforeUnmount(cleanup)
</script>

<style scoped>
/* Teleport hängt am body, außerhalb von v-app; die Klasse v-theme--* bringt die Theme-Variablen mit. */
.rs-root {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-background));
  user-select: none;
}

.rs-idle { cursor: none; }

.rs-fit { flex: none; }

.rs-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 64px;
  padding: 0 16px;
  font: 500 14px Roboto, sans-serif;
  transition: opacity 300ms ease-out;
}

.rs-idle .rs-bar { opacity: 0; }

.rs-count { color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity)); font-variant-numeric: tabular-nums; }

.rs-btn {
  padding: 6px 14px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.25);
  border-radius: 4px;
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  font: inherit;
  cursor: pointer;
}

.rs-btn:hover:not(:disabled) { background: rgba(var(--v-theme-on-surface), 0.08); }
.rs-btn:disabled { opacity: 0.4; cursor: default; }
.rs-btn:focus-visible { outline: 2px solid rgb(var(--v-theme-secondary)); outline-offset: 2px; }

.rs-btn--main { border-color: rgb(var(--v-theme-secondary)); color: rgb(var(--v-theme-secondary)); }
</style>
