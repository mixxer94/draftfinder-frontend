/** Tipper mit Punkten aus einem questionResult, in der Reihenfolge von `users`. */
export const winnersOf = (result, users) => users.filter(u => result.byUser.get(u)?.points)

/** Bis `max` Namen ausgeschrieben, darüber nur die Zahl: Eine lange Liste auf einer Folie liest niemand. */
export const namesText = (names, max = 3) => (names.length <= max ? names.join(', ') : `${names.length} Tipper`)

export const tipsText = n => `${n} ${n === 1 ? 'Tipp' : 'Tipps'}`
