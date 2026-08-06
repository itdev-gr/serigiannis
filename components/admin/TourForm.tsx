'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Category, Tour } from '@/types/db';
import type { AdminRoute } from '@/lib/queries/ticketing';
import { routeLabel } from '@/lib/ticketing';
import { Button } from '@/components/ui/Button';
import { adminInput, adminLabel } from '@/components/admin/ui';
import { slugify, slugNeedsCleanup } from '@/lib/excursions';

const STATUSES = [
  { v: 'published', l: 'Δημοσιευμένη' },
  { v: 'draft', l: 'Πρόχειρη' },
  { v: 'hidden', l: 'Κρυμμένη' },
  { v: 'archived', l: 'Αρχειοθετημένη' },
];

export function TourForm({
  tour,
  categories,
  routes = [],
  action,
}: {
  tour?: Tour | null;
  categories: Category[];
  routes?: AdminRoute[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const isNew = !tour?.id;
  const primaryCat = tour?.categories?.[0]?.slug ?? categories[0]?.slug;

  // New tours: the slug tracks the title live until the clerk edits it
  // themselves — then their choice wins. Existing tours: the slug is never
  // rewritten automatically; we only warn and offer a one-click fix.
  const [slug, setSlug] = useState(tour?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(false);

  const cleanSlug = slugify(slug);
  const showSlugWarning = !isNew && slugNeedsCleanup(slug);

  return (
    <form action={action} className="grid max-w-2xl gap-5">
      {tour?.id && <input type="hidden" name="id" value={tour.id} />}

      <label className="block">
        <span className={adminLabel}>Τίτλος *</span>
        <input
          name="title"
          required
          defaultValue={tour?.title ?? ''}
          className={adminInput}
          onChange={
            isNew
              ? (e) => {
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }
              : undefined
          }
        />
      </label>

      <label className="block">
        <span className={adminLabel}>Υπότιτλος</span>
        <input name="subtitle" defaultValue={tour?.subtitle ?? ''} className={adminInput} />
      </label>

      <label className="block">
        <span className={adminLabel}>Slug (URL) *</span>
        <input
          name="slug"
          required
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugTouched(true);
          }}
          className={adminInput}
          placeholder="π.χ. meteora-monoimeri"
        />
        {!isNew && (
          <span className="mt-1 block text-[12px] text-muted">
            Η αλλαγή του slug αλλάζει τη διεύθυνση της σελίδας της εκδρομής.
          </span>
        )}
        {showSlugWarning && (
          <p className="mt-1 text-[12px] text-cta">
            Το slug περιέχει κεφαλαία, κενά ή άλλους μη επιτρεπτούς χαρακτήρες για διεύθυνση URL. Προτεινόμενο:{' '}
            <code className="font-mono">{cleanSlug}</code>{' '}
            <button
              type="button"
              onClick={() => {
                setSlug(cleanSlug);
                setSlugTouched(true);
              }}
              className="font-semibold underline underline-offset-2"
            >
              Χρήση προτεινόμενου
            </button>
          </p>
        )}
      </label>

      <label className="block">
        <span className={adminLabel}>Σύνοψη</span>
        <textarea name="summary" rows={3} defaultValue={tour?.summary ?? ''} className={adminInput} />
      </label>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block">
          <span className={adminLabel}>Τιμή από (€)</span>
          <input name="price_from" type="number" step="1" min="0" defaultValue={tour?.price_from ?? ''} className={adminInput} />
        </label>
        <label className="block">
          <span className={adminLabel}>Προηγούμενη τιμή (€)</span>
          <input
            name="price_original"
            inputMode="decimal"
            defaultValue={tour?.price_original != null ? String(tour.price_original) : ''}
            className={adminInput}
            placeholder="π.χ. 200,00"
          />
          <span className="mt-1 block text-[12px] text-muted">Εμφανίζεται διαγραμμένη δίπλα στην τιμή.</span>
        </label>
        <label className="block">
          <span className={adminLabel}>Κατηγορία</span>
          <select name="category" defaultValue={primaryCat} className={adminInput}>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name_el}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={adminLabel}>Διάρκεια</span>
          <input name="duration_label" defaultValue={tour?.duration_label ?? ''} className={adminInput} placeholder="π.χ. Μονοήμερη" />
        </label>
        <label className="block">
          <span className={adminLabel}>Αναχωρήσεις</span>
          <input name="departure_note" defaultValue={tour?.departure_note ?? ''} className={adminInput} placeholder="π.χ. Κάθε Σάββατο" />
        </label>
      </div>

      <label className="block">
        <span className={adminLabel}>Σημείο συνάντησης</span>
        <input name="meeting_point" defaultValue={tour?.meeting_point ?? ''} className={adminInput} placeholder="π.χ. Πλατεία Συντάγματος, 07:00" />
      </label>

      <label className="block">
        <span className={adminLabel}>Σημεία συνάντησης (ένα ανά γραμμή)</span>
        <textarea
          name="meeting_points"
          rows={3}
          defaultValue={(tour?.meeting_points ?? []).join('\n')}
          className={adminInput}
          placeholder={'Πλατεία Συντάγματος\nΣταθμός ΗΣΑΠ Πειραιά'}
        />
      </label>
      <p className="-mt-3 text-[12px] text-muted">
        Το «Σημείο συνάντησης» από πάνω εμφανίζεται στη σελίδα της εκδρομής· τα «Σημεία συνάντησης» είναι η λίστα από την
        οποία θα διαλέξει ο πελάτης κατά την κράτηση, αν συμπληρωθεί.
      </p>

      <label className="block">
        <span className={adminLabel}>Σύνδεση με εκδρομή πούλμαν (προαιρετικό)</span>
        <select name="route_id" defaultValue={tour?.route_id ?? ''} className={adminInput}>
          <option value="">— Χωρίς σύνδεση —</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{routeLabel(r)}</option>)}
        </select>
        <span className="mt-1.5 block text-[13px] text-muted">
          Αν η ίδια εκδρομή πουλάει θέσεις με αριθμό στο «Εκδρομές &amp; Πρόγραμμα», διαλέξτε την εδώ: η σελίδα θα
          στέλνει τον επισκέπτη κατευθείαν στην κράτηση θέσης. Δεν αντιγράφονται τιμές ούτε ημερομηνίες.
        </span>
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={adminLabel}>Κατάσταση</span>
          <select name="status" defaultValue={tour?.status ?? 'draft'} className={adminInput}>
            {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={adminLabel}>Σειρά εμφάνισης</span>
          <input name="sort_order" type="number" step="1" defaultValue={tour?.sort_order ?? 0} className={adminInput} />
          <span className="mt-1 block text-[12px] text-muted">
            Μικρότερος αριθμός = πιο ψηλά στη λίστα «Εκδρομές». Μεγαλύτερος αριθμός = πιο ψηλά στις «Προτεινόμενες εκδρομές» της αρχικής σελίδας.
          </span>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex items-center gap-3">
          <input type="checkbox" name="is_featured" defaultChecked={tour?.is_featured ?? false} className="h-4 w-4 accent-cta" />
          <span className="font-sans text-[14px] text-body">Προβεβλημένη (αρχική)</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="bookings_closed" defaultChecked={tour ? !tour.bookings_open : false} className="h-4 w-4 accent-cta" />
          <span className="font-sans text-[14px] text-body">Κλειστή για κρατήσεις (ορατή στο site)</span>
        </label>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <h2 className="mb-1 font-sans text-[15px] font-semibold text-primary">SEO</h2>
        <p className="mb-4 text-[12px] text-muted">Αν μείνουν κενά, χρησιμοποιούνται ο τίτλος και η σύνοψη της εκδρομής.</p>
        <div className="grid gap-4">
          <label className="block">
            <span className={adminLabel}>SEO τίτλος</span>
            <input name="seo_title" defaultValue={tour?.seo_title ?? ''} className={adminInput} />
          </label>
          <label className="block">
            <span className={adminLabel}>SEO περιγραφή</span>
            <textarea name="seo_description" rows={2} defaultValue={tour?.seo_description ?? ''} className={adminInput} />
          </label>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4">
        <Button type="submit" size="lg">Αποθήκευση</Button>
        <Link href="/admin" className="font-sans text-[14px] font-semibold text-muted hover:text-primary">Άκυρο</Link>
      </div>
    </form>
  );
}
