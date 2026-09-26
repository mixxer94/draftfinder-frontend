<template>
  <v-dialog :model-value="confirmState.open" max-width="440" @update:model-value="v => v || settleConfirm(false)">
    <v-card class="hc-dialog pa-2">
      <v-card-title class="text-h6 text-wrap">{{ confirmState.title }}</v-card-title>
      <v-card-text>
        <p v-if="confirmState.text" class="hc-confirm-text">{{ confirmState.text }}</p>
        <v-text-field
          v-if="confirmState.reasonLabel"
          v-model="confirmState.reason"
          :label="confirmState.reasonLabel"
          class="mt-4"
          autofocus
          hide-details
          @keyup.enter="canConfirm && settleConfirm(true)"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="settleConfirm(false)">Abbrechen</v-btn>
        <v-btn :color="confirmState.color" variant="flat" :disabled="!canConfirm" @click="settleConfirm(true)">
          {{ confirmState.confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { confirmState, settleConfirm } from '@/services/confirm'

const canConfirm = computed(() => !confirmState.reasonLabel || confirmState.reason.trim() !== '')
</script>

<style scoped>
.hc-confirm-text { white-space: pre-line; max-width: 60ch; }
</style>
