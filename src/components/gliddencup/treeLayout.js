// Position in der Runde steckt im Code (WB-R2-M3); GF und GF-RESET haben keine.
const indexOf = code => Number(code.match(/-M(\d+)$/)?.[1] ?? 1)

/**
 * Positionen für einen Turnierbaum aus `rounds` ([{ slots: [{ code, … }] }],
 * aufsteigend nach Runde). Karten werden absolut positioniert, Verbindungen
 * als SVG-Pfade gezeichnet. Ein Match steht mittig zwischen den Matches der
 * Vorrunde, die in es münden. Welche das sind, folgt aus dem
 * Größenverhältnis der Runden: gleich groß heißt 1:1 (Loser Bracket), halb so
 * groß heißt 2:1. So braucht es kein `feedsWinnerTo` aus der API.
 *
 * Liefert `cards` ({ slot, x, y }, y = Oberkante), `links` ({ from, to, d })
 * und die Gesamtgröße.
 */
export function layoutTree (rounds, { cardW, cardH, top, colGap = 48, rowGap = 16 }) {
  const colW = cardW + colGap
  const rowH = cardH + rowGap
  const cards = []
  const links = []
  let prev = []

  rounds.forEach((round, c) => {
    const slots = [...round.slots].sort((x, y) => indexOf(x.code) - indexOf(y.code))
    const x = c * colW
    const current = slots.map((slot, i) => {
      const ratio = slots.length / (prev.length || 1)
      const feeders = prev.filter((_, p) => Math.ceil((p + 1) * ratio) === i + 1)
      const y = feeders.length
        ? feeders.reduce((sum, f) => sum + f.y, 0) / feeders.length
        : top + i * rowH
      const card = { slot, x, y }
      for (const f of feeders) {
        const xm = f.x + cardW + colGap / 2
        links.push({ from: f, to: card, d: `M${f.x + cardW} ${f.y + cardH / 2}H${xm}V${y + cardH / 2}H${x}` })
      }
      return card
    })
    cards.push(...current)
    prev = current
  })

  return {
    colW,
    cards,
    links,
    width: Math.max(0, rounds.length * colW - colGap),
    height: Math.max(top, ...cards.map(card => card.y + cardH)),
  }
}
