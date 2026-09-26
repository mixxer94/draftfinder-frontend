import { reactive } from 'vue'
import { formatDate } from '@/services/hcApi'

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

/**
 * Rückfrage vor „Sofort starten“, überall mit demselben Wortlaut.
 * `scheduledAt` nur übergeben, wenn schon ein Termin steht, der dann entfällt.
 */
export function confirmStartNow ({ code, a, b, scheduledAt = null, timezone }) {
  const termin = scheduledAt ? `
Der Termin am ${formatDate(scheduledAt, timezone, true)} entfällt.` : ''
  return confirmAction({
    title: `${code} sofort starten?`,
    text: `${a} vs. ${b}: Der Bot schickt beiden jetzt die Draft-Links, das Spiel beginnt sofort.${termin}`,
    confirmText: 'Sofort starten',
  })
}
