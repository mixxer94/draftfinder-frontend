/**
 * Auswertungen des Tippspiels. Reine Funktionen über
 *   pseudonyms: string[]                 alle Pseudonyme im Bracket
 *   truth:      Map<pseudonym, name>     aus `identities` der HC-Projektion
 *   users:      string[]                 Anzeigenamen der Tipper
 *   picksByUser: { [user]: [{ pseudonym, playerName }] }
 */

const clean = s => (s ?? '').trim()

function pickOf (picksByUser, user, pseudonym) {
  return clean((picksByUser[user] ?? []).find(p => p.pseudonym === pseudonym)?.playerName)
}

/** Rangliste der Tipper nach richtigen Tipps. */
export function userStats ({ pseudonyms, truth, users, picksByUser }) {
  const total = pseudonyms.length || 1
  return users.map(user => {
    const correct = pseudonyms.filter(ps => {
      const guess = pickOf(picksByUser, user, ps)
      return guess && guess === truth.get(ps)
    }).length
    return { user, correct, total: pseudonyms.length, pct: (correct / total) * 100 }
  }).sort((a, b) => (b.correct - a.correct) || a.user.localeCompare(b.user))
}

/**
 * Je Pseudonym: wie oft richtig getippt, welche Namen wie oft (absteigend)
 * und wie viele verschiedene Namen. Leere Tipps zählen nicht als Name.
 */
export function playerStats ({ pseudonyms, truth, users, picksByUser }) {
  const totalUsers = users.length || 1
  return pseudonyms.map(pseudonym => {
    const guesses = new Map()
    for (const user of users) {
      const guess = pickOf(picksByUser, user, pseudonym)
      if (guess) guesses.set(guess, (guesses.get(guess) ?? 0) + 1)
    }
    const name = truth.get(pseudonym) ?? ''
    const correct = guesses.get(name) ?? 0
    return {
      pseudonym,
      truth: name,
      correct,
      totalUsers,
      pct: (correct / totalUsers) * 100,
      diversity: guesses.size,
      guesses: [...guesses.entries()].sort((a, b) => b[1] - a[1]),
    }
  })
}

/** „Verwandlungskünstler“: am seltensten richtig getippt zuerst. */
export const chameleons = stats => [...stats].sort((a, b) =>
  (a.pct - b.pct) || a.pseudonym.localeCompare(b.pseudonym))

/** „Schlechte Schauspieler“: am häufigsten richtig getippt zuerst. */
export const obviousPlayers = stats => [...stats].sort((a, b) =>
  (b.pct - a.pct) || a.pseudonym.localeCompare(b.pseudonym))

/** „Kontrovers“: die meisten verschiedenen Namen zuerst, dann die meisten Tipps. */
export const controversial = stats => [...stats].sort((a, b) => {
  if (b.diversity !== a.diversity) return b.diversity - a.diversity
  const sum = s => s.guesses.reduce((n, [, c]) => n + c, 0)
  return sum(b) - sum(a)
})

/** Die beiden häufigsten Tipps je Pseudonym, stärkster Konsens zuerst. */
export function consensus (stats) {
  return stats.map(s => {
    const [top1Name = '', top1Count = 0] = s.guesses[0] ?? []
    const [top2Name = '', top2Count = 0] = s.guesses[1] ?? []
    return {
      pseudonym: s.pseudonym,
      truth: s.truth,
      top1Name,
      top1Count,
      top1Pct: (top1Count / s.totalUsers) * 100,
      top2Name,
      top2Count,
      top2Pct: (top2Count / s.totalUsers) * 100,
      truthOnTop: !!top1Name && top1Name === s.truth,
      totalUsers: s.totalUsers,
    }
  }).sort((a, b) => (b.top1Pct - a.top1Pct) || a.pseudonym.localeCompare(b.pseudonym))
}

/** Falsche Tipps je Pseudonym, die meisten Fehltipps zuerst. */
export function perPseudonymConfusions (stats) {
  return stats.map(s => {
    const wrong = s.guesses
      .filter(([name]) => name !== s.truth)
      .map(([name, count]) => ({ name, count, pct: (count / s.totalUsers) * 100 }))
    return {
      pseudonym: s.pseudonym,
      truth: s.truth,
      totalWrong: wrong.reduce((n, w) => n + w.count, 0),
      wrong,
    }
  }).sort((a, b) => (b.totalWrong - a.totalWrong) || a.pseudonym.localeCompare(b.pseudonym))
}

/** Häufigste falsche Paare Pseudonym → getippter Name über alle Tipper. */
export function globalConfusions (stats) {
  return stats
    .flatMap(s => s.guesses
      .filter(([name]) => name !== s.truth)
      .map(([guess, count]) => ({ pseudonym: s.pseudonym, truth: s.truth, guess, count, pct: (count / s.totalUsers) * 100 })))
    .sort((a, b) => (b.count - a.count) || a.pseudonym.localeCompare(b.pseudonym))
}

/** Wie viele Tipper wie viele Treffer haben, von 0 bis alle. */
export function distribution (uStats, total) {
  const buckets = new Array(total + 1).fill(0)
  for (const s of uStats) buckets[s.correct]++
  return buckets.map((users, correct) => ({ correct, users }))
}

export function average (uStats) {
  return uStats.length ? uStats.reduce((n, s) => n + s.correct, 0) / uStats.length : 0
}

/** Namen, die in den eigenen Tipps mehrfach vorkommen, mit den betroffenen Pseudonymen. */
export function duplicateNames (picks) {
  const seen = new Map()
  for (const [pseudonym, raw] of Object.entries(picks)) {
    const name = clean(raw)
    if (!name) continue
    const key = name.toLowerCase()
    if (!seen.has(key)) seen.set(key, { name, pseudonyms: [] })
    seen.get(key).pseudonyms.push(pseudonym)
  }
  return [...seen.values()].filter(e => e.pseudonyms.length > 1)
}

/**
 * Bester Treffer für eine angefangene Eingabe: exakt, dann Präfix, dann
 * Teilstring, jeweils der kürzeste Name. Erspart auf dem Handy das Antippen
 * des Vorschlags.
 */
export function bestMatch (query, options) {
  const q = clean(query).toLowerCase()
  if (!q) return null
  const shortest = list => list.sort((a, b) => a.length - b.length)[0]
  return options.find(n => n.toLowerCase() === q) ??
    shortest(options.filter(n => n.toLowerCase().startsWith(q))) ??
    shortest(options.filter(n => n.toLowerCase().includes(q))) ??
    null
}
