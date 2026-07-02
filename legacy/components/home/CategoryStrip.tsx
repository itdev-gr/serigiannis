// src/components/home/CategoryStrip.tsx
import { Link } from 'react-router-dom';
import { Ship, MapPin, Compass, Waves, Mountain, Bus } from 'lucide-react';

const CATEGORIES = [
  { to: '/monoimeres', label: 'Μονοήμερες', icon: MapPin },
  { to: '/kroyazieres', label: 'Κρουαζιέρες', icon: Ship },
  { to: '/monoimeres', label: 'Πολυήμερες', icon: Compass },
  { to: '/monoimeres', label: 'Θαλάσσια Μπάνια', icon: Waves },
  { to: '/monoimeres', label: 'Πεζοπορίες', icon: Mountain },
  { to: '/pullman-rentals', label: 'Ενοικίαση Πούλμαν', icon: Bus },
];

export function CategoryStrip() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="container">
        <div className="scrollbar-hide flex gap-3 overflow-x-auto py-6 md:justify-center md:gap-4">
          {CATEGORIES.map(({ to, label, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className="group inline-flex shrink-0 items-center gap-2.5 rounded-full border border-border bg-background px-5 py-2.5 font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary transition-all hover:border-cta hover:bg-cta hover:text-surface"
            >
              <Icon className="h-4 w-4 opacity-60 group-hover:opacity-100" strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
