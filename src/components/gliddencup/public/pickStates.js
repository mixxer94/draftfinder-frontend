/**
 * Färbung der Pseudonym-Tipps, gemeinsam für Tippen und Tipps. Vor der
 * Auflösung: getippt (Petrol) oder doppelt eingetragen (Orange). Danach nur
 * noch richtig (hit) oder falsch (miss); doppelte Namen spielen dann keine Rolle mehr.
 * Die Klassen `gc-pick--<state>` und `gc-swatch` stehen in pickStates.css.
 */
export function pickStateOf (pick, solution, duplicate) {
  if (!pick) return null
  if (solution) return pick === solution ? 'hit' : 'miss'
  return duplicate ? 'warning' : 'secondary'
}

export const pickLegend = resolved => resolved
  ? [{ state: 'hit', text: 'richtig' }, { state: 'miss', text: 'falsch' }]
  : [{ state: 'secondary', text: 'getippt' }, { state: 'warning', text: 'doppelt eingetragen' }]
