'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { BadgeCheck, OctagonX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { validateTicket, type ValidateState } from '../../ticketing-actions';

const ERROR_TEXT: Record<string, string> = {
  not_found: 'Το εισιτήριο δεν βρέθηκε.',
  cancelled: 'Το εισιτήριο είναι ΑΚΥΡΩΜΕΝΟ.',
  already_used: 'Το εισιτήριο έχει ήδη χρησιμοποιηθεί.',
  open_return_unredeemed: 'Ανοιχτή επιστροφή: πρέπει πρώτα να οριστεί δρομολόγιο και θέση.',
  db: 'Σφάλμα συστήματος. Δοκιμάστε ξανά.',
};

type TicketInfo = {
  code?: string;
  passenger_name?: string;
  seat_no?: string | null;
  fare_name?: string;
  validated_at?: string | null;
  trip?: { service_date: string; time: string; origin: string; destination: string } | null;
};

export default function ValidatePage() {
  const [state, formAction, pending] = useActionState<ValidateState, FormData>(validateTicket, null);
  const result = state?.result as { ok: boolean; error?: string; ticket?: TicketInfo } | undefined;

  return (
    <div className="max-w-xl">
      <p className="mb-2 text-[13px]"><Link href="/admin/orders" className="text-muted hover:text-primary">← Εισιτήρια</Link></p>
      <h1 className="font-display text-4xl font-semibold text-primary">Επικύρωση Εισιτηρίου</h1>
      <p className="mt-2 text-[14px] text-muted">
        Πληκτρολογήστε (ή σκανάρετε) τον κωδικό του εισιτηρίου κατά την επιβίβαση.
      </p>

      <form action={formAction} className="mt-6 flex gap-3">
        <input
          name="code"
          autoFocus
          autoComplete="off"
          placeholder="π.χ. X6UQZQC3"
          className="grow rounded-md border border-border bg-surface px-4 py-3 font-mono text-xl uppercase tracking-[0.2em] text-body focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
        />
        <Button type="submit" size="lg" disabled={pending}>{pending ? '…' : 'Έλεγχος'}</Button>
      </form>

      {result && (
        <div
          className={`mt-8 rounded-lg border p-6 text-center ${
            result.ok ? 'border-olive/40 bg-olive/10' : 'border-cta/40 bg-cta/5'
          }`}
          aria-live="polite"
        >
          {result.ok ? (
            <BadgeCheck className="mx-auto mb-3 h-14 w-14 text-olive" />
          ) : (
            <OctagonX className="mx-auto mb-3 h-14 w-14 text-cta" />
          )}
          <p className="font-display text-2xl font-semibold text-body">
            {result.ok ? 'ΕΓΚΥΡΟ. Καλό ταξίδι!' : ERROR_TEXT[result.error ?? 'db'] ?? ERROR_TEXT.db}
          </p>
          {result.ticket && (
            <div className="mt-4 text-[15px] text-body">
              <p className="font-semibold">{result.ticket.passenger_name}</p>
              {result.ticket.trip && (
                <p className="text-muted">
                  {result.ticket.trip.origin} → {result.ticket.trip.destination}
                  {' · '}{new Date(`${result.ticket.trip.service_date}T12:00:00`).toLocaleDateString('el-GR')}
                  {' · '}{result.ticket.trip.time}
                  {' · '}Θέση {result.ticket.seat_no}
                </p>
              )}
              <p className="mt-1 font-mono text-[13px] text-muted">{result.ticket.code} · {result.ticket.fare_name}</p>
              {!result.ok && result.ticket.validated_at && (
                <p className="mt-1 text-[13px] text-cta">
                  Επικυρώθηκε: {new Date(result.ticket.validated_at).toLocaleString('el-GR')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
