/**
 * Gemeinsames für die OBS-Overlays unter /gliddencup/overlay und ihre
 * Steuerung unter /gliddencup/admin/stream.
 *
 * Spieler werden über ihre Nummer angesprochen: die Position in players.json,
 * beginnend bei 1. So bleiben die URLs für Streamer kurz und stabil.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import playersData from '@/assets/players.json'
import { hcApi } from '@/services/hcApi'

export const PLAYERS = playersData.map((player, i) => ({ nr: i + 1, player }))

export const playerByNumber = nr => playersData[Number(nr) - 1] ?? null

/** Alles außer „back“ ist die Vorderseite, damit Tippfehler in der URL nichts verstecken. */
export const parseSide = raw => (raw === 'back' ? 'back' : 'front')

const base = () => `${window.location.origin}/gliddencup/overlay`

export const overlayUrls = {
  live: view => `${base()}/live/${view}`,
  player: (nr, side = 'front') => `${base()}/player/${nr}${side === 'back' ? '?side=back' : ''}`,
  all: (side = 'front') => `${base()}/all${side === 'back' ? '?side=back' : ''}`,
}

const EMPTY_VIEWS = [{ player: null, side: 'front' }, { player: null, side: 'front' }]

/**
 * Zustand der beiden Live-Views, jede Sekunde neu abgefragt. Ohne
 * Sichtbarkeitsprüfung wie in usePolling: OBS meldet Browserquellen nicht
 * zuverlässig als sichtbar. Ein Fehler lässt den letzten Stand stehen.
 */
export function useStreamOverlay (ms = 1000) {
  const views = ref(EMPTY_VIEWS)
  let rev = -1
  let timer = null

  async function load () {
    try {
      const { data } = await hcApi.get('/stream')
      if (data.rev === rev) return
      rev = data.rev
      views.value = data.views
    } catch {}
  }

  onMounted(() => {
    load()
    timer = setInterval(load, ms)
  })
  onBeforeUnmount(() => clearInterval(timer))

  return views
}
