import type { SVGProps, ComponentType } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { getSettings } from '@/lib/queries/settings';
import { telHref } from '@/lib/phone';

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

export async function Footer() {
  const s = await getSettings();
  const socials = [
    s.social?.facebook && { href: s.social.facebook, label: 'Facebook', Icon: Facebook },
    s.social?.instagram && { href: s.social.instagram, label: 'Instagram', Icon: Instagram },
    s.social?.youtube && { href: s.social.youtube, label: 'YouTube', Icon: Youtube },
  ].filter(Boolean) as { href: string; label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }[];

  return (
    <footer className="bg-deep-ink text-surface">
      <div className="container grid gap-12 py-20 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Link href="/" aria-label="Sergiani Travel, αρχική" className="mb-5 inline-flex">
            <Image src="/brand/logo-white.svg" alt="Sergiani Travel" width={165} height={52} className="h-12 w-auto" />
          </Link>
          <p className="text-[17px] leading-relaxed text-white">
            Ταξιδιωτικό γραφείο στο Περιστέρι από το 1995. Οργανώνουμε εκδρομές, κρουαζιέρες και μεταφορές σε όλη την Ελλάδα.
          </p>
          <div className="mt-6 flex gap-3">
            {socials.map(({ href, label, Icon }) => (
              <a key={label} href={href} aria-label={label} target="_blank" rel="noopener" className="grid h-11 w-11 place-items-center rounded-full bg-surface/10 text-white transition-colors hover:bg-cta">
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-5 font-sans text-[14px] font-semibold uppercase tracking-[0.14em] text-white">Εκδρομές</h3>
          <ul className="space-y-3.5 text-[16px]">
            <li><Link href="/ekdromes/monoimeres" className="text-white hover:text-gold">Μονοήμερες</Link></li>
            <li><Link href="/kroyazieres" className="text-white hover:text-gold">Κρουαζιέρες</Link></li>
            <li><Link href="/ekdromes/thalassia-mpania" className="text-white hover:text-gold">Θαλάσσια Μπάνια</Link></li>
            <li><Link href="/ekdromes/polyimeres" className="text-white hover:text-gold">Πολυήμερες</Link></li>
            <li><Link href="/enoikiaseis-poylman" className="text-white hover:text-gold">Ενοικιάσεις Πούλμαν και Μίνι Βαν</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-5 font-sans text-[14px] font-semibold uppercase tracking-[0.14em] text-white">Επικοινωνία</h3>
          <ul className="space-y-3.5 text-[16px] text-white">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-white" strokeWidth={1.75} />
              <span>{s.address}<br/><span className="text-[15px] text-white">(Μετρό Αγίου Αντωνίου)</span></span>
            </li>
            {s.phones.map((phone) => (
              <li key={phone} className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0 text-white" strokeWidth={1.75} />
                <a href={telHref(phone)} className="text-white hover:text-gold">{phone}</a>
              </li>
            ))}
            <li className="flex items-center gap-3">
              <Mail className="h-5 w-5 shrink-0 text-white" strokeWidth={1.75} />
              <a href={`mailto:${s.email}`} className="text-white hover:text-gold">{s.email}</a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-5 font-sans text-[14px] font-semibold uppercase tracking-[0.14em] text-white">Ωράριο</h3>
          <ul className="space-y-3.5 text-[16px] text-white">
            <li className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-white" strokeWidth={1.75} />
              <div>
                <div>Δευ–Παρ: {s.hours.weekdays}</div>
                <div>Σάββατο: {s.hours.saturday}</div>
              </div>
            </li>
          </ul>
          <div className="mt-6 rounded-lg bg-white p-4 shadow-sm">
            <Image
              src="/payments/secure-payments.png"
              alt="Ασφαλείς πληρωμές: κάρτες, Apple Pay, Google Pay, IRIS, Viva Wallet"
              width={300}
              height={62}
              className="h-auto w-full max-w-[300px]"
            />
          </div>
        </div>
      </div>
      <div className="border-t border-surface/10">
        <div className="container flex flex-col items-center justify-between gap-4 py-7 text-[15px] text-white md:flex-row">
          <div>© 2026 Sergiani Travel. Με επιφύλαξη παντός δικαιώματος.</div>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/oroi" className="text-white hover:text-gold">Όροι Συμμετοχής</Link>
              <Link href="/oroi-proypotheseis" className="text-white hover:text-gold">Όροι & Προϋποθέσεις</Link>
              <Link href="/politiki-aporritou" className="text-white hover:text-gold">Πολιτική Απορρήτου</Link>
            </div>
            <span className="text-white/90">
              Powered by{' '}
              <a
                href="https://www.itdev.gr/"
                target="_blank"
                rel="noopener"
                className="font-semibold text-white hover:text-gold"
              >
                IT DEV
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
