import { Button } from '@/components/ui/Button';

export type ContactField = { name: string; label: string; value: string | null; type?: string };

/** Αναδιπλούμενη φόρμα διόρθωσης στοιχείων πελάτη σε καρτέλα κράτησης.
 *  Σκέτο <details> — καμία ανάγκη για client JS σε μια φόρμα του γραφείου. */
export function ContactEditCard({
  action,
  fields,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: ContactField[];
}) {
  return (
    <details className="mt-6 rounded-lg border border-border bg-surface">
      <summary className="cursor-pointer select-none px-6 py-4 font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-primary hover:text-cta">
        Επεξεργασία στοιχείων πελάτη
      </summary>
      <form action={action} className="grid gap-4 border-t border-border/60 px-6 pb-6 pt-4 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f.name} className="block">
            <span className="mb-1 block font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
              {f.label}
            </span>
            <input
              name={f.name}
              type={f.type ?? 'text'}
              defaultValue={f.value ?? ''}
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-[15px] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>
        ))}
        <div className="sm:col-span-2">
          <Button type="submit" size="sm">Αποθήκευση στοιχείων</Button>
        </div>
      </form>
    </details>
  );
}
