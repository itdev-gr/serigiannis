import { describe, it, expect } from 'vitest';
import { POYLMAN_LIST, poylmanHref, poylmanTabHref } from '@/lib/admin-routes';
import { withFlash } from '@/lib/admin-flash';

describe('admin-routes', () => {
  it('η λίστα πούλμαν είναι καρτέλα του hub εκδρομών', () => {
    expect(POYLMAN_LIST).toBe('/admin/tours?tab=poylman');
  });

  // Η πιο εύκολη σιωπηλή αστοχία της μετακόμισης: το flashQuery() βάζει πάντα
  // «?», οπότε σε URL που έχει ήδη query το μήνυμα επιτυχίας χανόταν.
  it('το withFlash βάζει & όταν υπάρχει ήδη query', () => {
    expect(withFlash(POYLMAN_LIST, true)).toBe('/admin/tours?tab=poylman&saved=1');
    expect(withFlash(POYLMAN_LIST, false, 'db')).toBe('/admin/tours?tab=poylman&error=db');
  });

  it('σύνδεσμοι λεπτομερειών', () => {
    expect(poylmanHref('abc')).toBe('/admin/tours/poylman/abc');
    expect(poylmanTabHref('abc', 'times')).toBe('/admin/tours/poylman/abc?tab=times');
  });
});
