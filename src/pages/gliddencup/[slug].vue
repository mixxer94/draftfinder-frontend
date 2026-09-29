<template>
  <PublicShell :title="tournament?.tournamentName ?? 'Gliddencup'">
    <v-alert v-if="!tournament && notFound" type="info" variant="tonal">
      Dieses Turnier gibt es nicht oder es ist noch nicht ausgelost.
    </v-alert>
    <v-alert v-else-if="!tournament && error" type="warning" variant="tonal">
      {{ error }} Die Seite versucht es alle paar Sekunden erneut.
    </v-alert>
    <div v-else-if="!tournament" class="d-flex justify-center pa-8"><v-progress-circular indeterminate /></div>

    <template v-else>
      <PageHeader :title="tournament.tournamentName" text="Alle Teilnehmer treten unter Pseudonym an.">
        <template v-if="error" #meta>
          <v-chip size="small" variant="tonal" color="warning" prepend-icon="mdi-wifi-off">Nicht aktuell</v-chip>
        </template>
        <v-btn variant="text" to="/gliddencup" append-icon="mdi-arrow-right">Zum Tippspiel</v-btn>
      </PageHeader>
      <PublicBracket :tournament="tournament" />
    </template>
  </PublicShell>
</template>

<script setup>
import { useRoute } from 'vue-router'
import PageHeader from '@/components/gliddencup/PageHeader.vue'
import PublicShell from '@/components/gliddencup/public/PublicShell.vue'
import PublicBracket from '@/components/gliddencup/public/PublicBracket.vue'
import { usePublicTournament } from '@/services/gliddencupApi'

const route = useRoute()
const { tournament, error, notFound } = usePublicTournament(route.params.slug)
</script>
