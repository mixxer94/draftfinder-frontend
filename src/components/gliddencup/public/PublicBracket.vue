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
      <span class="text-body-2 text-medium-emphasis">
        Nach jedem Match sagen beide Spieler, wen sie hinter ihrem Gegner vermuten.
      </span>
    </div>

    <p v-if="!sides.length" class="text-medium-emphasis">Noch keine Matches im Turnierbaum.</p>

    <section v-for="side in sides" :key="side.bracket" class="mb-8">
      <h2 v-if="sides.length > 1" class="hc-h2">{{ side.title }}</h2>
      <BracketTree :rounds="side.rounds" :show-state="false" :card-height="cardHeight">
        <template #side="{ slot, side: ab }">
          <template v-if="slot.revealLevel !== 0">
            <div class="hc-tree-name">{{ pseudonym(slot, ab) ?? '—' }}</div>
            <div v-if="realName(slot, ab)" class="gc-line text-medium-emphasis">{{ realName(slot, ab) }}</div>
            <div v-if="guessesShown(slot)" class="gc-line gc-guess" :title="guessTitle(slot, ab)">
              <template v-if="guess(slot, ab)">
                vermutet {{ guess(slot, ab) }}
                <v-icon v-if="guessCorrect(slot, ab)" icon="mdi-check" size="x-small" color="success" aria-label="richtig" />
              </template>
              <span v-else class="text-medium-emphasis">keine Vermutung</span>
            </div>
          </template>
          <div v-else class="hc-tree-name" aria-hidden="true">&nbsp;</div>
        </template>

        <template #actions="{ slot }">
          <div v-if="slot.revealLevel === 2" class="d-flex justify-end">
            <v-btn
              size="x-small"
              variant="text"
              :prepend-icon="guessesShown(slot) ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              :aria-pressed="guessesShown(slot)"
              :aria-label="`Vermutungen in ${slot.code} ${guessesShown(slot) ? 'ausblenden' : 'anzeigen'}`"
              @click="toggleCard(slot)"
            >
              Vermutungen
            </v-btn>
          </div>
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
const hasGuesses = computed(() => slots.value.some(s => s.revealLevel === 2))

const showAll = ref(false)
// Abweichungen einzelner Karten vom globalen Schalter; der globale Schalter setzt sie zurück.
const overrides = ref({})
watch(showAll, () => { overrides.value = {} })

const guessesShown = slot => slot.revealLevel === 2 && (overrides.value[slot.code] ?? showAll.value)
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
 * BracketTree braucht eine feste Kartenhöhe für alle Karten. Zusatzzeilen
 * (Klarname, Vermutung, Button) kosten nur Platz, wenn irgendeine Karte sie
 * gerade zeigt; sonst bleibt der Baum so kompakt wie im Admin-Bereich.
 */
const LINE = 17
const cardHeight = computed(() => {
  let h = 72
  if (slots.value.some(s => s.revealLevel !== 0 && (realName(s, 'A') || realName(s, 'B')))) h += 2 * LINE
  if (slots.value.some(guessesShown)) h += 2 * LINE
  if (hasGuesses.value) h += 26
  return h
})
</script>

<style scoped>
.gc-line {
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 17px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gc-guess { font-style: italic; }
</style>
