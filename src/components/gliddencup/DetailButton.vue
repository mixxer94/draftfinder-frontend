<template>
  <v-btn
    size="small"
    variant="outlined"
    color="secondary"
    append-icon="mdi-chevron-right"
    :to="`/gliddencup/admin/matches/${id}`"
    :aria-label="`Details zu ${slotCode}`"
  >
    Details
  </v-btn>
</template>

<script setup>
// `slotCode` landet im Namen für Screenreader, damit sich die Buttons einer Tabelle unterscheiden.
defineProps({ id: { type: String, required: true }, slotCode: { type: String, required: true } })
</script>
