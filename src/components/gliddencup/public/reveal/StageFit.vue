<template>
  <div ref="box" class="rv-backdrop sf-box" :style="{ height: `${1080 * scale}px` }">
    <div class="sf-inner" :style="{ transform: `scale(${scale})` }"><slot /></div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Bettet eine Folie von 1920 × 1080 (RevealStage) in die Seite ein, auf die verfügbare Breite verkleinert. */
const box = ref(null)
const scale = ref(0.5)

let observer = null
onMounted(() => {
  observer = new ResizeObserver(() => { scale.value = box.value.clientWidth / 1920 })
  observer.observe(box.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.sf-box { overflow: hidden; }
.sf-inner { width: 1920px; transform-origin: top left; }
</style>
