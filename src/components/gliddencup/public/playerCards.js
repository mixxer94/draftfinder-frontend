/** Gemeinsame Helfer der Teilnehmerkarten (Desktop und Mobil) über players.json. */

// Feste Kartengröße in px; Raster und Overlays skalieren das Ganze.
export const CARD_W = 220
export const CARD_H = 350

export function statList (player) {
  const m = player?.median ?? {}
  return [
    { label: 'Micro', value: m.micro },
    // Ältere Einträge in players.json haben den Tippfehler „macri“.
    { label: 'Macro', value: m.macro ?? m.macri },
    { label: 'Strategy', value: m.strategy },
    { label: 'Speed', value: m.speed },
    { label: 'Exp', value: m.experience },
  ]
}

// Dunkelorange → Bernstein → Grün. Bernstein liegt früh (0.3), damit mittlere Werte ab etwa 6 schon grünlich wirken.
const STAT_SCALE = [[0, [0x6b, 0x30, 0x08]], [0.3, [0xd9, 0x8e, 0x04]], [1, [0x2e, 0xe8, 0x6b]]]

// Farbe an Position t (0–1) der Skala.
function scaleColor (t) {
  const i = t <= STAT_SCALE[1][0] ? 1 : 2
  const [t0, from] = STAT_SCALE[i - 1]
  const [t1, to] = STAT_SCALE[i]
  const u = (t - t0) / (t1 - t0)
  return `rgb(${from.map((c, k) => Math.round(c + (to[k] - c) * u)).join(' ')})`
}

/**
 * Die 10 Segmente eines Werts als { fill, color }: fill 0–1 (halbe Werte wie 6.5 füllen
 * das letzte Segment halb), color fest je Position, sodass die Skala von links nach rechts verläuft.
 */
export const statSegments = value => Array.from({ length: 10 }, (_, i) => ({
  fill: Math.min(Math.max((value || 0) - i, 0), 1),
  color: scaleColor((i + 0.5) / 10),
}))

// Erster Eintrag der Liste, die `spotlight` in players.json nennt (z. B. "quotes"), sonst der erste Hint.
export const spotlightText = player => player?.[player?.spotlight ?? 'hints']?.[0] ?? ''

const CIV_ICONS = {
  'Alle besten Civs': 'gleipdonir',
  Armenier: 'armenians',
  Berber: 'berbers',
  Chinese: 'chinese',
  Italians: 'italians',
  Japaner: 'japanese',
  Litauer: 'lithuanians',
  Malaien: 'malay',
  Portuguese: 'portuguese',
  Spanish: 'spanish',
  Teutons: 'teutons',
  Vietnamesen: 'vietnamese',
  Wu: 'wu',
}

const UNIT_ICONS = {
  '60 Arbs': 'arbalester',
  Conq: 'conquistador',
  Feuergaleere: 'fire-galley',
  Gineten: 'ginete',
  'Hellebardiere und Skirms': 'halberdier-skirmisher',
  Knights: 'knight',
  Samurai: 'samurai',
  Shotel: 'shotel-warrior',
  Skirmisher: 'skirmisher',
  Villager: 'villager',
}

const UNIT_BADGES = {
  '60 Arbs': '60x',
}

// Manche Einträge haben statt einer Zahl „keine“ oder „?“; deren Karten zeigen einen Fragezeichen-Wimpel.
export const hasPlayerColor = player => Number(player?.color) >= 1 && Number(player?.color) <= 8

// Ohne Farbe fallen die Einheiten-Icons auf Spielerfarbe 1 zurück.
const playerColor = player => (hasPlayerColor(player) ? Number(player.color) : 1)

const PLAYER_COLORS = ['#0000ff', '#ff0000', '#00a91b', '#d6d61b', '#7befef', '#8a13f7', '#666666', '#ff9205']

export const playerColorCss = player => PLAYER_COLORS[playerColor(player) - 1]

// Kürzere Anzeigetexte, damit die Ambition einzeilig auf die Karte passt.
const AMBITION_TEXTS = {
  'Ich gewinn das Ding oida!': 'Nichts unter Sieg!',
  Teilnehmerurkunde: 'Teilnehmer',
}

export function ambitionText (player) {
  const text = player?.ambition?.trim() || '???'
  return AMBITION_TEXTS[text] ?? text
}

// Über BASE_URL, weil die Twitch-Extension unter einem Unterpfad gehostet wird (vite.twitch.config.mjs).
const ASSETS = `${import.meta.env.BASE_URL}gliddencup`

const UNKNOWN_ICON = `${ASSETS}/icons/unknown.svg`

export function metaItems (player) {
  const item = (kind, raw, icons, file) => {
    const text = raw?.trim() || '???'
    const icon = icons[text]
    return { kind, text, src: icon ? file(icon) : (text === '???' ? UNKNOWN_ICON : null) }
  }
  return [
    item('civ', player?.civ, CIV_ICONS, icon => `${ASSETS}/civ/${icon}.webp`),
    {
      ...item('unit', player?.unit, UNIT_ICONS, icon => `${ASSETS}/units/${icon}-p${playerColor(player)}.webp`),
      badge: UNIT_BADGES[player?.unit?.trim()],
    },
  ]
}
