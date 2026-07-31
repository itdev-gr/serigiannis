/** UTC offset ("+03:00" / "+02:00") of Europe/Athens at a given instant. */
function offsetAt(instant: Date): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Athens', timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = name?.match(/GMT([+-]\d{2}:\d{2})/);
  return m ? m[1] : '+02:00';
}

/**
 * Athens wall-clock date+time as an ISO string with the CORRECT UTC offset for
 * that moment (EET +02:00 in winter, EEST +03:00 in summer). Two passes resolve
 * dates near a DST switch: the second lookup uses the instant implied by the
 * first guess.
 */
export function athensDepartureAt(date: string, time: string): string {
  let offset = '+02:00';
  for (let i = 0; i < 2; i++) {
    offset = offsetAt(new Date(`${date}T${time}:00${offset}`));
  }
  return `${date}T${time}:00${offset}`;
}
