import { Calendar, Check, Clock, MapPin, Tag, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Tour } from '@/types/db';

type Tile = { label: string; value: string; Icon: LucideIcon };

/**
 * Η αριστερή στήλη της σελίδας εκδρομής: περιγραφή, «καλό να ξέρετε» και
 * σημεία επιβίβασης. Server component — καμία ενότητα δεν εμφανίζεται όταν
 * λείπουν τα δεδομένα της, ώστε να μη μένουν κενές κεφαλίδες.
 */
export function TourInfo({ tour }: { tour: Tour }) {
  const paragraphs = (tour.summary ?? '')
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const tiles: Tile[] = [];
  if (tour.duration_label) tiles.push({ label: 'Διάρκεια', value: tour.duration_label, Icon: Clock });
  if (tour.departure_note) tiles.push({ label: 'Αναχωρήσεις', value: tour.departure_note, Icon: Calendar });
  if (tour.meeting_point) tiles.push({ label: 'Σημείο συνάντησης', value: tour.meeting_point, Icon: MapPin });
  if (tour.price_from != null) tiles.push({ label: 'Τιμή', value: `από ${tour.price_from}€`, Icon: Tag });

  const points = (tour.meeting_points ?? []).filter((p) => p.trim().length > 0);
  const clean = (list: string[] | null | undefined) => (list ?? []).filter((s) => s.trim().length > 0);
  const highlights = clean(tour.highlights);
  const included = clean(tour.included);
  const notIncluded = clean(tour.not_included);

  if (
    paragraphs.length === 0 &&
    tiles.length === 0 &&
    points.length === 0 &&
    highlights.length === 0 &&
    included.length === 0 &&
    notIncluded.length === 0
  ) {
    return null;
  }

  return (
    <div className="divide-y divide-border">
      {highlights.length > 0 && (
        <section className="py-8 first:pt-0">
          <h2 className="text-xl font-bold text-primary">Τι θα δείτε</h2>
          <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/[0.04] p-6">
            <ul className="grid gap-3">
              {highlights.map((item, i) => (
                <li key={`${i}-${item}`} data-testid="tour-highlight" className="flex gap-3 text-[15px] text-body">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {paragraphs.length > 0 && (
        <section className="py-8 first:pt-0">
          <h2 className="text-xl font-bold text-primary">Περιγραφή</h2>
          <div className="mt-4 max-w-[64ch] space-y-3.5 text-[15.5px] leading-relaxed text-muted">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {(included.length > 0 || notIncluded.length > 0) && (
        <section className="py-8 first:pt-0">
          <h2 className="text-xl font-bold text-primary">Τι περιλαμβάνεται</h2>
          <div className="mt-4 grid gap-x-9 gap-y-4 sm:grid-cols-2">
            {included.length > 0 && (
              <div className={notIncluded.length === 0 ? 'sm:col-span-2' : undefined}>
                <h3 className="mb-2.5 font-sans text-[14px] font-bold text-body">Περιλαμβάνονται</h3>
                <ul className="grid gap-2">
                  {included.map((item, i) => (
                    <li key={`${i}-${item}`} data-testid="tour-included" className="flex gap-2.5 text-[14.5px] text-body">
                      <Check className="mt-0.5 h-[18px] w-[18px] shrink-0 text-olive" strokeWidth={1.75} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {notIncluded.length > 0 && (
              <div className={included.length === 0 ? 'sm:col-span-2' : undefined}>
                <h3 className="mb-2.5 font-sans text-[14px] font-bold text-body">Δεν περιλαμβάνονται</h3>
                <ul className="grid gap-2">
                  {notIncluded.map((item, i) => (
                    <li key={`${i}-${item}`} data-testid="tour-not-included" className="flex gap-2.5 text-[14.5px] text-muted">
                      <X className="mt-0.5 h-[18px] w-[18px] shrink-0 text-muted/50" strokeWidth={1.75} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {tiles.length > 0 && (
        <section className="py-8 first:pt-0">
          <h2 className="text-xl font-bold text-primary">Καλό να ξέρετε</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {tiles.map(({ label, value, Icon }) => (
              <div key={label} data-testid="info-tile" className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {label}
                </div>
                <div className="font-bold text-body">{value}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {points.length > 0 && (
        <section className="py-8 first:pt-0">
          <h2 className="text-xl font-bold text-primary">Σημεία επιβίβασης</h2>
          <ul className="mt-4 space-y-3">
            {points.map((point, i) => (
              <li
                key={`${i}-${point}`}
                data-testid="boarding-point"
                className="flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4"
              >
                <MapPin className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                <span className="text-[15px] leading-relaxed text-body">{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
