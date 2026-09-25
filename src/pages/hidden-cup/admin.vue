<template>
  <v-app-bar :elevation="2" density="compact" color="app-bar">
    <v-app-bar-nav-icon v-if="hcSession.user && mobile" @click="drawer = !drawer" />
    <v-app-bar-title>Hidden Cup · Turnierleitung</v-app-bar-title>
    <v-spacer />
    <template v-if="hcSession.user">
      <span class="text-body-2 mr-2 d-none d-sm-inline">
        {{ hcSession.user.username }}
        <v-chip size="x-small" class="ml-1" variant="flat" :color="admin ? 'secondary' : 'grey'">
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
      />
    </v-list>
  </v-navigation-drawer>

  <v-container fluid class="pa-4">
    <div v-if="!hcSession.loaded" class="d-flex justify-center pa-8">
      <v-progress-circular indeterminate />
    </div>

    <v-card v-else-if="!hcSession.user" max-width="480" class="mx-auto mt-8" variant="tonal">
      <v-card-title>Anmeldung</v-card-title>
      <v-card-text>
        <v-alert v-if="loginError" type="error" variant="tonal" class="mb-4">{{ loginError }}</v-alert>
        Nur für die Turnierleitung des Hidden Cup. Die Anmeldung läuft über Discord;
        berechtigt sind die Rollen Turnierleitung und Helfer auf dem Turnierserver.
      </v-card-text>
      <v-card-actions>
        <v-btn color="secondary" variant="flat" @click="login">
          <v-icon start>mdi-discord</v-icon>Mit Discord anmelden
        </v-btn>
      </v-card-actions>
    </v-card>

    <template v-else>
      <v-alert v-if="hcSession.user.storageWarning" type="warning" variant="tonal" density="compact" class="mb-4">
        {{ hcSession.user.storageWarning }}
      </v-alert>
      <router-view />
    </template>
  </v-container>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay, useTheme } from 'vuetify'
import { HC_NAV, hcSession, isAdmin, login, logout } from '@/services/hcApi'

const route = useRoute()
const router = useRouter()
const theme = useTheme()
const { mobile } = useDisplay()
const drawer = ref(!mobile.value)

const admin = computed(() => isAdmin())
const nav = computed(() => HC_NAV.filter(n => admin.value || n.helper))

const loginError = computed(() => ({
  denied: 'Kein Zugriff — dir fehlt die Rolle Turnierleitung oder Helfer auf dem Turnierserver.',
  failed: 'Die Anmeldung ist fehlgeschlagen. Bitte noch einmal versuchen.',
})[route.query.login] ?? '')

function toggleTheme () {
  theme.global.name.value = theme.global.name.value === 'dark' ? 'light' : 'dark'
}

async function doLogout () {
  await logout()
  router.replace('/hidden-cup/admin')
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
