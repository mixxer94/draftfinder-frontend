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

/**
 * Rangliste der Tipper nach richtigen Tipps. `solo` zählt die Treffer, die
 * sonst niemand hatte.
 */
export function userStats ({ pseudonyms, truth, users, picksByUser }) {
  const total = pseudonyms.length || 1
  const hitsOf = user => pseudonyms.filter(ps => {
    const guess = pickOf(picksByUser, user, ps)
    return guess && guess === truth.get(ps)
  })
  const hits = new Map(users.map(user => [user, hitsOf(user)]))
  const hitCount = new Map()
  for (const list of hits.values()) for (const ps of list) hitCount.set(ps, (hitCount.get(ps) ?? 0) + 1)
  return users.map(user => {
    const correct = hits.get(user).length
    const solo = hits.get(user).filter(ps => hitCount.get(ps) === 1).length
    return { user, correct, solo, total: pseudonyms.length, pct: (correct / total) * 100 }
  }).sort((a, b) => (b.correct - a.correct) || a.user.localeCompare(b.user))
}

/**
 * Treffer des Mehrheitstipps: Pseudonyme, bei denen der richtige Name allein
 * die meisten Tipps hat. Bei Gleichstand zählt es nicht, die Mehrheit war
 * sich dann nicht einig.
 */
export function crowdCorrect (stats) {
  return stats.filter(s => {
    const [top, second] = s.guesses
    return top && top[0] === s.truth && (!second || second[1] < top[1])
  }).length
}

/**
 * Je Pseudonym: wie oft richtig getippt und welche Namen wie oft (absteigend).
 * Leere Tipps zählen nicht als Name.
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
      guesses: [...guesses.entries()].sort((a, b) => b[1] - a[1]),
    }
  })
}

/** „Verwandlungskünstler“: am seltensten richtig getippt zuerst. */
export const chameleons = stats => [...stats].sort((a, b) =>
  (a.pct - b.pct) || a.pseudonym.localeCompare(b.pseudonym))

/** Häufigste falsche Paare Pseudonym → getippter Name über alle Tipper. */
export function globalConfusions (stats) {
  return stats
    .flatMap(s => s.guesses
      .filter(([name]) => name !== s.truth)
      .map(([guess, count]) => ({ pseudonym: s.pseudonym, truth: s.truth, guess, count, pct: (count / s.totalUsers) * 100 })))
    .sort((a, b) => (b.count - a.count) || a.pseudonym.localeCompare(b.pseudonym))
}

/**
 * Vermutungen der Spieler über ihre Gegner aus den aufgedeckten Matches.
 * `ranking`: wer wie oft vermutet wurde und wie oft das stimmte.
 * `spectatorPct`: Trefferquote der Zuschauer bei denselben Pseudonymen, zum
 * Vergleich mit `pct` der Spieler.
 */
export function playerGuesses ({ rounds, truth, stats }) {
  const spectatorPctOf = new Map(stats.map(s => [s.pseudonym, s.pct]))
  const guesses = rounds
    .flatMap(r => r.matches)
    .flatMap(m => [{ guess: m.guessA, target: m.b }, { guess: m.guessB, target: m.a }])
    .filter(g => g.guess && g.target)
    .map(g => ({ ...g, correct: g.guess === truth.get(g.target) }))

  const byName = new Map()
  for (const g of guesses) {
    const entry = byName.get(g.guess) ?? { name: g.guess, count: 0, correct: 0 }
    entry.count++
    if (g.correct) entry.correct++
    byName.set(g.guess, entry)
  }
  const n = guesses.length || 1
  return {
    total: guesses.length,
    correct: guesses.filter(g => g.correct).length,
    pct: (guesses.filter(g => g.correct).length / n) * 100,
    spectatorPct: guesses.reduce((sum, g) => sum + (spectatorPctOf.get(g.target) ?? 0), 0) / n,
    ranking: [...byName.values()].sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name)),
  }
}

/**
 * Vergleichsform eines Namens: ohne Clan-Präfix („OIDA | Kloerb“ → „kloerb“),
 * Akzente, Groß/Klein, Leer- und Sonderzeichen.
 */
function nameKey (raw) {
  const folded = clean(raw).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  return folded.split('|').pop().replace(/[^\p{L}\p{N}]/gu, '')
}

/** Editierdistanz, ein Buchstabendreher zählt als ein Fehler. */
function editDistance (a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/**
 * Gleicher Name trotz Tippfehler oder Teilname („Viper“ in „TheViper“). Kurze
 * Namen müssen exakt passen, sonst kippt „Max“ zu „Mia“.
 */
function similar (a, b) {
  const len = Math.min(a.length, b.length)
  if (len >= 5 && (a.includes(b) || b.includes(a))) return true
  const tolerance = len < 4 ? 0 : len < 9 ? 1 : 2
  return editDistance(a, b) <= tolerance
}

/**
 * Gruppiert die Freitext-Antworten auf „Wer ist Guy Glidden?“. Gleiche
 * Antworten in anderer Schreibweise oder mit kleinem Tippfehler landen in
 * einer Gruppe; trifft eine Gruppe einen Teilnehmer, trägt sie seinen Namen.
 * Liefert [{ label, count, variants: [[Schreibweise, Anzahl]] }], größte zuerst.
 */
export function mysteryGroups (answers, participants = []) {
  const groups = []
  const byKey = new Map()
  for (const raw of answers) {
    const text = clean(raw)
    const key = nameKey(text)
    if (!key) continue
    if (!byKey.has(key)) {
      const group = { key, count: 0, variants: new Map() }
      byKey.set(key, group)
      groups.push(group)
    }
    const group = byKey.get(key)
    group.count++
    group.variants.set(text, (group.variants.get(text) ?? 0) + 1)
  }

  // Größte Gruppen zuerst, damit ein Tippfehler zur verbreiteten Schreibweise wandert und nicht umgekehrt.
  groups.sort((a, b) => b.count - a.count)
  const merged = []
  for (const group of groups) {
    const target = merged.find(m => similar(m.key, group.key))
    if (!target) { merged.push(group); continue }
    target.count += group.count
    for (const [text, count] of group.variants) target.variants.set(text, (target.variants.get(text) ?? 0) + count)
  }

  const known = participants.map(name => ({ name, key: nameKey(name) })).filter(p => p.key)
  return merged.map(group => {
    // Bei Gleichstand gewinnt eine Schreibweise mit Großbuchstaben, sie ist meist die gemeinte.
    const lowerOnly = text => text === text.toLowerCase()
    const variants = [...group.variants.entries()]
      .sort((a, b) => (b[1] - a[1]) || (lowerOnly(a[0]) - lowerOnly(b[0])) || a[0].localeCompare(b[0]))
    const participant = known.find(p => similar(p.key, group.key))
    return { label: participant?.name ?? variants[0][0], count: group.count, variants }
  }).sort((a, b) => (b.count - a.count) || a.label.localeCompare(b.label))
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
