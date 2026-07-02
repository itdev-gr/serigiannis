// src/pages/RentalsPage.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserRound, Wrench, MapPinned, PhoneCall, Phone } from 'lucide-react';
import { PageHero } from '@/components/shared/PageHero';
import { RouteCard } from '@/components/rentals/RouteCard';
import { UseCaseCard } from '@/components/rentals/UseCaseCard';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { RevealOnScroll } from '@/components/shared/RevealOnScroll';
import { Button } from '@/components/ui/Button';
import { routes } from '@/data/routes';
import { useCases } from '@/data/useCases';

const VALUE_PROPS = [
  { icon: UserRound, title: 'Έμπειροι Οδηγοί', description: 'Πιστοποιημένοι οδηγοί με πολυετή εμπειρία σε τουριστικές μεταφορές.' },
  { icon: Wrench, title: 'Σύγχρονος Στόλος', description: 'Νεότερα πούλμαν με air-condition, mic, wifi και χώρο για αποσκευές.' },
  { icon: MapPinned, title: 'Καθόλη την Ελλάδα', description: 'Από τη Χαλκιδική μέχρι τη Μάνη — καλύπτουμε κάθε προορισμό.' },
  { icon: PhoneCall, title: '24ώρη Εξυπηρέτηση', description: 'Είμαστε διαθέσιμοι όλο το εικοσιτετράωρο για κρατήσεις και αλλαγές.' },
];

export default function RentalsPage() {
  return (
    <>
      <PageHero
        photo="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=2000&q=85"
        photoAlt="Πούλμαν σε ελληνικό δρόμο"
        breadcrumbs={[{ label: 'Αρχική', to: '/' }, { label: 'Ενοικιάσεις Πούλμαν' }]}
        eyebrow="Εκδρομές · Μεταφορές · Εταιρικά"
        title="Ενοικιάσεις Πούλμαν"
        subtitle="Ιδιωτικές μεταφορές με σύγχρονα πούλμαν, έμπειρους οδηγούς και ξεκάθαρες τιμές. Από την Αθήνα σε όλη την Ελλάδα."
      />

      {/* Value props */}
      <section className="border-b border-border py-16">
        <div className="container grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="text-center md:text-left">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/8 text-primary md:mx-0">
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-primary">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured routes */}
      <section className="py-24">
        <div className="container">
          <SectionHeading
            eyebrow="Ενδεικτικές Διαδρομές"
            title="Δημοφιλείς εξορμήσεις με το πούλμαν"
            subtitle="Οι διαδρομές που μας ζητούν πιο συχνά. Καλέστε μας για προσαρμοσμένα προγράμματα."
          />
          <RevealOnScroll className="mt-14 grid gap-6 lg:grid-cols-3">
            {routes.map((route) => (
              <div key={route.id} data-reveal><RouteCard route={route} /></div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* Use cases */}
      <section className="bg-surface py-24">
        <div className="container">
          <SectionHeading
            eyebrow="Για Ποιόν"
            title="Εξειδικευμένες υπηρεσίες"
            align="center"
          />
          <RevealOnScroll className="mt-14 grid gap-6 md:grid-cols-3">
            {useCases.map((u) => (
              <div key={u.id} data-reveal><UseCaseCard item={u} /></div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      {/* Quote CTA */}
      <section className="bg-deep-ink py-24 text-surface md:py-32">
        <div className="container grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-cta">Προσφορά χωρίς κόστος</p>
            <h2 className="mt-4 font-display text-display-section text-surface">Ζητήστε προσφορά για την εκδρομή σας</h2>
            <p className="mt-6 text-[17px] leading-relaxed text-surface/80">
              Πείτε μας τον προορισμό, την ημερομηνία και τον αριθμό επιβατών — θα σας απαντήσουμε με πλήρη τιμή εντός 24 ωρών.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <a href="tel:+302105712451" className="group inline-flex items-center gap-3 text-surface">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-cta"><Phone className="h-4 w-4" strokeWidth={1.75}/></div>
                <div>
                  <div className="font-sans text-[11px] uppercase tracking-[0.14em] text-surface/60">Τηλέφωνο γραφείου</div>
                  <div className="font-display text-2xl font-semibold group-hover:text-cta">210 571 2451</div>
                </div>
              </a>
              <a href="tel:+306976811825" className="group inline-flex items-center gap-3 text-surface">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-cta"><PhoneCall className="h-4 w-4" strokeWidth={1.75}/></div>
                <div>
                  <div className="font-sans text-[11px] uppercase tracking-[0.14em] text-surface/60">Κινητό 24ώρου</div>
                  <div className="font-display text-2xl font-semibold group-hover:text-cta">6976 811 825</div>
                </div>
              </a>
            </div>
          </div>
          <div className="rounded-lg border border-surface/10 bg-surface p-8 text-body md:p-10">
            <QuoteForm />
          </div>
        </div>
      </section>
    </>
  );
}

// Inline mini form (kept simple, no backend)
const QuoteSchema = z.object({
  name: z.string().min(2, 'Παρακαλώ συμπληρώστε το όνομά σας.'),
  phone: z.string().min(8, 'Παρακαλώ συμπληρώστε ένα έγκυρο τηλέφωνο.'),
  date: z.string().min(1, 'Παρακαλώ επιλέξτε ημερομηνία.'),
  notes: z.string().optional(),
});
type QuoteInput = z.infer<typeof QuoteSchema>;

function QuoteForm() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<QuoteInput>({
    resolver: zodResolver(QuoteSchema),
  });
  const onSubmit = (data: QuoteInput) => {
    // No backend — simulate success
    console.log('quote request:', data);
    setSent(true);
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
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Αποστολή…' : 'Ζητήστε Προσφορά'}
      </Button>
    </form>
  );
}

const inputCls =
  'w-full rounded-md border border-border bg-surface px-4 py-3 font-sans text-[15px] text-body placeholder:text-muted/60 transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[13px] text-cta">{error}</span>}
    </label>
  );
}
