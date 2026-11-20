import { computed, ref } from 'vue'
import { summarize } from './reveal'

const GROUPS = [
  { value: 'questions', title: 'Zusatzfragen', noun: 'Frage' },
  { value: 'recognized', title: 'Wer wurde erkannt?', noun: 'Seite' },
  { value: 'players', title: 'Spieler-Vermutungen', noun: 'Seite' },
  { value: 'ranking', title: 'Rangliste', noun: 'Seite' },
]

/**
 * Ablauf der Auflösung, gemeinsam für den Auswertungen-Reiter und das Vollbild:
 * eine Folienfolge mit aktueller Position und den aufgedeckten Lösungen. Beide
 * Ansichten bekommen dasselbe Objekt, damit das Vollbild dort weitermacht, wo
 * der Reiter steht, und umgekehrt.
 *
 * Reihenfolge: Zusatzfragen mit Guy Glidden zuletzt, „Wer wurde erkannt?“
 * seitenweise, Spieler-Vermutungen, Rangliste seitenweise. Die Rangliste steht
 * am Ende, damit niemand als Erstes das Endergebnis sieht.
 */
export function useRevealDeck (tournament, overview) {
  const summary = computed(() => summarize(tournament.value, overview.value))

  const slides = computed(() => {
    const t = tournament.value
    const pages = (group, count) => Array.from({ length: count }, (_, page) =>
      ({ key: `${group}-${page}`, group, item: group, page, of: count }))
    const questions = [...(t.questions ?? []), { id: 'mystery', text: 'Wer ist Guy Glidden?', solution: t.mysteryAnswers?.length ? 1 : null }]
    return [
      ...questions.map((q, i) => ({
        key: q.id, group: 'questions', item: q.id, page: 0, title: q.text,
        // Ohne Lösung gibt es nichts aufzudecken; dann bleibt es bei den Tipps.
        solvable: q.solution != null,
        pos: i, of: questions.length,
      })),
      ...pages('recognized', summary.value.recognizedPages.length),
      ...pages('players', 1),
      ...pages('ranking', summary.value.rankingPages.length),
    ].map((s, index) => ({ ...s, index, pos: s.pos ?? s.page }))
  })

  const index = ref(0)
  const solved = ref(new Set())
  const current = computed(() => slides.value[index.value] ?? slides.value[0])
  const isSolved = s => solved.value.has(s.key)
  const needsSolve = computed(() => current.value.solvable && !isSolved(current.value))
  const atEnd = computed(() => index.value >= slides.value.length - 1)

  const go = i => { index.value = Math.min(Math.max(i, 0), slides.value.length - 1) }
  const prev = () => go(index.value - 1)
  /** Hauptaktion: erst die Lösung aufdecken, dann zur nächsten Folie. */
  function advance () {
    if (needsSolve.value) solved.value = new Set(solved.value).add(current.value.key)
    else go(index.value + 1)
  }

  const nextLabel = computed(() => {
    if (needsSolve.value) return 'Lösung zeigen'
    const next = slides.value[index.value + 1]
    if (!next) return 'Ende'
    return next.group === current.value.group ? `Nächste ${groupOf(next).noun}` : groupOf(next).title
  })
  const position = computed(() => {
    const s = current.value
    return s.of > 1 ? `${groupOf(s).noun} ${s.pos + 1} von ${s.of}` : ''
  })

  return { slides, index, current, isSolved, needsSolve, atEnd, go, prev, advance, nextLabel, position, groups: GROUPS }
}

const groupOf = s => GROUPS.find(g => g.value === s.group)
