import BasicSsl from '@vitejs/plugin-basic-ssl'
import Vue from '@vitejs/plugin-vue'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { defineConfig } from 'vite'
import { readdirSync, rmSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

/**
 * Twitch-Extension mit den Spielerkarten (Video-Overlay), getrennt von der Website gebaut:
 * `npm run dev:twitch` für den lokalen Test, `npm run dev:twitch:obs` für eine OBS-Browserquelle, `npm run build:twitch` für das ZIP, das in der
 * Twitch Developer Console hochgeladen wird.
 */
const path = p => fileURLToPath(new URL(p, import.meta.url))

// Aus public/ braucht die Extension nur die Kartengrafiken; Bracket, Civ-Embleme und Maps der Website blähen sonst das ZIP auf.
const KEEP = ['gliddencup/card.webp', 'gliddencup/civ', 'gliddencup/units', 'gliddencup/icons']

/**
 * Entfernt nach dem Build alles aus dist-twitch, was aus public/ kopiert wurde und nicht in KEEP steht.
 * public/ bleibt trotzdem publicDir, weil Vite nur dann `url('/gliddencup/card.webp')` in CSS auf `base` umschreibt.
 */
function prunePublic () {
  const prune = rel => {
    for (const name of readdirSync(path(`./public/${rel}`))) {
      const p = rel + name
      if (KEEP.includes(p)) continue
      if (KEEP.some(k => k.startsWith(`${p}/`))) prune(`${p}/`)
      else rmSync(path(`./dist-twitch/${p}`), { recursive: true, force: true })
    }
  }
  return { name: 'prune-public', apply: 'build', closeBundle: () => prune('') }
}

export default defineConfig(({ mode }) => ({
  root: path('./twitch'),
  // Twitch hostet die Dateien unter einem Unterpfad; absolute Pfade zeigen dort ins Leere.
  base: './',
  publicDir: path('./public'),
  plugins: [
    Vue({
      template: { transformAssetUrls },
    }),
    Vuetify({ autoImport: true }),
    prunePublic(),
    // Twitch lädt die Extension im Local Test nur über HTTPS; das Zertifikat ist selbstsigniert und muss im Browser einmal akzeptiert werden.
    // OBS-Browserquellen lehnen es dagegen ohne Rückfrage ab, deshalb läuft `npm run dev:twitch:obs` über HTTP.
    ...(mode === 'obs' ? [] : [BasicSsl()]),
  ],
  resolve: {
    alias: {
      '@': path('./src'),
    },
  },
  build: {
    outDir: path('./dist-twitch'),
    emptyOutDir: true,
    rollupOptions: {
      input: path('./twitch/video_overlay.html'),
    },
  },
  // Twitchs Standard für die Testing Base URI ist https://localhost:8080/. Ohne strictPort wiche Vite still auf einen anderen Port aus.
  server: {
    // Node löst localhost oft nur zu ::1 auf; OBS-Browserquellen fragen 127.0.0.1 an und bekämen dann keine Verbindung.
    host: '127.0.0.1',
    port: 8080,
    strictPort: true,
    open: '/video_overlay.html',
  },
}))
