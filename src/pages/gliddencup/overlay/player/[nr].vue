<template>
  <OverlayStage :width="CARD_W" :height="CARD_H">
    <PlayerCard v-if="player" :player="player" :side="parseSide(route.query.side)" />
  </OverlayStage>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import OverlayStage from '@/components/gliddencup/overlay/OverlayStage.vue'
import PlayerCard from '@/components/gliddencup/public/PlayerCard.vue'
import { CARD_H, CARD_W } from '@/components/gliddencup/public/playerCards'
import { parseSide, playerByNumber } from '@/components/gliddencup/overlay/overlay'

/**
 * OBS-Browserquelle mit einer festen Karte für Streamer:
 * /gliddencup/overlay/player/7, Rückseite mit ?side=back.
 */
const route = useRoute()
const player = computed(() => playerByNumber(route.params.nr))
</script>
