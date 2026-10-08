<template>
  <div>
    <div v-if="hasGuesses" class="d-flex align-center flex-wrap ga-3 mb-4">
      <v-switch
        v-model="showAll"
        label="Vermutungen anzeigen"
        color="secondary"
        density="compact"
        hide-details
        inset
        class="flex-grow-0"
      />
      <span class="text-body-2 text-medium-emphasis">Klick auf ein Match blendet nur dessen Vermutungen ein oder aus.</span>
    </div>

    <p v-if="!trees.length" class="text-medium-emphasis">Noch keine Matches im Turnierbaum.</p>

    <section v-for="tree in trees" :key="tree.bracket" class="mb-8">
      <h2 v-if="trees.length > 1" class="hc-h2">{{ tree.title }}</h2>
      <div class="gc-scroll">
        <div class="gc-tree" :style="{ width: `${tree.width}px`, height: `${tree.height}px` }">
          <div v-for="(label, c) in tree.labels" :key="c" class="gc-label" :style="{ left: `${c * tree.colW}px` }">{{ label }}</div>

          <svg class="gc-lines" :width="tree.width" :height="tree.height" aria-hidden="true">
            <path
              v-for="(p, i) in tree.paths"
              :key="i"
              :d="p.d"
              :class="{ 'is-won': p.winner, 'is-focus': p.winner && p.winner === focus }"
            />
          </svg>

          <component
            :is="hasGuessStage(card.slot) ? 'button' : 'div'"
            v-for="card in tree.cards"
            :key="card.slot.code"
            :type="hasGuessStage(card.slot) ? 'button' : undefined"
            class="gc-card"
            :class="{ 'gc-card--toggle': hasGuessStage(card.slot) }"
            :style="{ left: `${card.x}px`, top: `${card.y}px`, width: `${CARD_W}px`, height: `${CARD_H}px` }"
            :aria-pressed="hasGuessStage(card.slot) ? guessesShown(card.slot) : undefined"
            :aria-label="hasGuessStage(card.slot) ? `Vermutungen in ${card.slot.code} ${guessesShown(card.slot) ? 'ausblenden' : 'einblenden'}` : undefined"
            @click="hasGuessStage(card.slot) && toggleCard(card.slot)"
          >
            <span
              v-for="side in sidesOf(card.slot)"
              :key="side.ab"
              class="gc-row"
              :class="{ 'is-won': side.won, 'is-focus': side.pseudo && side.pseudo === focus }"
              @mouseenter="focus = side.pseudo"
              @mouseleave="focus = null"
            >
              <span class="gc-score">{{ side.games }}</span>
              <span class="gc-names">
                <span class="gc-name" :title="side.pseudo ?? undefined">{{ side.pseudo ?? '—' }}</span>
                <!-- Die Zeile ist immer da, damit Klarname und Vermutung beim Erscheinen nichts verschieben. -->
                <span class="gc-sub">
                  <span class="gc-real" :title="side.real ?? undefined">{{ side.real }}</span>
                  <template v-if="guessesShown(card.slot)">
                    <span v-if="side.tipAbout" class="gc-verdict" :class="{ 'is-ok': side.tipOk }" :title="side.tipTitle">
                      für <i>{{ side.tipAbout }}</i> gehalten
                    </span>
                    <span v-else class="gc-verdict">keine Vermutung</span>
                  </template>
                </span>
              </span>
            </span>
          </component>

          <template v-if="tree.champ">
            <div class="gc-champ" :style="{ left: `${tree.champ.x}px`, top: `${tree.champ.y - 46}px` }">
              <v-icon icon="mdi-trophy-outline" size="28" />
              <span class="gc-champ-name">{{ tree.champ.side.pseudo }}</span>
              <span class="gc-champ-real">{{ tree.champ.side.real }}</span>
            </div>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { layoutTree } from '@/components/gliddencup/treeLayout'
import { bracketSides, truthMap } from '@/services/gliddencupApi'

/**
 * Öffentlicher Turnierbaum aus der HC-Projektion (`tournament` wie von
 * /api/hc/public). Lädt selbst nichts; die Seite fragt ab.
 *
 * Jede Spielerzeile zeigt Ergebnis, Pseudonym und darunter den Klarnamen,
 * sobald er aufgedeckt ist. Vermutungen stehen bei dem, über den vermutet
 * wurde („für X gehalten“), und werden erst grün, wenn sein Klarname bekannt
 * ist und die Vermutung stimmt; vorher würden sie im Stream die Auflösung
 * vorwegnehmen. Hover über einen Spieler hebt seine Matches in allen Runden
 * hervor.
 */
const props = defineProps({
  tournament: { type: Object, required: true },
})

const CARD_W = 300
const CARD_H = 104
const COL_GAP = 56
const TOP = 32 // Platz für die Rundennamen
const CHAMP_W = 176

const sides = computed(() => bracketSides(props.tournament))
const slots = computed(() => sides.value.flatMap(s => s.rounds.flatMap(r => r.slots)))
const truth = computed(() => truthMap(props.tournament))

// Vermutungen gibt es erst ab Stufe 3; vorher wäre der Schalter wirkungslos.
const hasGuessStage = slot => slot.revealLevel >= 3
const hasGuesses = computed(() => slots.value.some(hasGuessStage))

const showAll = ref(false)
// Abweichungen einzelner Karten vom globalen Schalter; der globale Schalter setzt sie zurück.
const overrides = ref({})
watch(showAll, () => { overrides.value = {} })

const guessesShown = slot => hasGuessStage(slot) && (overrides.value[slot.code] ?? showAll.value)
function toggleCard (slot) {
  overrides.value = { ...overrides.value, [slot.code]: !guessesShown(slot) }
}

const focus = ref(null)

const same = (x, y) => !!x && !!y && x.toLowerCase() === y.toLowerCase()

/** Beide Seiten eines Slots, aufbereitet für eine Kartenzeile. */
function sidesOf (slot) {
  // Das Ergebnis steht aus Sicht des Siegers („2:1“).
  const [won, lost] = slot.match?.score?.split(':') ?? []
  const winner = slot.match?.winner
  const view = ab => {
    const pseudo = (ab === 'A' ? slot.a : slot.b) ?? null
    return {
      ab,
      pseudo,
      real: (ab === 'A' ? slot.aName : slot.bName) ?? truth.value.get(pseudo) ?? null,
      won: winner === ab,
      games: winner && lost !== undefined ? (winner === ab ? won : lost) : '',
    }
  }
  const [a, b] = [view('A'), view('B')]
  const about = (side, other, tip) => ({
    ...side,
    tipAbout: tip ?? null,
    tipOk: same(tip, side.real),
    tipTitle: `${other.pseudo} vermutet hinter ${side.pseudo}: ${tip}`,
  })
  return [about(a, b, slot.guessB), about(b, a, slot.guessA)]
}

/*
 * Pro Bracket-Seite ein Baum. Der Turniersieger steht in einer eigenen
 * Spalte hinter der letzten Runde der letzten Seite, sobald deren einziges
 * Match entschieden ist.
 */
const trees = computed(() => sides.value.map((side, index) => {
  const layout = layoutTree(side.rounds, { cardW: CARD_W, cardH: CARD_H, top: TOP, colGap: COL_GAP, rowGap: 15 })
  const paths = layout.links.map(link => ({
    d: link.d,
    winner: sidesOf(link.from.slot).find(s => s.won)?.pseudo ?? null,
  }))

  const lastRound = side.rounds.at(-1)
  const finalCard = index === sides.value.length - 1 && lastRound?.slots.length === 1
    ? layout.cards.find(c => c.slot === lastRound.slots[0])
    : null
  const champSide = finalCard && sidesOf(finalCard.slot).find(s => s.won)
  let champ = null
  if (champSide) {
    const y = finalCard.y + CARD_H / 2
    const x = finalCard.x + CARD_W + COL_GAP
    paths.push({ d: `M${finalCard.x + CARD_W} ${y}H${x - 8}`, winner: champSide.pseudo })
    champ = { x, y, side: champSide }
  }
  // Hervorgehobene Linien zuletzt zeichnen, damit sie über den anderen liegen.
  paths.sort((p, q) => (p.winner === focus.value) - (q.winner === focus.value))

  return {
    bracket: side.bracket,
    title: side.title,
    cards: layout.cards,
    paths,
    colW: layout.colW,
    labels: [...side.rounds.map(r => r.label), ...(champ ? ['Sieger'] : [])],
    champ,
    width: layout.width + (champ ? COL_GAP + CHAMP_W : 0),
    height: layout.height,
  }
}))
</script>

<style scoped>
.gc-scroll { overflow-x: auto; padding-bottom: 8px; }
.gc-tree {
  --accent: rgb(var(--v-theme-secondary));
  --rule: rgba(var(--v-theme-on-surface), 0.25);
  --muted: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  position: relative;
  color: rgb(var(--v-theme-on-surface));
}
.gc-label { position: absolute; top: 0; font-size: 0.8125rem; color: var(--muted); white-space: nowrap; }
.gc-lines { position: absolute; inset: 0; pointer-events: none; }
.gc-lines path { fill: none; stroke: var(--rule); stroke-width: 1.25; }
.gc-lines path.is-won { stroke: var(--accent); stroke-width: 2; }
.gc-lines path.is-focus { stroke-width: 4; }

.gc-card {
  position: absolute;
  display: grid;
  grid-template-rows: 1fr 1fr;
  overflow: hidden;
  padding: 0;
  text-align: left;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
}
.gc-card--toggle { cursor: pointer; transition: border-color 120ms ease-out; }
.gc-card--toggle:hover { border-color: var(--accent); }
.gc-card--toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.gc-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  align-items: center;
  column-gap: 10px;
  padding: 0 12px 0 8px;
  transition: background-color 120ms ease-out;
}
.gc-row + .gc-row { border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); }
.gc-row.is-focus { background: rgba(var(--v-theme-secondary), 0.22); }

.gc-score {
  display: grid;
  place-items: center;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
}
.is-won .gc-score { border-color: var(--accent); background: var(--accent); color: rgb(var(--v-theme-on-secondary)); }
/* Offene Matches: Platz bleibt, damit die Namen in allen Karten gleich eingerückt sind. */
.gc-score:empty { border-color: transparent; }

.gc-names { display: flex; flex-direction: column; min-width: 0; }
.gc-name { height: 20px; font-size: 0.9375rem; line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); }
.is-won .gc-name { font-weight: 700; color: rgb(var(--v-theme-on-surface)); }
.gc-sub { display: flex; align-items: baseline; gap: 8px; height: 16px; min-width: 0; font-size: 0.75rem; line-height: 16px; }
.gc-real { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; color: var(--accent); }
.gc-verdict { flex: 0 0 auto; margin-left: auto; white-space: nowrap; color: var(--muted); }
.gc-verdict i { color: rgb(var(--v-theme-on-surface)); }
.gc-verdict.is-ok, .gc-verdict.is-ok i { color: rgb(var(--v-theme-success)); font-weight: 600; }

.gc-champ { position: absolute; display: flex; flex-direction: column; width: 176px; color: var(--accent); }
.gc-champ-name { font-size: 1.375rem; line-height: 1.25; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gc-champ-real { min-height: 1.4em; font-size: 0.9375rem; font-weight: 500; color: rgb(var(--v-theme-on-surface)); }
</style>
