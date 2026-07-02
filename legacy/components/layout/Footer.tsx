// src/components/layout/Footer.tsx
import type { SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Ship } from 'lucide-react';

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

export function Footer() {
  return (
    <footer className="bg-deep-ink text-surface">
      <div className="container grid gap-12 py-20 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-surface/10">
              <Ship className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div className="font-display text-2xl font-semibold">Sergiani Travel</div>
          </div>
          <p className="text-[15px] leading-relaxed text-surface/70">
            Ταξιδιωτικό γραφείο στο Περιστέρι από το 1995. Οργανώνουμε εκδρομές, κρουαζιέρες και μεταφορές σε όλη την Ελλάδα.
          </p>
          <div className="mt-6 flex gap-3">
            <a href="https://facebook.com/sergiani.travelgr" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full bg-surface/10 transition-colors hover:bg-cta">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="https://instagram.com/sergiani_travel" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full bg-surface/10 transition-colors hover:bg-cta">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="https://youtube.com/@sergianitravel" aria-label="YouTube" className="grid h-10 w-10 place-items-center rounded-full bg-surface/10 transition-colors hover:bg-cta">
              <Youtube className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-surface/60">Εκδρομές</h3>
          <ul className="space-y-3 text-[15px]">
            <li><Link to="/monoimeres" className="text-surface/80 hover:text-cta">Μονοήμερες</Link></li>
            <li><Link to="/kroyazieres" className="text-surface/80 hover:text-cta">Κρουαζιέρες</Link></li>
            <li><Link to="/monoimeres" className="text-surface/80 hover:text-cta">Θαλάσσια Μπάνια</Link></li>
            <li><Link to="/monoimeres" className="text-surface/80 hover:text-cta">Πολυήμερες</Link></li>
            <li><Link to="/pullman-rentals" className="text-surface/80 hover:text-cta">Ενοικίαση Πούλμαν</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-surface/60">Επικοινωνία</h3>
          <ul className="space-y-3 text-[15px] text-surface/80">
            <li className="flex items-start gap-3">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-cta" strokeWidth={1.75} />
              <span>Π. Μελά 45, Περιστέρι 121 31<br/><span className="text-surface/60">(Μετρό Αγίου Αντωνίου)</span></span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-cta" strokeWidth={1.75} />
              <a href="tel:+302105712451" className="hover:text-cta">210 571 2451</a>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="h-4 w-4 shrink-0 text-cta" strokeWidth={1.75} />
              <a href="tel:+306976811825" className="hover:text-cta">6976 811 825 <span className="text-surface/50">(24ώρο)</span></a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="h-4 w-4 shrink-0 text-cta" strokeWidth={1.75} />
              <a href="mailto:info@sergianitravel.gr" className="hover:text-cta">info@sergianitravel.gr</a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-4 font-sans text-[12px] font-semibold uppercase tracking-[0.14em] text-surface/60">Ωράριο</h3>
          <ul className="space-y-3 text-[15px] text-surface/80">
            <li className="flex items-start gap-3">
              <Clock className="mt-1 h-4 w-4 shrink-0 text-cta" strokeWidth={1.75} />
              <div>
                <div>Δευ–Παρ: 09:00–17:00</div>
                <div>Σάββατο: 09:00–14:00</div>
              </div>
            </li>
          </ul>
          <div className="mt-6 rounded-lg border border-surface/10 bg-surface/5 p-4">
            <div className="font-sans text-[12px] uppercase tracking-[0.14em] text-cta">Ασφαλείς πληρωμές</div>
            <div className="mt-1.5 text-[14px] text-surface/70">Κάρτα, IRIS, Τραπεζική Κατάθεση</div>
          </div>
        </div>
      </div>
      <div className="border-t border-surface/10">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-[13px] text-surface/60 md:flex-row">
          <div>© 2026 Sergiani Travel. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-surface">Όροι Συμμετοχής</a>
            <a href="#" className="hover:text-surface">Πολιτική Απορρήτου</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
