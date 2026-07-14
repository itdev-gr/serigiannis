import type { Metadata } from 'next';
import { UserRound, Wrench, MapPinned, PhoneCall, Phone, Building2, GraduationCap, PartyPopper } from 'lucide-react';
import { PageHero } from '@/components/shared/PageHero';
import { SectionHeading } from '@/components/shared/SectionHeading';
import { RevealOnScroll } from '@/components/shared/RevealOnScroll';
import { QuoteForm } from '@/components/rentals/QuoteForm';
import { getSettings } from '@/lib/queries/settings';
import { telHref } from '@/lib/phone';
import { resolvePageHero, resolvePoylman } from '@/components/home/resolve-content';

export const metadata: Metadata = {
  title: 'Ενοικιάσεις Πούλμαν',
  description: 'Ιδιωτικές μεταφορές με σύγχρονα πούλμαν, έμπειρους οδηγούς και ξεκάθαρες τιμές — από την Αθήνα σε όλη την Ελλάδα.',
};

// Fixed icon per value-prop slot (icons aren't editable) — the text is resolved from settings.
const VALUE_PROP_ICONS = [UserRound, Wrench, MapPinned, PhoneCall];

const USE_CASES = [
  { icon: GraduationCap, title: 'Σχολικές Εκδρομές', description: 'Ασφαλείς, οργανωμένες μεταφορές για σχολεία και συλλόγους γονέων.' },
  { icon: Building2, title: 'Εταιρικά & Σύλλογοι', description: 'Μεταφορές για επιχειρήσεις, συνέδρια και εκδηλώσεις.' },
  { icon: PartyPopper, title: 'Γάμοι & Εκδηλώσεις', description: 'Μεταφορά καλεσμένων με άνεση, στην ώρα και με στυλ.' },
];

export default async function RentalsPage() {
  const settings = await getSettings();
  const hero = resolvePageHero(settings, 'poylman', {
    eyebrow: 'Εκδρομές · Μεταφορές · Εταιρικά',
    title: 'Ενοικιάσεις Πούλμαν',
    subtitle: 'Ιδιωτικές μεταφορές με σύγχρονα πούλμαν, έμπειρους οδηγούς και ξεκάθαρες τιμές. Από την Αθήνα σε όλη την Ελλάδα.',
  });
  const { valueProps, routes } = resolvePoylman(settings);
  const officePhone = settings.phones[0] ?? null;
  const phone24h = settings.phone24h ?? settings.phones.find((p) => p.replace(/\s/g, '').startsWith('69')) ?? null;
  return (
    <>
      <PageHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        subtitle={hero.subtitle}
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Ενοικιάσεις Πούλμαν' }]}
        heightClass="h-[52vh] min-h-[420px]"
      />

      <section className="border-b border-border py-16">
        <div className="container grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {valueProps.map(({ title, description }, i) => {
            const Icon = VALUE_PROP_ICONS[i] ?? VALUE_PROP_ICONS[0];
            return (
              <div key={title} className="text-center md:text-left">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary md:mx-0">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-primary">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="py-24">
        <div className="container">
          <SectionHeading
            eyebrow="Ενδεικτικές Διαδρομές"
            title="Δημοφιλείς εξορμήσεις με το πούλμαν"
            subtitle="Οι διαδρομές που μας ζητούν πιο συχνά. Καλέστε μας για προσαρμοσμένα προγράμματα."
          />
          <RevealOnScroll className="mt-14 grid gap-6 lg:grid-cols-3">
            {routes.map((r) => (
              <div key={r.to} data-reveal className="rounded-lg border border-border bg-surface p-8 shadow-card">
                <div className="font-sans text-[12px] uppercase tracking-[0.14em] text-muted">{r.from} →</div>
                <div className="mt-1 font-display text-2xl font-semibold text-primary">{r.to}</div>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-sea/15 px-3 py-1 font-sans text-[13px] font-medium text-primary">{r.hours}</div>
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      <section className="bg-surface py-24">
        <div className="container">
          <SectionHeading eyebrow="Για Ποιόν" title="Εξειδικευμένες υπηρεσίες" align="center" />
          <RevealOnScroll className="mt-14 grid gap-6 md:grid-cols-3">
            {USE_CASES.map(({ icon: Icon, title, description }) => (
              <div key={title} data-reveal className="rounded-lg border border-border bg-background p-8 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-cta/10 text-cta">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold text-primary">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{description}</p>
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      <section className="bg-deep-ink py-24 text-surface md:py-32">
        <div className="container grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[0.18em] text-cta">Προσφορά χωρίς κόστος</p>
            <h2 className="mt-4 font-display text-display-section text-surface">Ζητήστε προσφορά για την εκδρομή σας</h2>
            <p className="mt-6 text-[17px] leading-relaxed text-surface/80">
              Πείτε μας τον προορισμό, την ημερομηνία και τον αριθμό επιβατών — θα σας απαντήσουμε με πλήρη τιμή εντός 24 ωρών.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              {officePhone && (
                <a href={telHref(officePhone)} className="group inline-flex items-center gap-3 text-surface">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-cta"><Phone className="h-4 w-4" strokeWidth={1.75}/></div>
                  <div>
                    <div className="font-sans text-[11px] uppercase tracking-[0.14em] text-surface/60">Τηλέφωνο γραφείου</div>
                    <div className="font-display text-2xl font-semibold group-hover:text-cta">{officePhone}</div>
                  </div>
                </a>
              )}
              {phone24h && (
                <a href={telHref(phone24h)} className="group inline-flex items-center gap-3 text-surface">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-cta"><PhoneCall className="h-4 w-4" strokeWidth={1.75}/></div>
                  <div>
                    <div className="font-sans text-[11px] uppercase tracking-[0.14em] text-surface/60">Κινητό 24ώρου</div>
                    <div className="font-display text-2xl font-semibold group-hover:text-cta">{phone24h}</div>
                  </div>
                </a>
              )}
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
