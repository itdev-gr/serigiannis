/** Οι διευθύνσεις του πούλμαν μέσα στο admin, σε ΕΝΑ σημείο. Ζούσαν
 *  σκορπισμένες σε 19 σημεία του ticketing-actions.ts, οπότε κάθε μετακόμιση
 *  ρίσκαρε να αφήσει κάποια πίσω.
 *
 *  ΠΡΟΣΟΧΗ: το POYLMAN_LIST έχει ήδη query string. Για flash μηνύματα
 *  χρησιμοποιείτε ΠΑΝΤΑ withFlash() — το flashQuery() προσθέτει «?» και θα
 *  παρήγαγε «?tab=poylman?saved=1», δηλαδή χαμένο μήνυμα. */
export const POYLMAN_LIST = '/admin/tours?tab=poylman';

export function poylmanHref(id: string): string {
  return `/admin/tours/poylman/${id}`;
}

export function poylmanTabHref(id: string, tab: string): string {
  return `${poylmanHref(id)}?tab=${tab}`;
}
