<template>
  <v-btn
    size="small"
    variant="outlined"
    color="secondary"
    append-icon="mdi-chevron-right"
    :to="`/gliddencup/admin/matches/${id}`"
  >
    Details
  </v-btn>
</template>

<script setup>
defineProps({ id: { type: String, required: true } })
</script>
