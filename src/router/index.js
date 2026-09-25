/**
 * router/index.ts
 *
 * Automatic routes for `./src/pages/*.vue`
 */

// Composables
import { createRouter, createWebHistory } from 'vue-router/auto'
import { setupLayouts } from 'virtual:generated-layouts'
import { routes } from 'vue-router/auto-routes'
import { helperMayOpen, isAdmin, loadSession } from '@/services/hcApi'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: setupLayouts(routes),
})

/*
 * Hidden-Cup-Admin: /me einmal abfragen, bevor eine Seite darunter öffnet.
 * Ohne Login zeigt die Elternseite den Anmeldebildschirm; Helfer landen auf
 * einer Admin-Seite wieder auf der Übersicht. Die eigentliche Prüfung macht
 * die API — das hier erspart nur den Umweg über ein 403.
 */
router.beforeEach(async to => {
  if (!to.path.startsWith('/hidden-cup/admin')) return
  const user = await loadSession().catch(() => null)
  if (user && !isAdmin() && !helperMayOpen(to.path)) return '/hidden-cup/admin'
})

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (!localStorage.getItem('vuetify:dynamic-reload')) {
      console.log('Reloading page to fix dynamic import error')
      localStorage.setItem('vuetify:dynamic-reload', 'true')
      location.assign(to.fullPath)
    } else {
      console.error('Dynamic import error, reloading page did not fix it', err)
    }
  } else {
    console.error(err)
  }
})

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload')
})

export default router
