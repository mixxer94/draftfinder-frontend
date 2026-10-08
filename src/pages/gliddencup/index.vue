<template>
  <PublicShell :title="tournament?.tournamentName ?? 'Gliddencup'">
    
    <!-- Auf dem Handy ohne Icons, damit mehr Tabs ohne Scrollen passen. -->
    <v-tabs v-model="tab" color="secondary" show-arrows class="gc-tabs mb-6">
      <v-tab value="tippen" :prepend-icon="smAndUp ? 'mdi-pencil-outline' : undefined">Tippen</v-tab>
      <v-tab value="teilnehmer" :prepend-icon="smAndUp ? 'mdi-cards-outline' : undefined">Teilnehmer</v-tab>
      <v-tab value="turnierbaum" :prepend-icon="smAndUp ? 'mdi-tournament' : undefined">Turnierbaum</v-tab>
      <v-tab value="turnierbaum-s1" :prepend-icon="smAndUp ? 'mdi-history' : undefined">Turnierbaum (S1)</v-tab>
      <v-tab v-if="resolved" value="tipps" :prepend-icon="smAndUp ? 'mdi-format-list-checks' : undefined">Tipps</v-tab>
      <v-tab v-if="resolved" value="auswertungen" :prepend-icon="smAndUp ? 'mdi-chart-bar' : undefined">Auswertungen</v-tab>
    </v-tabs>

    <!-- Kein Wischen: Kartenziehen und der breite Turnierbaum brauchen die Geste selbst. -->
    <v-window v-model="tab" :touch="false">
      <v-window-item value="tippen">
        <TipForm :tournament="tournament" :not-found="notFound" :hc-error="error" />
      </v-window-item>

      <v-window-item value="teilnehmer">
        <PlayerCharacteristicsMobile v-if="useMobileVersion" />
        <PlayerCharacteristics v-else />
      </v-window-item>

      <v-window-item value="turnierbaum">
        <PublicBracket v-if="tournament" :tournament="tournament" />
        <v-alert v-else-if="notFound" type="info" variant="tonal">Der Turnierbaum erscheint nach der Auslosung.</v-alert>
        <v-alert v-else-if="error" type="warning" variant="tonal">{{ error }} Die Seite versucht es alle paar Sekunden erneut.</v-alert>
        <div v-else class="d-flex justify-center pa-8"><v-progress-circular indeterminate /></div>
      </v-window-item>

      <v-window-item value="turnierbaum-s1">
        <PublicBracket :tournament="seasonOne" />
      </v-window-item>

      <template v-if="resolved">
        <v-window-item v-for="t in ['tipps', 'auswertungen']" :key="t" :value="t">
          <v-alert v-if="overviewError" type="warning" variant="tonal" class="mb-4">{{ overviewError }}</v-alert>
          <div v-else-if="!overview" class="d-flex justify-center pa-8"><v-progress-circular indeterminate /></div>
          <template v-else>
            <component
              :is="t === 'tipps' ? TipsOverview : TipStats"
              :tournament="tournament"
              :users="overview.users"
              :picks-by-user="overview.picksByUser"
              :mystery-by-user="overview.mysteryByUser"
            />
          </template>
        </v-window-item>
      </template>
    </v-window>
  </PublicShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import PageHeader from '@/components/gliddencup/PageHeader.vue'
import PublicShell from '@/components/gliddencup/public/PublicShell.vue'
import PublicBracket from '@/components/gliddencup/public/PublicBracket.vue'
import TipForm from '@/components/gliddencup/public/TipForm.vue'
import TipsOverview from '@/components/gliddencup/public/TipsOverview.vue'
import TipStats from '@/components/gliddencup/public/TipStats.vue'
import PlayerCharacteristics from '@/components/PlayerCharacteristics.vue'
import PlayerCharacteristicsMobile from '@/components/PlayerCharacteristicsMobile.vue'
import { gcApi, usePublicTournament } from '@/services/gliddencupApi'
// Abgeschlossene Saison 1, aus dem damaligen matches.json ins Format der HC-Projektion übertragen.
import seasonOne from '@/assets/gliddencup-s1.json'

const { tournament, error, notFound } = usePublicTournament()

// Das 8×2-Kartenraster braucht Maus und Platz; Touch-Geräte bekommen die Einzelkarte.
const { mobile, smAndUp } = useDisplay()
const useMobileVersion = mobile.value || 'ontouchstart' in window || navigator.maxTouchPoints > 0

const tab = ref('tippen')
const resolved = computed(() => !!tournament.value?.identitiesPublic)

const phase = computed(() => {
  const t = tournament.value
  if (!t) return null
  if (t.identitiesPublic) return { text: 'Zuordnung veröffentlicht', color: 'secondary' }
  if (t.tipsOpen) return { text: 'Tippen offen', color: 'success' }
  return { text: 'Tippen geschlossen', color: undefined }
})

// Tipps aller Tipper gibt das Tippspiel erst nach der Veröffentlichung heraus.
const overview = ref(null)
const overviewError = ref('')

async function loadOverview () {
  try {
    const data = (await gcApi.get('/overview')).data
    if (!data?.tipsVisible) return
    const users = (data.users ?? []).map(u => u.displayName).sort((a, b) => a.localeCompare(b))
    const mystery = data.mysteryByUser ?? {}
    overview.value = {
      users,
      picksByUser: data.picksByUser ?? {},
      // Für jeden Tipper ein eigener Eintrag: Sonst liefert ein Tipper namens „__proto__“ ohne Antwort den Objekt-Prototyp.
      mysteryByUser: Object.fromEntries(users.map(u => [u, Object.hasOwn(mystery, u) ? mystery[u] : ''])),
    }
    overviewError.value = ''
  } catch {
    overviewError.value = 'Die Tipps sind gerade nicht erreichbar. Versuch es in ein paar Minuten noch einmal.'
  }
}

watch(resolved, r => {
  if (r) loadOverview()
  else if (tab.value === 'tipps' || tab.value === 'auswertungen') tab.value = 'tippen'
}, { immediate: true })

// Beim Öffnen frisch laden, damit auch späte Tipps erscheinen.
watch(tab, t => { if (resolved.value && (t === 'tipps' || t === 'auswertungen')) loadOverview() })

// Das Tippspiel liest HC mit eigenem Cache und schaltet bis zu 10 s später
// frei; bis dahin mit jeder HC-Abfrage erneut versuchen.
watch(tournament, () => { if (resolved.value && !overview.value) loadOverview() })
</script>

<style scoped>
.gc-tabs { border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
</style>
