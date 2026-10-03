/** Gemeinsame Helfer der Teilnehmerkarten (Desktop und Mobil) über players.json. */

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

const playerColor = player => (Number(player?.color) >= 1 && Number(player?.color) <= 8 ? Number(player.color) : 1)

const PLAYER_COLORS = ['#0000ff', '#ff0000', '#00a91b', '#d6d61b', '#7befef', '#8a13f7', '#666666', '#ff9205']

export const playerColorCss = player => PLAYER_COLORS[playerColor(player) - 1]

const UNKNOWN_ICON = '/gliddencup/icons/unknown.svg'

const AMBITION_ICONS = {
  Teilnehmerurkunde: 'teilnehmerurkunde',
  'Ich gewinn das Ding oida!': 'pokal',
}

export function metaItems (player) {
  const item = (kind, raw, icons, file) => {
    const text = raw?.trim() || '???'
    const icon = icons[text]
    return { kind, text, src: icon ? file(icon) : (text === '???' ? UNKNOWN_ICON : null) }
  }
  return [
    item('ambition', player?.ambition, AMBITION_ICONS, icon => `/gliddencup/icons/${icon}.svg`),
    item('civ', player?.civ, CIV_ICONS, icon => `/gliddencup/civ/${icon}.webp`),
    {
      ...item('unit', player?.unit, UNIT_ICONS, icon => `/gliddencup/units/${icon}-p${playerColor(player)}.webp`),
      badge: UNIT_BADGES[player?.unit?.trim()],
    },
  ]
}
