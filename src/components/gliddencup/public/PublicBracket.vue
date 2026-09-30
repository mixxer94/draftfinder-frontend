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
    </div>

    <p v-if="!sides.length" class="text-medium-emphasis">Noch keine Matches im Turnierbaum.</p>

    <section v-for="side in sides" :key="side.bracket" class="mb-8">
      <h2 v-if="sides.length > 1" class="hc-h2">{{ side.title }}</h2>
      <BracketTree :rounds="side.rounds" :show-state="false" :card-width="cardWidth">
        <template #side="{ slot, side: ab }">
          <div class="gc-row" :style="{ gridTemplateColumns: columns }">
            <div class="hc-tree-name">{{ pseudonym(slot, ab) ?? '—' }}</div>
            <div v-if="hasRealNames" class="gc-cell gc-real text-secondary" :title="realName(slot, ab) ?? undefined">
              {{ realName(slot, ab) }}
            </div>
            <div v-if="guessesShown(slot)" class="gc-cell gc-guess" :title="guessTitle(slot, ab)">
              <template v-if="guess(slot, ab)">
                vermutet {{ guess(slot, ab) }}
                <v-icon v-if="guessCorrect(slot, ab)" icon="mdi-check" size="x-small" color="success" aria-label="richtig" />
              </template>
              <span v-else class="text-medium-emphasis">keine Vermutung</span>
            </div>
          </div>
        </template>

        <template #head="{ slot }">
          <v-btn
            v-if="hasGuessStage(slot)"
            size="x-small"
            variant="text"
            :prepend-icon="guessesShown(slot) ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            :aria-pressed="guessesShown(slot)"
            :aria-label="`Vermutungen in ${slot.code} ${guessesShown(slot) ? 'ausblenden' : 'anzeigen'}`"
            @click="toggleCard(slot)"
          >
            Vermutungen
          </v-btn>
        </template>
      </BracketTree>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import BracketTree from '@/components/gliddencup/BracketTree.vue'
import { bracketSides, truthMap } from '@/services/gliddencupApi'
/**
 * Öffentlicher Turnierbaum aus der HC-Projektion (`tournament` wie von
 * /api/hc/public). Lädt selbst nichts; die Seite fragt ab.
 */
const props = defineProps({
  tournament: { type: Object, required: true },
})

const sides = computed(() => bracketSides(props.tournament))
const slots = computed(() => sides.value.flatMap(s => s.rounds.flatMap(r => r.slots)))
const truth = computed(() => truthMap(props.tournament))

// Vermutungen gibt es erst ab Stufe 2; vorher wäre der Schalter wirkungslos.
const hasGuessStage = slot => slot.revealLevel >= 2
const hasGuesses = computed(() => slots.value.some(hasGuessStage))

const showAll = ref(false)
// Abweichungen einzelner Karten vom globalen Schalter; der globale Schalter setzt sie zurück.
const overrides = ref({})
watch(showAll, () => { overrides.value = {} })

const guessesShown = slot => hasGuessStage(slot) && (overrides.value[slot.code] ?? showAll.value)
function toggleCard (slot) {
  overrides.value = { ...overrides.value, [slot.code]: !guessesShown(slot) }
}

const pseudonym = (slot, ab) => (ab === 'A' ? slot.a : slot.b)
const other = ab => (ab === 'A' ? 'B' : 'A')
const realName = (slot, ab) => (ab === 'A' ? slot.aName : slot.bName) ?? truth.value.get(pseudonym(slot, ab)) ?? null
const guess = (slot, ab) => (ab === 'A' ? slot.guessA : slot.guessB)
const guessCorrect = (slot, ab) => {
  const actual = realName(slot, other(ab))
  return !!actual && guess(slot, ab) === actual
}
const guessTitle = (slot, ab) => `Wen ${pseudonym(slot, ab)} hinter ${pseudonym(slot, other(ab))} vermutet`

/*
 * Klarname und Vermutung stehen als eigene Spalten neben dem Pseudonym, damit
 * die Karten flach bleiben; Breite ist im Baum reichlich da. Eine Spalte gibt
 * es nur, wenn irgendeine Karte sie gerade füllt, und dann für alle Karten
 * gleich breit, weil BracketTree eine einheitliche Kartenbreite braucht.
 */
const REAL_W = 150
const GUESS_W = 200
const GAP = 12
const hasRealNames = computed(() => slots.value.some(s => realName(s, 'A') || realName(s, 'B')))
const anyGuessShown = computed(() => slots.value.some(guessesShown))
const columns = computed(() => [
  'minmax(0, 1fr)',
  hasRealNames.value && `${REAL_W}px`,
  anyGuessShown.value && `${GUESS_W}px`,
].filter(Boolean).join(' '))
const cardWidth = computed(() => 220
  + (hasRealNames.value ? REAL_W + GAP : 0)
  + (anyGuessShown.value ? GUESS_W + GAP : 0))
</script>

<style scoped>
.gc-row {
  display: grid;
  column-gap: 12px;
  align-items: baseline;
}
.gc-cell {
  font-size: 0.8125rem;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gc-guess { font-style: italic; }
.gc-real { font-weight: 500; }
/* BracketTree setzt die Siegerzeile fett; der Klarname gehört zum Sieger, die Vermutung nicht. */
.font-weight-bold .gc-real { font-weight: 700; }
</style>
