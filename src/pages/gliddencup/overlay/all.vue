<template>
  <OverlayStage :width="cols * CARD_W + (cols - 1) * GAP" :height="rows * CARD_H + (rows - 1) * GAP">
    <div class="ov-grid" :style="{ gridTemplateColumns: `repeat(${cols}, ${CARD_W}px)`, gap: `${GAP}px` }">
      <PlayerCard v-for="p in PLAYERS" :key="p.nr" :player="p.player" :side="parseSide(route.query.side)" />
    </div>
  </OverlayStage>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import OverlayStage from '@/components/gliddencup/overlay/OverlayStage.vue'
import PlayerCard from '@/components/gliddencup/public/PlayerCard.vue'
import { CARD_H, CARD_W } from '@/components/gliddencup/public/playerCards'
import { parseSide, PLAYERS } from '@/components/gliddencup/overlay/overlay'

/**
 * OBS-Browserquelle mit allen Karten in Spielerreihenfolge:
 * /gliddencup/overlay/all, Rückseite mit ?side=back, andere Spaltenzahl mit
 * ?cols=4 (Standard 8, also 8 × 2).
 */
const GAP = 8

const route = useRoute()
const cols = computed(() => Math.min(PLAYERS.length, Math.max(1, Number.parseInt(route.query.cols) || 8)))
const rows = computed(() => Math.ceil(PLAYERS.length / cols.value))
</script>

<style scoped>
.ov-grid {
  display: grid;
}
</style>
