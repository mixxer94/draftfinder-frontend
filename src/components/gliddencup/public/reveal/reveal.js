import { truthMap } from '@/services/gliddencupApi'
import {
  crowdCorrect, globalConfusions, mysteryResult, playerGuesses,
  playerStats, questionResult, rankingWithCrowd, userStats,
} from '@/services/gliddencupStats'

/** Tipper mit Punkten aus einem questionResult, in der Reihenfolge von `users`. */
export const winnersOf = (result, users) => users.filter(u => result.byUser.get(u)?.points)

/** Bis `max` Namen ausgeschrieben, darüber nur die Zahl: Eine lange Liste auf einer Folie liest niemand. */
export const namesText = (names, max = 3) => (names.length <= max ? names.join(', ') : `${names.length} Tipper`)

export const tipsText = n => `${n} ${n === 1 ? 'Tipp' : 'Tipps'}`

/** Prozent mit einer Nachkommastelle in deutscher Schreibweise. */
export const pct = v => `${v.toFixed(1).replace('.', ',')} %`

// Einträge je Seite der Rangliste und von „Wer wurde erkannt?“: Ein RO16 passt auf eine Folie und bleibt im Stream lesbar.
const PAGE_SIZE = 16

const chunk = list => Array.from({ length: Math.ceil(list.length / PAGE_SIZE) }, (_, i) => list.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE))

/** Rangliste in Seiten zu 16 Tippern; die Community (Mehrheitstipp) kommt zusätzlich auf die Seite, auf die sie nach Punkten gehört. */
function rankingPages (ranking) {
  const pages = [[]]
  for (const row of ranking) {
    const page = pages.at(-1)
    if (!row.crowd && page.filter(r => !r.crowd).length === PAGE_SIZE) pages.push([row])
    else page.push(row)
  }
  return pages
}

/**
 * Gesamtauswertung der Pseudonym-Tipps für die Folien. `overview` wie aus
 * loadTipsOverview. Rangliste und „Wer wurde erkannt?“ sind in Seiten zu 16
 * Einträgen geteilt.
 */
export function summarize (tournament, overview) {
  const truth = truthMap(tournament)
  const input = { pseudonyms: tournament.pseudonyms, truth, users: overview.users, picksByUser: overview.picksByUser ?? {} }
  const pStats = playerStats(input)
  const results = [
    ...(tournament.questions ?? []).map(q => questionResult(q, overview.users, overview.answersByUser)),
    mysteryResult(overview.users, overview.mysteryByUser, tournament.mysteryAnswers ?? []),
  ]
  const ranking = rankingWithCrowd(userStats(input), results, crowdCorrect(pStats))
  const recognized = [...pStats].sort((a, b) => (b.pct - a.pct) || a.pseudonym.localeCompare(b.pseudonym))
  return {
    ranking,
    rankingPages: rankingPages(ranking),
    rankingMax: Math.max(1, ...ranking.map(r => r.points)),
    recognized,
    recognizedPages: chunk(recognized),
    confusions: globalConfusions(pStats).slice(0, 3),
    players: playerGuesses({ rounds: tournament.rounds ?? [], truth, stats: pStats }),
  }
}
