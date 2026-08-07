'use client';
import { useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { createLead } from '@/app/(site)/actions';

const Schema = z.object({
  name: z.string().min(2, 'Συμπληρώστε το όνομά σας.'),
  phone: z.string().min(8, 'Συμπληρώστε ένα έγκυρο τηλέφωνο.'),
  email: z.string().email('Μη έγκυρο email.').optional().or(z.literal('')),
  route: z.string().min(2, 'Πείτε μας πού θέλετε να πάτε.'),
  date: z.string().optional(),
  people: z.string().optional(),
  notes: z.string().optional(),
  hp: z.string().optional(),
});
type Input = z.infer<typeof Schema>;

const inputCls =
  'w-full rounded-md border border-border bg-surface px-4 py-2.5 font-sans text-[15px] text-body transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] text-cta">{error}</span>}
    </label>
  );
}

/** Φόρμα ενδιαφέροντος για ενοικίαση πούλμαν — γράφει lead τύπου `quote`
 *  («Προσφορά Πούλμαν» στο email του γραφείου, «Προσφορά» στο admin). */
export function PoylmanQuoteForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Input>({
    resolver: zodResolver(Schema),
  });
  // Το createLead αγνοεί σιωπηλά υποβολές κάτω από 1,5″ από το mount (anti-spam).
  const mountedAt = useRef(Date.now());

  if (sent) {
    return (
      <div className="rounded-lg border border-olive/30 bg-olive/10 p-6 text-center">
        <h3 className="font-display text-2xl font-semibold text-primary">Το αίτημά σας παρελήφθη</h3>
        <p className="mt-2 text-muted">Θα επικοινωνήσουμε μαζί σας με προσφορά.</p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-4 rounded-lg border border-border bg-surface p-6 shadow-card"
      onSubmit={handleSubmit(async (d) => {
        setError(null);
        const res = await createLead({
          type: 'quote',
          name: d.name,
          phone: d.phone,
          email: d.email || null,
          subject: `Ενοικίαση πούλμαν: ${d.route.trim()}`,
          preferred_date: d.date || null,
          party_size: d.people ? Number(d.people) : null,
          message: d.notes?.trim() || null,
          source_path: '/enoikiaseis-poylman',
          hp: d.hp,
          ts: mountedAt.current,
        });
        if (res.ok) setSent(true);
        else setError('Κάτι πήγε στραβά. Δοκιμάστε ξανά ή καλέστε μας.');
      })}
    >
      <input {...register('hp')} type="text" name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 opacity-0" />
      <h2 className="font-display text-2xl font-semibold text-primary">Ζητήστε προσφορά</h2>
      <p className="-mt-2 text-[14px] text-muted">Πείτε μας τη διαδρομή και σας στέλνουμε τιμή αυθημερόν.</p>

      <Field label="Ονοματεπώνυμο *" error={errors.name?.message}>
        <input {...register('name')} autoComplete="name" className={inputCls} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Τηλέφωνο *" error={errors.phone?.message}>
          <input {...register('phone')} type="tel" autoComplete="tel" className={inputCls} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <input {...register('email')} type="email" autoComplete="email" className={inputCls} />
        </Field>
      </div>
      <Field label="Διαδρομή / Προορισμός *" error={errors.route?.message}>
        <input {...register('route')} placeholder="π.χ. Αθήνα → Δελφοί, με επιστροφή" className={inputCls} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ημερομηνία">
          <input type="date" {...register('date')} className={inputCls} />
        </Field>
        <Field label="Άτομα">
          <input type="number" min={1} inputMode="numeric" {...register('people')} className={inputCls} />
        </Field>
      </div>
      <Field label="Μήνυμα">
        <textarea rows={3} {...register('notes')} placeholder="Ώρα αναχώρησης, στάσεις, ειδικές ανάγκες…" className={inputCls} />
      </Field>

      {error && <p className="text-[14px] text-cta">{error}</p>}
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Αποστολή…' : 'Αποστολή αιτήματος'}
      </Button>
    </form>
  );
}
