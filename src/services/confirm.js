import { reactive } from 'vue'

/** Zustand des einen Bestätigungsdialogs; gerendert von ConfirmDialog.vue in admin.vue. */
export const confirmState = reactive({
  open: false,
  title: '',
  text: '',
  confirmText: 'Bestätigen',
  color: 'secondary',
  reasonLabel: '',
  reason: '',
  resolve: null,
})

/**
 * Ersatz für window.confirm. Liefert `false` bei Abbruch, sonst `true` —
 * oder mit `reasonLabel` den eingegebenen Grund (Pflichtfeld).
 *
 *   if (!await confirmAction({ title: 'Match starten?', confirmText: 'Starten' })) return
 */
export function confirmAction ({ title, text = '', confirmText = 'Bestätigen', color = 'secondary', reasonLabel = '' }) {
  confirmState.resolve?.(false)
  return new Promise(resolve => {
    Object.assign(confirmState, { open: true, title, text, confirmText, color, reasonLabel, reason: '', resolve })
  })
}

export function settleConfirm (confirmed) {
  const answer = confirmed && (confirmState.reasonLabel ? confirmState.reason.trim() : true)
  confirmState.resolve?.(answer || false)
  confirmState.resolve = null
  confirmState.open = false
}
