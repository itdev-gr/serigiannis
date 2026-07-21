import type { Metadata } from 'next';
import type { SVGProps } from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { PageHero } from '@/components/shared/PageHero';
import { ContactForm } from '@/components/contact/ContactForm';
import { PaymentMethods } from '@/components/shared/PaymentMethods';
import { getSettings } from '@/lib/queries/settings';
import { resolvePageHero } from '@/components/home/resolve-content';

export const metadata: Metadata = {
  title: 'Επικοινωνία',
  description: 'Επικοινωνήστε με τη Sergiani Travel, Π. Μελά 45, Περιστέρι. Απαντάμε την ίδια μέρα.',
};

function tel(n: string) { return 'tel:+30' + n.replace(/\s/g, ''); }

function Facebook(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" /></svg>;
}
function Instagram(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" /></svg>;
}
function Youtube(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}><path d="M23.5 6.5a3 3 0 0 0-2.12-2.12C19.4 3.9 12 3.9 12 3.9s-7.4 0-9.38.48A3 3 0 0 0 .5 6.5 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.5 3 3 0 0 0 2.12 2.12C4.6 20.1 12 20.1 12 20.1s7.4 0 9.38-.48a3 3 0 0 0 2.12-2.12A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.5ZM9.6 15.6V8.4l6.4 3.6-6.4 3.6Z" /></svg>;
}

export default async function ContactPage() {
  const s = await getSettings();
  const hero = resolvePageHero(s, 'epikoinonia', {
    title: 'Επικοινωνήστε μαζί μας',
  });
  return (
    <>
      <PageHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        subtitle={hero.subtitle}
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Επικοινωνία' }]}
        heightClass="h-[48vh] min-h-[360px]"
      />

      <section className="py-20 md:py-28">
        <div className="container grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="rounded-lg border border-border bg-surface p-8 shadow-card md:p-12">
              <ContactForm />
            </div>
            <PaymentMethods className="mt-6" />
          </div>

          <aside className="lg:col-span-5">
            <div className="sticky top-28 rounded-lg bg-deep-ink p-8 text-surface md:p-10">
              <h2 className="font-display text-2xl font-semibold">Στοιχεία Επικοινωνίας</h2>
              <ul className="mt-6 space-y-5 text-[15px]">
                <li className="flex items-start gap-4">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-cta" strokeWidth={1.5} />
                  <div><div className="font-semibold">{s.address}</div><div className="text-surface/60">Μετρό Αγίου Αντωνίου</div></div>
                </li>
                <li className="flex items-start gap-4">
                  <Phone className="mt-0.5 h-5 w-5 shrink-0 text-cta" strokeWidth={1.5} />
                  <div className="space-y-1">
                    {s.phones.map((p) => <a key={p} href={tel(p)} className="block font-semibold hover:text-cta">{p}</a>)}
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-cta" strokeWidth={1.5} />
                  <a href={`mailto:${s.email}`} className="font-semibold hover:text-cta">{s.email}</a>
                </li>
                <li className="flex items-start gap-4">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-cta" strokeWidth={1.5} />
                  <div className="space-y-1">
                    <div><span className="font-semibold">Δευ–Παρ:</span> {s.hours.weekdays}</div>
                    <div><span className="font-semibold">Σάββατο:</span> {s.hours.saturday}</div>
                  </div>
                </li>
              </ul>
              {s.social && (
                <div className="mt-8 border-t border-surface/10 pt-6">
                  <div className="mb-3 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-surface/60">Ακολουθήστε μας</div>
                  <div className="flex gap-3">
                    {s.social.facebook && <a href={s.social.facebook} aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full bg-surface/10 text-surface transition-colors hover:bg-cta"><Facebook className="h-4 w-4" /></a>}
                    {s.social.instagram && <a href={s.social.instagram} aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full bg-surface/10 text-surface transition-colors hover:bg-cta"><Instagram className="h-4 w-4" /></a>}
                    {s.social.youtube && <a href={s.social.youtube} aria-label="YouTube" className="grid h-10 w-10 place-items-center rounded-full bg-surface/10 text-surface transition-colors hover:bg-cta"><Youtube className="h-4 w-4" /></a>}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="aspect-[16/6] w-full">
          <iframe
            title="Sergiani Travel, τοποθεσία γραφείου"
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
