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
