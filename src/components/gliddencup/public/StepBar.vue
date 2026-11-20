<template>
  <div>
    <div class="d-flex align-center ga-2">
      <!-- Schmal nur das Symbol, damit die Leiste einzeilig bleibt und beim Blättern nicht springt. -->
      <v-btn v-if="smAndUp" variant="text" prepend-icon="mdi-chevron-left" :disabled="!canBack" @click="emit('back')">Zurück</v-btn>
      <v-btn v-else variant="text" icon="mdi-chevron-left" size="small" :disabled="!canBack" aria-label="Zurück" @click="emit('back')" />
      <v-spacer />
      <span class="text-body-1 sb-num text-no-wrap">{{ position }}</span>
      <v-spacer />
      <v-btn
        color="secondary"
        :variant="strong ? 'flat' : 'tonal'"
        :append-icon="icon"
        :disabled="!canNext"
        @click="emit('next')"
      >
        {{ nextLabel }}
      </v-btn>
    </div>
    <!-- Ohne Tastatur nutzlos; auf dem Handy entfällt der Hinweis. -->
    <p v-if="smAndUp" class="text-caption text-medium-emphasis text-right mt-1 mb-0">Pfeiltasten ← → zum Blättern</p>
  </div>
</template>

<script setup>
/**
 * Blätterleiste unter Tipps und Auswertungen: Zurück, Position, ein Hauptknopf
 * an fester Stelle. `strong` hebt den Hauptknopf hervor, etwa für „Lösung zeigen“.
 * Die Pfeiltasten verarbeitet die einbindende Ansicht mit onStepKey.
 */
import { useDisplay } from 'vuetify'

defineProps({
  position: { type: String, default: '' },
  nextLabel: { type: String, required: true },
  canBack: { type: Boolean, default: true },
  canNext: { type: Boolean, default: true },
  strong: { type: Boolean, default: false },
  icon: { type: String, default: 'mdi-chevron-right' },
})
const emit = defineEmits(['back', 'next'])
const { smAndUp } = useDisplay()
</script>

<script>
/**
 * Tastatur zum Blättern für den fokussierbaren Rahmen um Tipps oder Auswertungen.
 * Leertaste und Enter auf Knöpfen und in Feldern lösen diese selbst aus.
 */
export function onStepKey (e, { back, next }) {
  if (e.target.closest('input, textarea, [role="combobox"]')) return
  if ((e.key === ' ' || e.key === 'Enter') && e.target !== e.currentTarget) return
  if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) {
    e.preventDefault()
    next()
  } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
    e.preventDefault()
    back()
  }
}
</script>

<style scoped>
.sb-num { font-variant-numeric: tabular-nums; }
</style>

<style>
/* Fokussierbarer Rahmen, gemeinsam für Tipps und Auswertungen; der Innenabstand hält den Fokusrahmen im sichtbaren Bereich. */
.gc-stepper { padding: 4px; outline: none; }
.gc-stepper:focus-visible { outline: 2px solid rgb(var(--v-theme-secondary)); outline-offset: -2px; border-radius: 8px; }
</style>
