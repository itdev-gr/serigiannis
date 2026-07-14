'use client';
import { useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { createLead } from '@/app/(site)/actions';
import { computeBookingTotal } from '@/lib/booking';

const Schema = z.object({
  name: z.string().min(2, 'Συμπληρώστε το όνομά σας.'),
  phone: z.string().min(8, 'Συμπληρώστε ένα έγκυρο τηλέφωνο.'),
  email: z.string().email('Μη έγκυρο email.').optional().or(z.literal('')),
  date: z.string().optional(),
  seats: z.string().regex(/^\d+$/, 'Συμπληρώστε τον αριθμό θέσεων.').refine((v) => Number(v) >= 1, 'Τουλάχιστον 1 θέση.'),
  notes: z.string().optional(),
  hp: z.string().optional(),
});
type Input = z.infer<typeof Schema>;

const inputCls = 'w-full rounded-md border border-border bg-surface px-4 py-2.5 font-sans text-[15px] text-body transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] text-cta">{error}</span>}
    </label>
  );
}

export function OnlineBookingForm({
  tourId = null,
  subject = null,
  pricePerSeat = null,
  defaultDate = null,
  sourcePath,
}: {
  tourId?: string | null;
  subject?: string | null;
  pricePerSeat?: number | null;
  defaultDate?: string | null;
  sourcePath: string;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Input>({
    resolver: zodResolver(Schema),
    defaultValues: { date: defaultDate ?? '', seats: '' },
  });
  const mountedAt = useRef(Date.now());
  const seats = watch('seats') ?? '';
  const total = computeBookingTotal(seats, pricePerSeat);

  if (sent) {
    return (
      <div className="rounded-lg border border-olive/30 bg-olive/10 p-6 text-center">
        <h3 className="font-display text-2xl font-semibold text-primary">Το αίτημά σας παρελήφθη</h3>
        <p className="mt-2 text-muted">Θα επικοινωνήσουμε μαζί σας για την επιβεβαίωση της κράτησης.</p>
      </div>
    );
  }
  return (
    <form
      className="grid gap-4 rounded-lg border border-border bg-surface p-6 shadow-card"
      onSubmit={handleSubmit(async (d) => {
        setError(null);
        const message = [
          d.notes?.trim() || null,
          total != null ? `Ενδεικτικό σύνολο: ${d.seats} × ${pricePerSeat}€ = ${total}€` : null,
        ].filter(Boolean).join('\n');
        const res = await createLead({
          type: 'booking', tour_id: tourId, name: d.name, phone: d.phone,
          email: d.email || null, preferred_date: d.date || null,
          party_size: Number(d.seats),
          subject: subject ? `Κράτηση: ${subject}` : 'Online κράτηση',
          message: message || null, source_path: sourcePath,
          hp: d.hp, ts: mountedAt.current,
        });
        if (res.ok) setSent(true); else setError('Κάτι πήγε στραβά. Δοκιμάστε ξανά ή καλέστε μας.');
      })}
    >
      <input {...register('hp')} type="text" name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 opacity-0" />
      <h3 className="font-display text-2xl font-semibold text-primary">Κλείστε Online Θέση</h3>
      {subject && <p className="-mt-2 text-[14px] text-muted">{subject}</p>}
      <Field label="Ονοματεπώνυμο *" error={errors.name?.message}><input {...register('name')} className={inputCls} /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Τηλέφωνο *" error={errors.phone?.message}><input {...register('phone')} type="tel" className={inputCls} /></Field>
        <Field label="Email" error={errors.email?.message}><input {...register('email')} className={inputCls} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ημερομηνία"><input type="date" {...register('date')} className={inputCls} /></Field>
        <Field label="Θέσεις *" error={errors.seats?.message}><input type="number" min={1} inputMode="numeric" {...register('seats')} className={inputCls} /></Field>
      </div>
      {pricePerSeat != null && pricePerSeat > 0 && (
        <p className="rounded-md bg-primary/5 px-4 py-3 font-sans text-[14px] font-semibold text-primary" aria-live="polite">
          {total != null
            ? `Σύνολο: ${seats} × ${pricePerSeat}€ = ${total}€`
            : `Τιμή: ${pricePerSeat}€ / θέση`}
          <span className="ml-2 font-normal text-muted">(ενδεικτικό — επιβεβαίωση από το γραφείο)</span>
        </p>
      )}
      <Field label="Σημειώσεις"><textarea rows={3} {...register('notes')} className={inputCls} /></Field>
      {error && <p className="text-[14px] text-cta">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Αποστολή…' : 'Στείλτε αίτημα κράτησης'}</Button>
    </form>
  );
}
