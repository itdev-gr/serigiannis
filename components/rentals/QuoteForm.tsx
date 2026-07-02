'use client';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { createLead } from '@/app/(site)/actions';

const QuoteSchema = z.object({
  name: z.string().min(2, 'Παρακαλώ συμπληρώστε το όνομά σας.'),
  phone: z.string().min(8, 'Παρακαλώ συμπληρώστε ένα έγκυρο τηλέφωνο.'),
  date: z.string().min(1, 'Παρακαλώ επιλέξτε ημερομηνία.'),
  notes: z.string().optional(),
});
type QuoteInput = z.infer<typeof QuoteSchema>;

const inputCls =
  'w-full rounded-md border border-border bg-surface px-4 py-3 font-sans text-[15px] text-body placeholder:text-muted/60 transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] text-cta">{error}</span>}
    </label>
  );
}

export function QuoteForm() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<QuoteInput>({
    resolver: zodResolver(QuoteSchema),
  });
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async (data: QuoteInput) => {
    setError(null);
    const res = await createLead({
      type: 'quote',
      name: data.name,
      phone: data.phone,
      preferred_date: data.date,
      message: data.notes,
      subject: 'Αίτημα προσφοράς πούλμαν',
      source_path: '/enoikiaseis-poylman',
    });
    if (res.ok) setSent(true);
    else setError('Κάτι πήγε στραβά. Δοκιμάστε ξανά ή καλέστε μας.');
  };

  if (sent) {
    return (
      <div className="py-8 text-center">
        <h3 className="font-display text-2xl font-semibold text-primary">Το αίτημά σας παρελήφθη</h3>
        <p className="mt-3 text-muted">Θα επικοινωνήσουμε μαζί σας εντός 24 ωρών.</p>
      </div>
    );
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      <h3 className="font-display text-2xl font-semibold text-primary">Γρήγορη Προσφορά</h3>
      <Field label="Ονοματεπώνυμο" error={errors.name?.message}>
        <input {...register('name')} className={inputCls} placeholder="π.χ. Γιώργος Παπαδόπουλος" />
      </Field>
      <Field label="Τηλέφωνο" error={errors.phone?.message}>
        <input {...register('phone')} className={inputCls} placeholder="π.χ. 6900 000 000" />
      </Field>
      <Field label="Ημερομηνία" error={errors.date?.message}>
        <input type="date" {...register('date')} className={inputCls} />
      </Field>
      <Field label="Προορισμός / Σημειώσεις">
        <textarea {...register('notes')} rows={3} className={inputCls} placeholder="π.χ. Δελφοί, 30 άτομα, σχολική εκδρομή" />
      </Field>
      {error && <p className="text-[14px] text-cta">{error}</p>}
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Αποστολή…' : 'Ζητήστε Προσφορά'}
      </Button>
    </form>
  );
}
