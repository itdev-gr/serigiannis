import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { getSettings } from '@/lib/queries/settings';
import { telHref } from '@/lib/phone';
import { SocialLinks } from '@/components/shared/SocialLinks';

export async function Footer() {
  const s = await getSettings();
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
          <SocialLinks social={s.social} tone="dark" className="mt-6" />
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
