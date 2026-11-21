<template>
  <div class="ov-stage">
    <div :style="{ width: `${width}px`, height: `${height}px`, zoom: fit }">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTheme } from 'vuetify'

/**
 * Bühne für OBS-Browserquellen: transparenter Hintergrund, keine Scrollbalken,
 * Inhalt fester Größe (width × height in px) zentriert und so groß skaliert,
 * wie die Quelle es zulässt.
 *
 * `?mode=dark` bzw. `?mode=light` in der URL legt das Theme fest. Ohne den
 * Parameter folgt es dem Farbschema des Rechners, auf dem OBS läuft — das
 * Overlay sähe sonst bei jedem Streamer anders aus.
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

const theme = useTheme()
const previousTheme = theme.global.name.value
const mode = new URLSearchParams(window.location.search).get('mode')
if (mode === 'dark' || mode === 'light') theme.global.name.value = mode

function updateFit () {
  const w = window.innerWidth - 2 * props.padding
  const h = window.innerHeight - 2 * props.padding
  fit.value = Math.max(0.1, Math.min(w / props.width, h / props.height))
}

// Die Größe kann sich nach dem Laden ändern, etwa wenn die Turnierdaten eintreffen.
watch(() => [props.width, props.height], updateFit)

onMounted(() => {
  document.documentElement.classList.add('gc-overlay')
  updateFit()
  window.addEventListener('resize', updateFit)
})
onBeforeUnmount(() => {
  document.documentElement.classList.remove('gc-overlay')
  window.removeEventListener('resize', updateFit)
  theme.global.name.value = previousTheme
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
