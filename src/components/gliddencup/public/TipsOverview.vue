<template>
  <p v-if="!users.length" class="text-medium-emphasis">Es hat noch niemand getippt.</p>

  <v-row v-else>
    <v-col cols="12" md="3">
      <v-autocomplete
        v-if="!mdAndUp"
        v-model="selected"
        :items="users"
        label="Tipper"
        density="comfortable"
        hide-details
      />
      <v-list v-else density="compact" nav class="gc-users py-0" bg-color="transparent" aria-label="Tipper">
        <v-list-item
          v-for="u in users"
          :key="u"
          :active="selected === u"
          color="secondary"
          :title="u"
          @click="selected = u"
        >
          <template v-if="spoilers" #append>
            <span class="text-body-2 text-medium-emphasis gc-num">{{ correctBy.get(u) }}</span>
          </template>
        </v-list-item>
      </v-list>
    </v-col>

    <v-col cols="12" md="9">
      <div class="d-flex align-center flex-wrap ga-3 mb-2">
        <h2 class="hc-h2 mb-0">
          {{ selected ? `Tipps von ${selected}` : 'Tipps' }}
          <span v-if="selected && spoilers" class="gc-num">({{ correctBy.get(selected) }}/{{ rows.length }})</span>
        </h2>
        <v-spacer />
        <v-switch v-model="spoilers" label="Auflösung zeigen" color="secondary" density="compact" hide-details inset class="flex-grow-0" />
      </div>

      <p v-if="!selected" class="text-medium-emphasis">Wähl einen Tipper, um seine Tipps zu sehen.</p>

      <v-table v-else density="compact">
        <thead>
          <tr>
            <th>Pseudonym</th>
            <th>Tipp</th>
            <th v-if="spoilers">Tatsächlich</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.pseudonym"
            :class="spoilers && row.guess && (row.correct ? 'gc-hit' : 'gc-miss')"
          >
            <td class="font-weight-medium">{{ row.pseudonym }}</td>
            <td>
              <span v-if="row.guess">{{ row.guess }}</span>
              <span v-else class="text-medium-emphasis">nicht getippt</span>
            </td>
            <td v-if="spoilers">
              <span class="d-inline-flex align-center ga-1">
                <v-icon
                  v-if="row.guess"
                  :icon="row.correct ? 'mdi-check' : 'mdi-close'"
                  :color="row.correct ? 'success' : 'error'"
                  size="small"
                  :aria-label="row.correct ? 'richtig' : 'falsch'"
                />
                {{ row.truth || '—' }}
              </span>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-col>
  </v-row>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { truthMap } from '@/services/gliddencupApi'
import { userStats } from '@/services/gliddencupStats'

/** Tipps aller Tipper nach der Veröffentlichung der Zuordnung. */
const props = defineProps({
  tournament: { type: Object, required: true },
  users: { type: Array, required: true },
  picksByUser: { type: Object, required: true },
})

const { mdAndUp } = useDisplay()
const selected = ref(null)
const spoilers = ref(false)

const truth = computed(() => truthMap(props.tournament))
const correctBy = computed(() => new Map(userStats({
  pseudonyms: props.tournament.pseudonyms,
  truth: truth.value,
  users: props.users,
  picksByUser: props.picksByUser,
}).map(s => [s.user, s.correct])))

const rows = computed(() => {
  const picks = props.picksByUser[selected.value] ?? []
  return props.tournament.pseudonyms.map(pseudonym => {
    const guess = (picks.find(p => p.pseudonym === pseudonym)?.playerName ?? '').trim()
    const actual = truth.value.get(pseudonym) ?? ''
    return { pseudonym, guess, truth: actual, correct: !!guess && guess === actual }
  })
})
</script>

<style scoped>
.gc-users { max-height: 70vh; overflow-y: auto; }
.gc-num { font-variant-numeric: tabular-nums; }
.gc-hit { background: rgba(var(--v-theme-success), 0.16); }
.gc-miss { background: rgba(var(--v-theme-error), 0.12); }
</style>
