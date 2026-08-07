'use client';
import { useMemo, useState, useTransition, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { cancelTourBooking, submitTourCheckout } from '@/app/(site)/kratisi/actions';
import { passengerLabels } from '@/lib/booking';
import type { TourOrder } from '@/types/db';

const ERROR_TEXT: Record<string, string> = {
  order_not_found: 'Η κράτηση δεν βρέθηκε.',
  order_expired: 'Η κράτηση έληξε. Ξεκινήστε ξανά από τη σελίδα της εκδρομής.',
  order_not_payable: 'Η κράτηση δεν μπορεί να πληρωθεί. Επικοινωνήστε μαζί μας.',
  invalid_customer: 'Ελέγξτε τα στοιχεία επικοινωνίας.',
  terms_required: 'Πρέπει να αποδεχθείτε τους όρους κράτησης.',
  invalid_meeting_point: 'Επιλέξτε έγκυρο σημείο επιβίβασης για κάθε ταξιδιώτη.',
  passenger_count_mismatch: 'Συμπληρώστε τα στοιχεία όλων των ταξιδιωτών.',
  payment_init: 'Η σύνδεση με την τράπεζα απέτυχε. Δοκιμάστε ξανά.',
  db: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά ή καλέστε μας.',
};

/** Το σημείο επιβίβασης απαιτείται ΑΝΑ ταξιδιώτη, και μόνο όταν η εκδρομή
 *  έχει ορισμένα σημεία — εκδρομή χωρίς κανένα δεν επιβάλλει επιλογή. */
export function buildTourCheckoutSchema(requireMeetingPoint: boolean) {
  const passenger = z.object({
    name: z.string().min(2, 'Συμπληρώστε ονοματεπώνυμο.'),
    phone: z.string().optional(),
    meeting_point: requireMeetingPoint
      ? z.string().min(1, 'Επιλέξτε σημείο επιβίβασης.')
      : z.string().optional(),
  });
  return z.object({
    customer_name: z.string().min(2, 'Συμπληρώστε ονοματεπώνυμο.'),
    email: z.string().email('Μη έγκυρο email.'),
    phone: z.string().min(8, 'Συμπληρώστε ένα έγκυρο τηλέφωνο.'),
    notes: z.string().optional(),
    marketing_opt_in: z.boolean().optional(),
    accept_terms: z.literal(true, { errorMap: () => ({ message: 'Απαιτείται αποδοχή των όρων.' }) }),
    passengers: z.array(passenger),
  });
}
type Fields = z.infer<ReturnType<typeof buildTourCheckoutSchema>>;

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

export function TourCheckoutForm({
  order,
  token,
  offline,
  meetingPoints,
}: {
  order: TourOrder;
  token: string;
  offline: boolean;
  /** The tour's configured meeting points. Empty (the default for most
   *  tours) means no picker is shown and none is required. */
  meetingPoints: string[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const labels = useMemo(() => passengerLabels(order), [order]);
  const schema = useMemo(() => buildTourCheckoutSchema(meetingPoints.length > 0), [meetingPoints.length]);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      marketing_opt_in: false,
      passengers: labels.map(() => ({
        name: '',
        phone: '',
        // Με ένα μόνο σημείο δεν υπάρχει τίποτα να διαλέξεις — προεπιλέγεται.
        meeting_point: meetingPoints.length === 1 ? meetingPoints[0] : '',
      })),
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
              passengers: d.passengers.map((p) => ({
                name: p.name.trim(),
                phone: p.phone?.trim() || null,
                meeting_point: p.meeting_point || null,
              })),
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
        <textarea rows={3} {...register('notes')} className={inputCls} placeholder="π.χ. ειδικές ανάγκες, αλλεργίες" />
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
                {meetingPoints.length > 0 && (
                  <div className="mt-4">
                    <Field label="Σημείο επιβίβασης *" error={errors.passengers?.[i]?.meeting_point?.message}>
                      <select
                        className={inputCls}
                        {...register(`passengers.${i}.meeting_point` as const, i === 0 ? {
                          // Ευκολία: η επιλογή του 1ου προσυμπληρώνει όσους
                          // δεν έχουν διαλέξει ακόμη· καθένας μένει επεξεργάσιμος.
                          onChange: (e) => {
                            const v = (e.target as HTMLSelectElement).value;
                            getValues('passengers').forEach((p, j) => {
                              if (j > 0 && !p.meeting_point) {
                                setValue(`passengers.${j}.meeting_point`, v, { shouldValidate: false });
                              }
                            });
                          },
                        } : undefined)}
                      >
                        <option value="">— Επιλέξτε σημείο —</option>
                        {meetingPoints.map((point) => (
                          <option key={point} value={point}>
                            {point}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}
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
