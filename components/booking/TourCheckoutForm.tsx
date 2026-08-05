'use client';
import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { cancelTourBooking, submitTourCheckout } from '@/app/(site)/kratisi/actions';
import type { TourOrder } from '@/types/db';

const ERROR_TEXT: Record<string, string> = {
  order_not_found: 'Η κράτηση δεν βρέθηκε.',
  order_expired: 'Η κράτηση έληξε. Ξεκινήστε ξανά από τη σελίδα της εκδρομής.',
  order_not_payable: 'Η κράτηση δεν μπορεί να πληρωθεί. Επικοινωνήστε μαζί μας.',
  invalid_customer: 'Ελέγξτε τα στοιχεία επικοινωνίας.',
  terms_required: 'Πρέπει να αποδεχθείτε τους όρους κράτησης.',
  payment_init: 'Η σύνδεση με την τράπεζα απέτυχε. Δοκιμάστε ξανά.',
  db: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά ή καλέστε μας.',
};

const PassengerSchema = z.object({
  name: z.string().min(2, 'Συμπληρώστε ονοματεπώνυμο.'),
  phone: z.string().optional(),
});

const Schema = z.object({
  customer_name: z.string().min(2, 'Συμπληρώστε ονοματεπώνυμο.'),
  email: z.string().email('Μη έγκυρο email.'),
  phone: z.string().min(8, 'Συμπληρώστε ένα έγκυρο τηλέφωνο.'),
  notes: z.string().optional(),
  marketing_opt_in: z.boolean().optional(),
  accept_terms: z.literal(true, { errorMap: () => ({ message: 'Απαιτείται αποδοχή των όρων.' }) }),
  passengers: z.array(PassengerSchema),
});
type Fields = z.infer<typeof Schema>;

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

/** One label per person, in item order («Το άτομο σε δίκλινο 1», «Παιδί 1»…), falling
 *  back to «Ταξιδιώτης N» from party_size if the order carries no items snapshot. */
function passengerLabels(order: TourOrder): string[] {
  const labels: string[] = [];
  for (const item of order.items ?? []) {
    for (let i = 1; i <= item.qty; i++) labels.push(`${item.label} ${i}`);
  }
  if (labels.length === 0) {
    for (let i = 1; i <= Math.max(order.party_size, 0); i++) labels.push(`Ταξιδιώτης ${i}`);
  }
  return labels;
}

export function TourCheckoutForm({ order, token, offline }: { order: TourOrder; token: string; offline: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const labels = useMemo(() => passengerLabels(order), [order]);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(Schema),
    defaultValues: {
      marketing_opt_in: false,
      passengers: labels.map(() => ({ name: '', phone: '' })),
    },
  });

  return (
    <form
      className="grid gap-5 rounded-lg border border-border bg-surface p-6 shadow-card sm:p-8"
      onSubmit={handleSubmit((d) => {
        setError(null);
        startTransition(async () => {
          const res = await submitTourCheckout({
            orderId: order.id,
            token,
            customer: {
              customer_name: d.customer_name,
              email: d.email,
              phone: d.phone,
              notes: d.notes,
              marketing_opt_in: !!d.marketing_opt_in,
              accept_terms: true,
              passengers: d.passengers.map((p) => ({ name: p.name.trim(), phone: p.phone?.trim() || null })),
            },
          });
          if (res && !res.ok) setError(ERROR_TEXT[res.error] ?? ERROR_TEXT.db);
        });
      })}
    >
      <h2 className="font-display text-2xl font-semibold text-primary">Στοιχεία επικοινωνίας</h2>
      <Field label="Ονοματεπώνυμο *" error={errors.customer_name?.message}>
        <input {...register('customer_name')} className={inputCls} autoComplete="name" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email *" error={errors.email?.message}>
          <input {...register('email')} type="email" className={inputCls} autoComplete="email" />
        </Field>
        <Field label="Τηλέφωνο *" error={errors.phone?.message}>
          <input {...register('phone')} type="tel" className={inputCls} autoComplete="tel" />
        </Field>
      </div>
      <Field label="Σημειώσεις">
        <textarea rows={3} {...register('notes')} className={inputCls} placeholder="π.χ. σημείο επιβίβασης, ειδικές ανάγκες" />
      </Field>

      {labels.length > 0 && (
        <div className="grid gap-4">
          <h2 className="font-display text-2xl font-semibold text-primary">Στοιχεία ταξιδιωτών</h2>
          <div className="grid gap-4">
            {labels.map((label, i) => (
              <div key={i} className="rounded-md border border-border/70 bg-background/50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-primary">{label}</span>
                  {i === 0 && (
                    <button
                      type="button"
                      onClick={() => setValue('passengers.0.name', getValues('customer_name'), { shouldValidate: true })}
                      className="font-sans text-[12px] font-medium text-primary underline hover:text-cta"
                    >
                      Ίδιος με τον υπεύθυνο κράτησης
                    </button>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ονοματεπώνυμο *" error={errors.passengers?.[i]?.name?.message}>
                    <input {...register(`passengers.${i}.name` as const)} className={inputCls} autoComplete="off" />
                  </Field>
                  <Field label="Τηλέφωνο">
                    <input {...register(`passengers.${i}.phone` as const)} type="tel" className={inputCls} autoComplete="off" />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-start gap-3 text-[14px] text-body">
        <input type="checkbox" {...register('marketing_opt_in')} className="mt-1 h-4 w-4 accent-primary" />
        <span>Θέλω να λαμβάνω ενημερώσεις για νέες εκδρομές.</span>
      </label>
      <label className="flex items-start gap-3 text-[14px] text-body">
        <input type="checkbox" {...register('accept_terms')} className="mt-1 h-4 w-4 accent-primary" />
        <span>
          Αποδέχομαι τους{' '}
          <Link href="/oroi-proypotheseis" target="_blank" className="font-semibold text-primary underline">
            όρους & προϋποθέσεις
          </Link>{' '}
          και την{' '}
          <Link href="/politiki-aporritou" target="_blank" className="font-semibold text-primary underline">
            πολιτική απορρήτου
          </Link>
          . *
        </span>
      </label>
      {errors.accept_terms && <span className="-mt-3 block text-[13px] text-cta">{errors.accept_terms.message}</span>}

      {error && <p className="rounded-md bg-cta/5 px-4 py-3 font-sans text-[14px] text-cta">{error}</p>}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Παρακαλώ περιμένετε…' : offline ? 'Ολοκλήρωση κράτησης' : 'Πληρωμή με κάρτα'}
      </Button>
      <p className="text-center font-sans text-[13px] text-muted">
        {offline
          ? 'Θα επικοινωνήσουμε μαζί σας για την εξόφληση.'
          : 'Θα μεταφερθείτε στην ασφαλή σελίδα πληρωμής της τράπεζας.'}
      </p>
      <button
        type="button"
        onClick={() => startTransition(async () => { await cancelTourBooking(order.id, token, order.tour_slug); })}
        className="mx-auto font-sans text-[13px] text-muted underline hover:text-primary"
        disabled={pending}
      >
        Ακύρωση κράτησης
      </button>
    </form>
  );
}
