/** Greek phone → tel: E.164 (strip spaces, prefix +30 for local numbers). */
export function telHref(phone: string): string {
  const digits = phone.replace(/\s+/g, '');
  return digits.startsWith('+') ? `tel:${digits}` : `tel:+30${digits}`;
}
