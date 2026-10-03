<template>
  <OverlayStage :width="CARD_W" :height="CARD_H">
    <Transition name="ov-swap" mode="out-in">
      <PlayerCard v-if="player" :key="current.player" :player="player" :side="current.side" />
    </Transition>
  </OverlayStage>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import OverlayStage from '@/components/gliddencup/overlay/OverlayStage.vue'
import PlayerCard from '@/components/gliddencup/public/PlayerCard.vue'
import { CARD_H, CARD_W } from '@/components/gliddencup/public/playerCards'
import { playerByNumber, useStreamOverlay } from '@/components/gliddencup/overlay/overlay'

/**
 * OBS-Browserquelle für eine der beiden Live-Views (/gliddencup/overlay/live/1
 * und /live/2). Spieler und Kartenseite setzt die Turnierleitung unter
 * /gliddencup/admin/stream; ohne Spieler bleibt die Quelle leer.
 */
const route = useRoute()
const views = useStreamOverlay()

const current = computed(() => views.value[Number(route.params.view) === 2 ? 1 : 0] ?? {})
const player = computed(() => playerByNumber(current.value.player))
</script>

<style scoped>
.ov-swap-enter-active,
.ov-swap-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.ov-swap-enter-from,
.ov-swap-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
