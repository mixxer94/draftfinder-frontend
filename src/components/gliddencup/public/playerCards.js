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

export const firstHint = player => player?.hints?.[0] ?? ''
