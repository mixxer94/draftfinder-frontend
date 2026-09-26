<template>
  <v-app-bar :elevation="2" density="compact" color="app-bar" class="hc-appbar">
    <v-app-bar-nav-icon v-if="hcSession.user && mobile" @click="drawer = !drawer" />
    <v-app-bar-title>Hidden Cup · Turnierleitung</v-app-bar-title>
    <v-spacer />
    <template v-if="hcSession.user">
      <span class="text-body-2 mr-2 d-none d-sm-inline">
        {{ hcSession.user.username }}
        <v-chip size="small" class="ml-1" variant="tonal">
          {{ admin ? 'Admin' : 'Helfer' }}
        </v-chip>
      </span>
      <v-btn variant="text" @click="doLogout">
        <v-icon start>mdi-logout</v-icon>Abmelden
      </v-btn>
    </template>
    <v-btn icon @click="toggleTheme"><v-icon>mdi-theme-light-dark</v-icon></v-btn>
  </v-app-bar>

  <v-navigation-drawer v-if="hcSession.user" v-model="drawer" :permanent="!mobile">
    <v-list density="compact" nav>
      <v-list-item
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
        exact
      >
        <template v-if="item.doneAfterDraw && drawn" #append>
          <!-- Vuetify blendet Icons im Append auf 60 % ab; voll deckend erst erreicht der Haken 3:1. -->
          <v-icon color="success" size="small" aria-label="erledigt" style="opacity: 1">mdi-check-circle</v-icon>
        </template>
        <template v-else-if="item.showReady && hcSession.readyCount" #append>
          <v-chip size="small" color="warning" variant="flat" :aria-label="`${hcSession.readyCount} Matches warten auf Freigabe`">
            {{ hcSession.readyCount }}
          </v-chip>
        </template>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>

  <v-container fluid class="hc-admin pa-4 pa-md-6">
    <div v-if="!hcSession.loaded" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate />
    </div>

    <v-card v-else-if="!hcSession.user" max-width="480" class="mx-auto mt-8" variant="tonal">
      <v-card-title>Anmeldung</v-card-title>
      <v-card-text>
        <v-alert v-if="loginError" type="error" variant="tonal" class="mb-4">{{ loginError }}</v-alert>
        Nur für Turnierleitung und Helfer. Die Anmeldung läuft über Discord.
      </v-card-text>
      <v-card-actions>
        <v-btn color="secondary" variant="flat" @click="login">
          <v-icon start>mdi-discord</v-icon>Mit Discord anmelden
        </v-btn>
      </v-card-actions>
    </v-card>

    <template v-else>
      <router-view />
    </template>
  </v-container>

  <ConfirmDialog />
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { HC_NAV, hcApi, hcSession, isAdmin, login, logout } from '@/services/hcApi'
import ConfirmDialog from '@/components/gliddencup/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const theme = useTheme()
const { mobile } = useDisplay()
const drawer = ref(!mobile.value)

const admin = computed(() => isAdmin())
const nav = computed(() => HC_NAV.filter(n => admin.value || n.helper))
const drawn = computed(() => !!hcSession.tournamentState && hcSession.tournamentState !== 'SETUP')

/*
 * Haken und Zähler der Navigation: nach dem Login und bei jedem Seitenwechsel,
 * weil Ergebnisse über den Bot jederzeit neue Matches freigabebereit machen.
 */
watch([() => hcSession.user, () => route.path], ([user]) => {
  if (!user) return
  hcApi.get('/dashboard')
    .then(res => {
      hcSession.tournamentState = res.data.tournament?.state ?? null
      hcSession.readyCount = res.data.counts?.ready ?? 0
    })
    .catch(() => {})
}, { immediate: true })

const loginError = computed(() => ({
  denied: 'Kein Zugriff. Dir fehlt die Rolle Turnierleitung oder Helfer.',
  failed: 'Die Anmeldung ist fehlgeschlagen. Bitte noch einmal versuchen.',
})[route.query.login] ?? '')

function toggleTheme () {
  theme.global.name.value = theme.global.name.value === 'dark' ? 'light' : 'dark'
}

async function doLogout () {
  await logout()
  router.replace('/gliddencup/admin')
}

/*
 * Nicht in Suchmaschinen. Die Seite ist nirgends verlinkt, aber ein
 * geteilter Link reicht für einen Crawler.
 */
let robots = null
onMounted(() => {
  robots = document.createElement('meta')
  robots.name = 'robots'
  robots.content = 'noindex, nofollow'
  document.head.appendChild(robots)
  document.title = 'Hidden Cup · Turnierleitung'
})
onUnmounted(() => {
  robots?.remove()
  document.title = 'Draft Finder'
})
</script>

<style>
/* Ziffern in Tabellen und Zeitangaben gleich breit, damit Spalten nicht springen. */
.hc-admin .v-table td { font-variant-numeric: tabular-nums; }
/* Satzschreibung statt Versalien auf Buttons; Dialoge hängen außerhalb von .hc-admin. */
.hc-admin .v-btn, .hc-appbar .v-btn, .hc-dialog .v-btn { text-transform: none; letter-spacing: normal; }
.hc-admin .hc-h2 { font-size: 1.125rem; font-weight: 600; line-height: 1.4; margin-bottom: 0.5rem; }
</style>
