// src/pages/ContactPage.tsx
import type { SVGProps } from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Phone, Mail, Clock, ExternalLink, Check } from 'lucide-react';
import { PageHero } from '@/components/shared/PageHero';
import { Button } from '@/components/ui/Button';

// Brand icons — lucide-react v1 removed brand marks, so we inline them.
function Facebook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
    </svg>
  );
}
function Instagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}
function Youtube(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M23.5 6.5a3 3 0 0 0-2.12-2.12C19.4 3.9 12 3.9 12 3.9s-7.4 0-9.38.48A3 3 0 0 0 .5 6.5 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.5 3 3 0 0 0 2.12 2.12C4.6 20.1 12 20.1 12 20.1s7.4 0 9.38-.48a3 3 0 0 0 2.12-2.12A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.5ZM9.6 15.6V8.4l6.4 3.6-6.4 3.6Z" />
    </svg>
  );
}

const ContactSchema = z.object({
  name: z.string().min(2, 'Παρακαλώ συμπληρώστε το όνομά σας.'),
  email: z.string().email('Μη έγκυρη διεύθυνση email.'),
  phone: z.string().optional(),
  subject: z.string().min(2, 'Παρακαλώ γράψτε ένα θέμα.'),
  message: z.string().optional(),
});
type ContactInput = z.infer<typeof ContactSchema>;

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ContactInput>({
    resolver: zodResolver(ContactSchema),
  });
  const onSubmit = (data: ContactInput) => { console.log('contact submit:', data); setSent(true); };

  return (
    <>
      <PageHero
        photo="https://picsum.photos/seed/acropolis/2000/1200"
        photoAlt="Θέα της Ακρόπολης"
        breadcrumbs={[{ label: 'Αρχική', to: '/' }, { label: 'Επικοινωνία' }]}
        eyebrow="Είμαστε εδώ για εσάς"
        title="Επικοινωνήστε μαζί μας"
        subtitle="Π. Μελά 45, Περιστέρι 121 31 · Απαντάμε την ίδια μέρα."
        heightClass="h-[50vh] min-h-[380px]"
      />

      <section className="py-20 md:py-28">
        <div className="container grid gap-10 lg:grid-cols-12">
          {/* Form */}
          <div className="lg:col-span-7">
            <div className="rounded-lg border border-border bg-surface p-8 shadow-card md:p-12">
              {sent ? (
                <div className="py-16 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-olive text-surface"><Check className="h-8 w-8" strokeWidth={1.5}/></div>
                  <h3 className="mt-6 font-display text-3xl font-semibold text-primary">Το μήνυμά σας εστάλη</h3>
                  <p className="mt-3 text-muted">Θα επικοινωνήσουμε μαζί σας το συντομότερο δυνατό.</p>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-3xl font-semibold text-primary">Στείλτε μας μήνυμα</h2>
                  <p className="mt-2 text-muted">Συμπληρώστε τη φόρμα και θα σας απαντήσουμε άμεσα.</p>
                  <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="Ονοματεπώνυμο *" error={errors.name?.message}>
                        <input {...register('name')} className={inputCls} placeholder="π.χ. Μαρία Παπαδοπούλου" />
                      </Field>
                      <Field label="Email *" error={errors.email?.message}>
                        <input {...register('email')} type="email" className={inputCls} placeholder="π.χ. maria@example.com" />
                      </Field>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="Τηλέφωνο" error={errors.phone?.message}>
                        <input {...register('phone')} className={inputCls} placeholder="Προαιρετικό" />
                      </Field>
                      <Field label="Θέμα *" error={errors.subject?.message}>
                        <input {...register('subject')} className={inputCls} placeholder="π.χ. Κράτηση για Μετέωρα" />
                      </Field>
                    </div>
                    <Field label="Μήνυμα">
                      <textarea {...register('message')} rows={5} className={inputCls} placeholder="Πείτε μας πώς μπορούμε να σας εξυπηρετήσουμε…" />
                    </Field>
                    <Button type="submit" size="lg" disabled={isSubmitting}>
                      {isSubmitting ? 'Αποστολή…' : 'Αποστολή Μηνύματος'}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Info sidebar */}
          <aside className="lg:col-span-5">
            <div className="sticky top-28 flex flex-col gap-6">
              <div className="rounded-lg bg-deep-ink p-8 text-surface md:p-10">
                <h3 className="font-display text-2xl font-semibold">Στοιχεία Επικοινωνίας</h3>
                <ul className="mt-6 space-y-5 text-[15px]">
                  <li className="flex items-start gap-4">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-cta" strokeWidth={1.5}/>
                    <div>
                      <div className="font-semibold">Π. Μελά 45, Περιστέρι 121 31</div>
                      <div className="text-surface/60">Μετρό Αγίου Αντωνίου</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Phone className="mt-0.5 h-5 w-5 shrink-0 text-cta" strokeWidth={1.5}/>
                    <div className="space-y-1">
                      <a href="tel:+302105712451" className="block font-semibold hover:text-cta">210 571 2451</a>
                      <a href="tel:+302108212452" className="block font-semibold hover:text-cta">210 821 2452</a>
                      <a href="tel:+306976811825" className="block font-semibold hover:text-cta">6976 811 825 <span className="text-[13px] font-normal text-surface/60">· 24ώρο</span></a>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-cta" strokeWidth={1.5}/>
                    <a href="mailto:info@sergianitravel.gr" className="font-semibold hover:text-cta">info@sergianitravel.gr</a>
                  </li>
                  <li className="flex items-start gap-4">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-cta" strokeWidth={1.5}/>
                    <div className="space-y-1">
                      <div><span className="font-semibold">Δευ–Παρ:</span> 09:00–17:00</div>
                      <div><span className="font-semibold">Σάββατο:</span> 09:00–14:00</div>
                    </div>
                  </li>
                </ul>
                <div className="mt-8 border-t border-surface/10 pt-6">
                  <div className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-surface/60">Ακολουθήστε μας</div>
                  <div className="flex gap-3">
                    <SocialIcon href="https://facebook.com/sergiani.travelgr" label="Facebook"><Facebook className="h-4 w-4" /></SocialIcon>
                    <SocialIcon href="https://instagram.com/sergiani_travel" label="Instagram"><Instagram className="h-4 w-4" /></SocialIcon>
                    <SocialIcon href="https://youtube.com/@sergianitravel" label="YouTube"><Youtube className="h-4 w-4" /></SocialIcon>
                    <SocialIcon href="https://tripadvisor.com" label="TripAdvisor"><ExternalLink className="h-4 w-4" strokeWidth={1.75}/></SocialIcon>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Google Maps */}
      <section className="border-t border-border">
        <div className="aspect-[16/6] w-full">
          <iframe
            title="Sergiani Travel — τοποθεσία γραφείου"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3145.9!2d23.6835!3d38.014!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sPeristeri!5e0!3m2!1sen!2sgr!4v1700000000000"
            width="100%"
            height="100%"
            loading="lazy"
            style={{ border: 0, filter: 'saturate(0.85) hue-rotate(-8deg)' }}
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </>
  );
}

const inputCls =
  'w-full rounded-md border border-border bg-background px-4 py-3 font-sans text-[15px] text-body placeholder:text-muted/50 transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-4 focus:ring-primary/10';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] text-cta">{error}</span>}
    </label>
  );
}

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full bg-surface/10 text-surface transition-colors hover:bg-cta">
      {children}
    </a>
  );
}
