'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Category, Tour } from '@/types/db';
import type { AdminRoute } from '@/lib/queries/ticketing';
import { routeLabel } from '@/lib/ticketing';
import { Button } from '@/components/ui/Button';
import { adminInput, adminLabel } from '@/components/admin/ui';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { slugify, slugNeedsCleanup } from '@/lib/excursions';

const STATUSES = [
  { v: 'published', l: 'Δημοσιευμένη' },
  { v: 'draft', l: 'Πρόχειρη' },
  { v: 'hidden', l: 'Κρυμμένη' },
  { v: 'archived', l: 'Αρχειοθετημένη' },
];

export type TourFormPresets = {
  meeting_points: string[];
  included: string[];
  not_included: string[];
};

/** Λίστα με έτοιμες γραμμές (checkboxes, καρτέλα «Έτοιμα κείμενα») συν
 *  textarea για έκτακτες γραμμές της συγκεκριμένης εκδρομής. Ο server ενώνει
 *  τα δύο στο ίδιο text[] πεδίο που είχε πάντα η εκδρομή. */
function PresetPicker({
  label,
  hint,
  name,
  presets,
  current,
  placeholder,
}: {
  label: string;
  hint: string;
  name: string;
  presets: string[];
  current: string[];
  placeholder?: string;
}) {
  const presetSet = new Set(presets);
  const extra = current.filter((v) => !presetSet.has(v));
  return (
    <fieldset className="block">
      <legend className={adminLabel}>{label}</legend>
      {presets.length > 0 && (
        <div className="mt-1 grid gap-2 rounded-md border border-border bg-surface px-4 py-3">
          {presets.map((p) => (
            <label key={p} className="flex items-start gap-2.5 text-[14px] text-body">
              <input
                type="checkbox"
                name={`${name}_preset`}
                value={p}
                defaultChecked={current.includes(p)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              {p}
            </label>
          ))}
        </div>
      )}
      <textarea
        name={name}
        rows={2}
        defaultValue={extra.join('\n')}
        className={`${adminInput} mt-2`}
        placeholder={placeholder ?? 'Έξτρα γραμμές μόνο για αυτή την εκδρομή (μία ανά γραμμή)'}
      />
      <span className="mt-1 block text-[12px] text-muted">{hint}</span>
    </fieldset>
  );
}

export function TourForm({
  tour,
  categories,
  routes = [],
  presets,
  action,
}: {
  tour?: Tour | null;
  categories: Category[];
  routes?: AdminRoute[];
  presets?: TourFormPresets;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const isNew = !tour?.id;
  // Οι κατηγορίες είναι πολλαπλές: 20 εκδρομές έχουν ήδη πάνω από μία. Ένα
  // μονό select έσβηνε σιωπηλά τις υπόλοιπες σε κάθε αποθήκευση.
  const currentCats = new Set((tour?.categories ?? []).map((c) => c.slug));
  const defaultCats = currentCats.size > 0 ? currentCats : new Set([categories[0]?.slug].filter(Boolean));

  // New tours: the slug tracks the title live until the clerk edits it
  // themselves — then their choice wins. Existing tours: the slug is never
  // rewritten automatically; we only warn and offer a one-click fix.
  const [slug, setSlug] = useState(tour?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(false);
  const [catError, setCatError] = useState(false);

  const cleanSlug = slugify(slug);
  const showSlugWarning = !isNew && slugNeedsCleanup(slug);

  return (
    <form
      action={action}
      className="grid max-w-2xl gap-5"
      onSubmit={(e) => {
        // Χωρίς καμία κατηγορία η εκδρομή δεν φαίνεται σε κανένα φίλτρο του
        // καταλόγου — μπλοκάρουμε την υποβολή πριν φτάσει στον server.
        if (!e.currentTarget.querySelector('input[name="category"]:checked')) {
          e.preventDefault();
          setCatError(true);
        }
      }}
    >
      {tour?.id && <input type="hidden" name="id" value={tour.id} />}
      <input type="hidden" name="category_sync" value="1" />

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
        <span className={adminLabel}>Σύντομη περιγραφή</span>
        <textarea name="short_description" rows={3} defaultValue={tour?.short_description ?? ''} className={adminInput} />
        <span className="mt-1 block text-[12px] text-muted">2–3 προτάσεις· εμφανίζεται κάτω από τον τίτλο στη σελίδα της εκδρομής και στις κάρτες του καταλόγου (έως 3 γραμμές).</span>
      </label>

      <div className="block">
        <span className={adminLabel}>Περιγραφή</span>
        <RichTextEditor name="summary" defaultValue={tour?.summary ?? ''} minHeight={160} />
        <span className="mt-1 block text-[12px] text-muted">
          Εμφανίζεται στην ενότητα «Περιγραφή» πιο κάτω στη σελίδα. Με τη μπάρα βάζετε έντονα, λίστες και χρώμα.
        </span>
      </div>

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
      </div>

      <fieldset className="block">
        <legend className={adminLabel}>Κατηγορίες</legend>
        <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2 rounded-md border border-border bg-surface px-4 py-3">
          {categories.map((c) => (
            <label key={c.slug} className="flex items-center gap-2 text-[14px] text-body">
              <input
                type="checkbox"
                name="category"
                value={c.slug}
                defaultChecked={defaultCats.has(c.slug)}
                onChange={() => setCatError(false)}
                className="h-4 w-4 accent-primary"
              />
              {c.name_el}
            </label>
          ))}
        </div>
        <span className="mt-1 block text-[12px] text-muted">
          Η εκδρομή εμφανίζεται σε όλες τις επιλεγμένες κατηγορίες του καταλόγου. Η πρώτη επιλεγμένη είναι η κύρια.
        </span>
        {catError && (
          <p className="mt-1 text-[12px] font-semibold text-cta">
            Επιλέξτε τουλάχιστον μία κατηγορία — αλλιώς η εκδρομή δεν θα εμφανίζεται στα φίλτρα του καταλόγου.
          </p>
        )}
      </fieldset>

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

      <PresetPicker
        label="Σημεία συνάντησης"
        name="meeting_points"
        presets={presets?.meeting_points ?? []}
        current={tour?.meeting_points ?? []}
        placeholder={'Έξτρα σημεία μόνο για αυτή την εκδρομή (ένα ανά γραμμή)\nπ.χ. Πλατεία Συντάγματος'}
        hint="Το «Σημείο συνάντησης» από πάνω εμφανίζεται στη σελίδα της εκδρομής· από αυτή τη λίστα διαλέγει ο πελάτης κατά την κράτηση. Τη λίστα με τα τσεκ τη διαχειρίζεστε στην καρτέλα «Έτοιμα κείμενα»."
      />

      <label className="block">
        <span className={adminLabel}>Τι θα δείτε (ένα ανά γραμμή)</span>
        <textarea
          name="highlights"
          rows={4}
          defaultValue={(tour?.highlights ?? []).join('\n')}
          className={adminInput}
          placeholder={'Ξενάγηση στον αρχαιολογικό χώρο\nΕλεύθερος χρόνος στη λίμνη'}
        />
        <span className="mt-1 block text-[12px] text-muted">
          Τα βασικά σημεία της εκδρομής, με τη σειρά που τα βλέπει ο ταξιδιώτης. Εμφανίζονται πάνω από την περιγραφή.
        </span>
      </label>

      <PresetPicker
        label="Περιλαμβάνονται"
        name="included"
        presets={presets?.included ?? []}
        current={tour?.included ?? []}
        hint="Ό,τι καλύπτει η τιμή της εκδρομής. Τσεκάρετε τα έτοιμα κείμενα που ισχύουν — τα διαχειρίζεστε στην καρτέλα «Έτοιμα κείμενα»."
      />

      <PresetPicker
        label="Δεν περιλαμβάνονται"
        name="not_included"
        presets={presets?.not_included ?? []}
        current={tour?.not_included ?? []}
        hint="Ό,τι πληρώνει ο ταξιδιώτης χωριστά. Βοηθά να μη γίνονται παρεξηγήσεις την ημέρα της εκδρομής."
      />

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
            Μικρότερος αριθμός = πιο ψηλά στη λίστα «Εκδρομές»· με ίδιο αριθμό, οι νεότερες εκδρομές βγαίνουν πρώτες. Μεγαλύτερος αριθμός = πιο ψηλά στις «Προτεινόμενες εκδρομές» της αρχικής σελίδας.
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
        <Link href="/admin/tours" className="font-sans text-[14px] font-semibold text-muted hover:text-primary">Άκυρο</Link>
      </div>
    </form>
  );
}
