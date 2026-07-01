// src/components/layout/Navbar.tsx
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Ship, MapPin, Bus, Mail, Home as HomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Αρχική', icon: HomeIcon },
  { to: '/monoimeres', label: 'Μονοήμερες', icon: MapPin },
  { to: '/kroyazieres', label: 'Κρουαζιέρες', icon: Ship },
  { to: '/pullman-rentals', label: 'Πούλμαν', icon: Bus },
  { to: '/epikoinonia', label: 'Επικοινωνία', icon: Mail },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const dark = isHome && !scrolled;

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 transition-all duration-300 ease-editorial',
          scrolled ? 'bg-surface/85 backdrop-blur-md border-b border-border' : 'bg-transparent',
          scrolled ? 'py-3' : 'py-5'
        )}
      >
        <div className="container flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Sergiani Travel — αρχική">
            <div className={cn('grid h-10 w-10 place-items-center rounded-full transition-colors', dark ? 'bg-surface/15 backdrop-blur' : 'bg-primary')}>
              <Ship className={cn('h-5 w-5', dark ? 'text-surface' : 'text-surface')} strokeWidth={1.5} />
            </div>
            <div className="leading-tight">
              <div className={cn('font-display text-[20px] font-semibold', dark ? 'text-surface' : 'text-primary')}>Sergiani</div>
              <div className={cn('font-sans text-[10px] uppercase tracking-[0.2em]', dark ? 'text-surface/70' : 'text-muted')}>Travel · 1995</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Κύρια πλοήγηση">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 font-sans text-[13px] font-medium uppercase tracking-[0.1em] transition-all',
                    dark ? 'text-surface/85 hover:bg-surface/10 hover:text-surface' : 'text-primary hover:bg-primary/5',
                    isActive && (dark ? 'bg-surface/15 text-surface' : 'bg-primary/10 text-primary')
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant={dark ? 'ghost' : 'primary'} size="sm" className="hidden md:inline-flex">
              <Link to="/epikoinonia">Κλείστε Θέση</Link>
            </Button>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={cn('grid h-11 w-11 place-items-center rounded-full lg:hidden', dark ? 'text-surface hover:bg-surface/10' : 'text-primary hover:bg-primary/10')}
              aria-label="Άνοιγμα μενού"
            >
              <Menu className="h-6 w-6" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-deep-ink transition-all duration-500 ease-editorial lg:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <Link to="/" className="font-display text-2xl font-semibold text-surface">Sergiani</Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="grid h-11 w-11 place-items-center rounded-full text-surface hover:bg-surface/10"
            aria-label="Κλείσιμο μενού"
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>
        <nav className="mt-8 flex flex-col gap-1 px-6" aria-label="Πλοήγηση κινητού">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-4 rounded-lg px-4 py-4 font-display text-3xl transition-colors',
                  isActive ? 'text-cta' : 'text-surface hover:text-sea'
                )
              }
            >
              <Icon className="h-6 w-6 opacity-60" strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
          <Button asChild size="lg" className="mt-8">
            <Link to="/epikoinonia">Κλείστε Θέση</Link>
          </Button>
        </nav>
      </div>
    </>
  );
}
