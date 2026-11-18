<template>
  <div>
    <div ref="scroller" class="sp-scroller" tabindex="0" :aria-label="label" @scroll="onScroll">
      <div v-for="s in slides" :key="s.key" class="sp-slide">
        <slot :slide="s" />
      </div>
    </div>
    <div v-if="slides.length > 1" class="d-flex align-center justify-end ga-1 mt-1">
      <v-btn icon="mdi-chevron-up" size="small" variant="text" :disabled="current === 0" aria-label="Vorherige Folie" @click="go(current - 1)" />
      <span class="text-body-2 text-medium-emphasis sp-count">{{ current + 1 }} / {{ slides.length }}</span>
      <v-btn icon="mdi-chevron-down" size="small" variant="text" :disabled="current === slides.length - 1" aria-label="Nächste Folie" @click="go(current + 1)" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

/**
 * Folien zum Blättern: Gescrollt wird nur im Rahmen, der genau eine Folie
 * hoch ist, und es rastet je Folie ein. Der Slot bekommt die Folie als `slide`;
 * jede braucht einen eindeutigen `key`.
 */
defineProps({
  slides: { type: Array, required: true },
  label: { type: String, default: '' },
})

const scroller = ref(null)
const current = ref(0)

const onScroll = () => { current.value = Math.round(scroller.value.scrollTop / scroller.value.clientHeight) }
const go = i => scroller.value.scrollTo({ top: i * scroller.value.clientHeight, behavior: 'smooth' })
</script>

<style scoped>
.sp-scroller {
  aspect-ratio: 16 / 9;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
}

.sp-scroller::-webkit-scrollbar { display: none; }
.sp-scroller:focus-visible { outline: 2px solid rgb(var(--v-theme-secondary)); outline-offset: 2px; }

/* snap-stop: Ein kräftiger Wisch blättert trotzdem nur eine Folie weiter. */
.sp-slide { height: 100%; scroll-snap-align: start; scroll-snap-stop: always; }
.sp-count { min-width: 4.5em; text-align: center; font-variant-numeric: tabular-nums; }
</style>
