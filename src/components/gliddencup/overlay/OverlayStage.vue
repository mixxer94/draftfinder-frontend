<template>
  <div class="ov-stage">
    <div :style="{ width: `${width}px`, height: `${height}px`, zoom: fit }">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Bühne für OBS-Browserquellen: transparenter Hintergrund, keine Scrollbalken,
 * Inhalt fester Größe (width × height in px) zentriert und so groß skaliert,
 * wie die Quelle es zulässt.
 *
 * `zoom` statt `transform: scale`: Chromium rendert Schrift dann in der
 * Endgröße neu, statt eine kleine Rastergrafik hochzuziehen — sonst wird die
 * Karte mit ihrer 3D-Drehung im Stream unscharf. Das Layout bleibt gleich,
 * weil alles im selben Verhältnis wächst.
 */
const props = defineProps({
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  // Rand ringsum in px der Quelle, damit Schatten nicht abgeschnitten werden.
  padding: { type: Number, default: 16 },
})

const fit = ref(1)

function updateFit () {
  const w = window.innerWidth - 2 * props.padding
  const h = window.innerHeight - 2 * props.padding
  fit.value = Math.max(0.1, Math.min(w / props.width, h / props.height))
}

onMounted(() => {
  document.documentElement.classList.add('gc-overlay')
  updateFit()
  window.addEventListener('resize', updateFit)
})
onBeforeUnmount(() => {
  document.documentElement.classList.remove('gc-overlay')
  window.removeEventListener('resize', updateFit)
})
</script>

<style>
/* Vuetify setzt Theme-Hintergrund und html { overflow-y: scroll }; beides wäre im Stream sichtbar. */
html.gc-overlay,
html.gc-overlay body,
html.gc-overlay .v-application {
  background: transparent !important;
  overflow: hidden !important;
}
</style>

<style scoped>
.ov-stage {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
