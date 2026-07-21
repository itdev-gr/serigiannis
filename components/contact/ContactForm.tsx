'use client';
import { useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createLead } from '@/app/(site)/actions';

const ContactSchema = z.object({
  name: z.string().min(2, 'Παρακαλώ συμπληρώστε το όνομά σας.'),
  email: z.string().email('Μη έγκυρη διεύθυνση email.'),
  phone: z.string().min(8, 'Παρακαλώ συμπληρώστε το τηλέφωνό σας.'),
  subject: z.string().min(2, 'Παρακαλώ γράψτε ένα θέμα.'),
  message: z.string().optional(),
  hp: z.string().optional(),
});
type ContactInput = z.infer<typeof ContactSchema>;

const inputCls =
  'w-full rounded-md border border-border bg-background px-4 py-3 font-sans text-[15px] text-body placeholder:text-muted/50 transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/10';

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] text-cta">{error}</span>}
    </label>
  );
}

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactInput>({
    resolver: zodResolver(ContactSchema),
  });
  const [error, setError] = useState<string | null>(null);
  const mountedAt = useRef(Date.now());
  const onSubmit = async (data: ContactInput) => {
    setError(null);
    const res = await createLead({
      type: 'contact',
      name: data.name,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
      source_path: '/epikoinonia',
      hp: data.hp,
      ts: mountedAt.current,
    });
    if (res.ok) setSent(true);
    else setError('Κάτι πήγε στραβά. Δοκιμάστε ξανά ή καλέστε μας.');
  };

  if (sent) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-olive text-surface"><Check className="h-8 w-8" strokeWidth={1.5} /></div>
        <h3 className="mt-6 font-display text-3xl font-semibold text-primary">Το μήνυμά σας εστάλη</h3>
        <p className="mt-3 text-muted">Θα επικοινωνήσουμε μαζί σας το συντομότερο δυνατό.</p>
      </div>
    );
  }
  return (
    <>
      <h2 className="font-display text-3xl font-semibold text-primary">Στείλτε μας μήνυμα</h2>
      <p className="mt-2 text-muted">Συμπληρώστε τη φόρμα και θα σας απαντήσουμε άμεσα.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-5">
        <input {...register('hp')} type="text" name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] top-0 h-0 w-0 opacity-0" />
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Ονοματεπώνυμο *" error={errors.name?.message}>
            <input {...register('name')} className={inputCls} />
          </Field>
          <Field label="Email *" error={errors.email?.message}>
            <input {...register('email')} type="email" className={inputCls} />
          </Field>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Τηλέφωνο *" error={errors.phone?.message}>
            <input {...register('phone')} type="tel" className={inputCls} />
          </Field>
          <Field label="Θέμα *" error={errors.subject?.message}>
            <input {...register('subject')} className={inputCls} />
          </Field>
        </div>
        <Field label="Μήνυμα">
          <textarea {...register('message')} rows={5} className={inputCls} />
        </Field>
        {error && <p className="text-[14px] text-cta">{error}</p>}
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Αποστολή…' : 'Αποστολή Μηνύματος'}
        </Button>
      </form>
    </>
  );
}
