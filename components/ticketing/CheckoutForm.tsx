'use client';
import { useMemo, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { FarePricesDialog } from '@/components/ticketing/FarePricesDialog';
import { HoldCountdown } from '@/components/ticketing/HoldCountdown';
import { cancelCheckout, submitCheckout } from '@/app/(site)/eisitiria/actions';
import { KIND_LABEL, farePriceForKind, formatCents } from '@/lib/ticketing';
import type { OrderBundle, OrderFare, TripKind } from '@/types/ticketing';

const REGIONS = [
  'Αττική', 'Κεντρική Μακεδονία', 'Δυτική Μακεδονία', 'Ανατολική Μακεδονία και Θράκη', 'Ήπειρος',
  'Θεσσαλία', 'Ιόνια Νησιά', 'Δυτική Ελλάδα', 'Στερεά Ελλάδα', 'Πελοπόννησος',
  'Βόρειο Αιγαίο', 'Νότιο Αιγαίο', 'Κρήτη', 'Εξωτερικό',
];

const ERROR_TEXT: Record<string, string> = {
  order_expired: 'Η δέσμευση των θέσεων έληξε. Ξεκινήστε νέα κράτηση.',
  invalid_billing: 'Ελέγξτε τα στοιχεία χρέωσης.',
  terms_required: 'Πρέπει να αποδεχθείτε τους όρους χρήσης.',
  invalid_fare: 'Μη έγκυρος τύπος εισιτηρίου.',
  invalid_passenger_name: 'Συμπληρώστε ονοματεπώνυμο για κάθε επιβάτη.',
  hold_lost: 'Η δέσμευση των θέσεων χάθηκε. Ξεκινήστε νέα κράτηση.',
  payment_init: 'Η σύνδεση με την τράπεζα απέτυχε. Δοκιμάστε ξανά.',
  db: 'Κάτι πήγε στραβά. Δοκιμάστε ξανά.',
};

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

function buildSchema(passengerCount: number) {
  return z.object({
    customer_name: z.string().min(2, 'Συμπληρώστε ονοματεπώνυμο.'),
    email: z.string().email('Μη έγκυρο email.'),
    phone: z.string().min(8, 'Συμπληρώστε ένα έγκυρο τηλέφωνο.'),
    address: z.string().min(2, 'Συμπληρώστε διεύθυνση.'),
    city: z.string().min(2, 'Συμπληρώστε πόλη.'),
    postal_code: z.string().min(4, 'Συμπληρώστε Τ.Κ.'),
    region: z.string().min(2, 'Επιλέξτε περιφέρεια.'),
    marketing_opt_in: z.boolean().optional(),
    accept_terms: z.literal(true, { errorMap: () => ({ message: 'Απαιτείται αποδοχή των όρων.' }) }),
    passengers: z
      .array(
        z.object({
          passenger_name: z.string().min(2, 'Συμπληρώστε ονοματεπώνυμο επιβάτη.'),
          fare_type_id: z.string().min(1, 'Επιλέξτε τύπο εισιτηρίου.'),
        })
      )
      .length(passengerCount),
  });
}
type CheckoutFields = z.infer<ReturnType<typeof buildSchema>>;

export function CheckoutForm({ bundle, token, offline }: { bundle: Extract<OrderBundle, { ok: true }>; token: string; offline: boolean }) {
  const { order, legs, fares } = bundle;
  const kind = order.kind as TripKind;

  const outboundLeg = legs.find((l) => l.leg === 'outbound')!;
  const returnLeg = legs.find((l) => l.leg === 'return');
  const numeric = (s: string) => Number(s.replace(/\D/g, '')) || 0;
  const outSeats = [...outboundLeg.seats].sort((a, b) => numeric(a) - numeric(b));
  const retSeats = returnLeg ? [...returnLeg.seats].sort((a, b) => numeric(a) - numeric(b)) : [];

  const schema = useMemo(() => buildSchema(outSeats.length), [outSeats.length]);
  const defaultFare = fares.find((f) => f.is_default) ?? fares[0];
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<CheckoutFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      marketing_opt_in: false,
      passengers: outSeats.map(() => ({ passenger_name: '', fare_type_id: defaultFare?.id ?? '' })),
    },
  });

  const chosen = watch('passengers');
  const fareById = new Map<string, OrderFare>(fares.map((f) => [f.id, f]));
  const total = (chosen ?? []).reduce((sum, p) => {
    const fare = p?.fare_type_id ? fareById.get(p.fare_type_id) : undefined;
    return sum + (fare ? farePriceForKind(fare, kind) : 0);
  }, 0);

  return (
    <form
      className="grid gap-8"
      onSubmit={handleSubmit((d) => {
        setError(null);
        startTransition(async () => {
          const res = await submitCheckout({
            orderId: order.id,
            token,
            billing: {
              customer_name: d.customer_name,
              email: d.email,
              phone: d.phone,
              address: d.address,
              city: d.city,
              postal_code: d.postal_code,
              region: d.region,
              marketing_opt_in: !!d.marketing_opt_in,
              accept_terms: true,
            },
            passengers: d.passengers.map((p, i) => ({
              passenger_name: p.passenger_name,
              fare_type_id: p.fare_type_id,
              outbound_seat: outSeats[i],
              return_seat: kind === 'round' ? retSeats[i] : undefined,
            })),
          });
          if (res && !res.ok) setError(ERROR_TEXT[res.error] ?? ERROR_TEXT.db);
        });
      })}
    >
      {order.expires_at && <HoldCountdown expiresAt={order.expires_at} />}

      <section className="rounded-lg border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-5 border-b border-border pb-3 font-display text-2xl font-semibold text-body">Στοιχεία Χρέωσης</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Ονοματεπώνυμο *" error={errors.customer_name?.message}><input {...register('customer_name')} className={inputCls} /></Field>
          <Field label="Email *" error={errors.email?.message}><input {...register('email')} type="email" className={inputCls} /></Field>
          <Field label="Τηλέφωνο *" error={errors.phone?.message}><input {...register('phone')} type="tel" className={inputCls} /></Field>
          <Field label="Διεύθυνση *" error={errors.address?.message}><input {...register('address')} className={inputCls} /></Field>
          <Field label="Πόλη *" error={errors.city?.message}><input {...register('city')} className={inputCls} /></Field>
          <Field label="Ταχυδρομικός Κώδικας *" error={errors.postal_code?.message}><input {...register('postal_code')} className={inputCls} /></Field>
          <Field label="Περιφέρεια *" error={errors.region?.message}>
            <select {...register('region')} className={inputCls}>
              <option value="">— Επιλέξτε —</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>
        <label className="mt-5 flex items-center gap-2 text-[14px] text-muted">
          <input type="checkbox" {...register('marketing_opt_in')} className="h-4 w-4 rounded border-border" />
          Να ενημερώνομαι για προσφορές εισιτηρίων
        </label>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-card">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <h2 className="font-display text-2xl font-semibold text-body">Επιβάτες και Τύποι Εισιτηρίων</h2>
          <FarePricesDialog fares={fares} />
        </div>
        <div className="grid gap-5">
          {outSeats.map((seat, i) => (
            <div key={seat} className="grid items-start gap-4 sm:grid-cols-[110px_1fr_1fr]">
              <div>
                <span className="block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">Θέση</span>
                <span className="mt-1 block font-display text-2xl font-semibold text-body">
                  {seat}
                  {kind === 'round' && retSeats[i] && (
                    <span className="block text-[13px] font-normal text-muted">Επιστρ.: {retSeats[i]}</span>
                  )}
                </span>
              </div>
              <Field label="Ον/νυμο επιβάτη *" error={errors.passengers?.[i]?.passenger_name?.message}>
                <input {...register(`passengers.${i}.passenger_name`)} className={inputCls} />
              </Field>
              <Field label="Τύπος εισιτηρίου *" error={errors.passengers?.[i]?.fare_type_id?.message}>
                <select {...register(`passengers.${i}.fare_type_id`)} className={inputCls}>
                  {fares.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {formatCents(farePriceForKind(f, kind))}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-card">
        <h2 className="mb-5 border-b border-border pb-3 font-display text-2xl font-semibold text-body">Δρομολόγιο</h2>
        {legs.map((leg) => (
          <p key={leg.leg} className="mb-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[15px] text-body">
            <span className="font-semibold uppercase text-[13px] tracking-[0.08em] text-primary">
              {leg.leg === 'outbound' ? 'Αναχώρηση' : 'Επιστροφή'}:
            </span>
            <span>{leg.origin} → {leg.destination}</span>
            <span>{new Date(`${leg.service_date}T12:00:00`).toLocaleDateString('el-GR')}</span>
            <span>{leg.time}</span>
            <span className="text-muted">Θέσεις: {leg.seats.join(', ')}</span>
          </p>
        ))}
        {kind === 'open_return' && (
          <p className="mt-2 text-[14px] text-muted">
            + Ανοιχτή επιστροφή (χωρίς καθορισμένο δρομολόγιο — ισχύει για 3 μήνες)
          </p>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-[15px] text-muted">
            {KIND_LABEL[kind]} · Αριθμός εισιτηρίων: {outSeats.length}
          </span>
          <span className="font-display text-3xl font-bold text-primary" aria-live="polite">{formatCents(total)}</span>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-6 shadow-card">
        <label className="flex items-start gap-3 text-[14px] text-body">
          <input type="checkbox" {...register('accept_terms')} className="mt-1 h-4 w-4 rounded border-border" />
          <span>
            Αποδέχομαι τους <Link href="/oroi" target="_blank" className="font-medium text-primary underline">όρους χρήσης</Link> και
            την πολιτική ακυρώσεων/επιστροφών.
          </span>
        </label>
        {errors.accept_terms && <p className="mt-2 text-[13px] text-cta">{errors.accept_terms.message}</p>}
        <p className="mt-4 rounded-md bg-primary/5 px-4 py-3 text-[13px] leading-relaxed text-muted">
          {offline
            ? 'Με την ολοκλήρωση της κράτησης εκδίδονται τα εισιτήριά σας και εξοφλούνται στο γραφείο μας ή στο λεωφορείο πριν την αναχώρηση. Θα λάβετε email με τους κωδικούς των εισιτηρίων σας.'
            : 'Πρόκειται να μεταβείτε στο ασφαλές περιβάλλον πληρωμών. Μετά την ολοκλήρωση της πληρωμής σας μην κλείσετε τον περιηγητή σας — θα επιστρέψετε αυτόματα για την έκδοση των εισιτηρίων σας.'}
        </p>
      </section>

      {error && <p className="rounded-md border border-cta/30 bg-cta/5 px-4 py-3 text-center text-[14px] text-cta">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          className="text-[14px] font-medium text-muted hover:text-cta"
          onClick={() => startTransition(() => cancelCheckout(order.id, token))}
        >
          Ακύρωση κράτησης
        </button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Επεξεργασία…' : offline ? 'Ολοκλήρωση κράτησης' : 'Πληρωμή'}
        </Button>
      </div>
    </form>
  );
}
