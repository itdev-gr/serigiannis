'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Ship, MapPin, Bus, Mail, Home as HomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/', label: 'Αρχική', icon: HomeIcon },
  { to: '/ekdromes', label: 'Εκδρομές', icon: MapPin },
  { to: '/kroyazieres', label: 'Κρουαζιέρες', icon: Ship },
  { to: '/enoikiaseis-poylman', label: 'Πούλμαν', icon: Bus },
  { to: '/epikoinonia', label: 'Επικοινωνία', icon: Mail },
];

function isActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(to + '/');
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setScrolled(window.scrollY > 60);
  }, [pathname]);

  // Every page has a full-bleed dark hero on top, so use dark nav styling
  // (transparent + white text) at scroll=0 across the whole site.
  const dark = !scrolled;

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
          <Link href="/" className="flex items-center gap-2.5" aria-label="Sergiani Travel — αρχική">
            <div className={cn('grid h-10 w-10 place-items-center rounded-full transition-colors', dark ? 'bg-surface/15 backdrop-blur' : 'bg-primary')}>
              <Ship className="h-5 w-5 text-surface" strokeWidth={1.5} />
            </div>
            <div className="leading-tight">
              <div className={cn('font-display text-[20px] font-semibold', dark ? 'text-surface' : 'text-primary')}>Sergiani</div>
              <div className={cn('font-sans text-[10px] uppercase tracking-[0.2em]', dark ? 'text-surface/70' : 'text-muted')}>Travel · 1995</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Κύρια πλοήγηση">
            {NAV_ITEMS.map(({ to, label }) => {
              const active = isActive(pathname, to);
              return (
                <Link
                  key={to}
                  href={to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'px-3 py-2 font-sans text-[13px] font-medium uppercase tracking-[0.1em] transition-colors',
                    dark ? 'text-surface/85 hover:text-surface' : 'text-primary hover:text-cta',
                    active && (dark ? 'text-surface underline underline-offset-8 decoration-cta decoration-2' : 'text-cta underline underline-offset-8 decoration-2')
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant={dark ? 'ghost' : 'primary'} size="sm" className="hidden md:inline-flex">
              <Link href="/epikoinonia">Κλείστε Θέση</Link>
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
          <Link href="/" className="font-display text-2xl font-semibold text-surface">Sergiani</Link>
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
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const active = isActive(pathname, to);
            return (
              <Link
                key={to}
                href={to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-4 rounded-lg px-4 py-4 font-display text-3xl transition-colors',
                  active ? 'text-cta' : 'text-surface hover:text-sea'
                )}
              >
                <Icon className="h-6 w-6 opacity-60" strokeWidth={1.5} />
                {label}
              </Link>
            );
          })}
          <Button asChild size="lg" className="mt-8">
            <Link href="/epikoinonia">Κλείστε Θέση</Link>
          </Button>
        </nav>
      </div>
    </>
  );
}
