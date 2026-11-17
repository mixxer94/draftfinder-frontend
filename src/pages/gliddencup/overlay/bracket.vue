<template>
  <OverlayStage :width="size.width" :height="size.height">
    <PublicBracket v-if="tournament" ref="bracket" :tournament="tournament" overlay />
  </OverlayStage>
</template>

<script setup>
import { computed, ref } from 'vue'
import OverlayStage from '@/components/gliddencup/overlay/OverlayStage.vue'
import PublicBracket from '@/components/gliddencup/public/PublicBracket.vue'
import { usePublicTournament } from '@/services/gliddencupApi'

/**
 * OBS-Browserquelle mit dem Turnierbaum des aktiven Turniers
 * (/gliddencup/overlay/bracket), alle 10 s neu abgefragt wie auf der
 * öffentlichen Seite. Vor der Auslosung und bei Fehlern bleibt die Quelle leer
 * bzw. auf dem letzten Stand.
 */
const { tournament } = usePublicTournament(undefined, { always: true })

const bracket = ref(null)
const size = computed(() => bracket.value?.size ?? { width: 1, height: 1 })
</script>
