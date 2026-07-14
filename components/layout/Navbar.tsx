'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Ship, MapPin, Bus, Mail, Home as HomeIcon, Newspaper, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { telHref } from '@/lib/phone';

const NAV_ITEMS = [
  { to: '/', label: 'Αρχική', icon: HomeIcon },
  { to: '/ekdromes', label: 'Εκδρομές', icon: MapPin },
  { to: '/enoikiaseis-poylman', label: 'Ενοικιάσεις Πούλμαν – Μίνι Βαν', icon: Bus },
  { to: '/kroyazieres', label: 'Κρουαζιέρες', icon: Ship },
  { to: '/epikoinonia', label: 'Επικοινωνία', icon: Mail },
  { to: '/nea', label: 'Νέα', icon: Newspaper },
];

function isActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(to + '/');
}

export function Navbar({ phones = [], phone24h = null }: { phones?: string[]; phone24h?: string | null }) {
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
        {!scrolled && (
          <div className="border-b border-surface/15">
            <div className="container flex h-9 items-center justify-between gap-4 font-sans text-[13px] text-surface/85">
              <div className="hidden items-center gap-5 sm:flex">
                {phones.map((p) => (
                  <a key={p} href={telHref(p)} className="flex items-center gap-1.5 hover:text-surface">
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.75} /> {p}
                  </a>
                ))}
              </div>
              {phone24h && (
                <a href={telHref(phone24h)} className="flex items-center gap-1.5 font-semibold text-gold hover:text-surface">
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.75} /> 24ωρο: {phone24h}
                </a>
              )}
            </div>
          </div>
        )}
        <div className="container flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center" aria-label="Sergiani Travel — αρχική">
            <Image
              src="/brand/logo-300x75.png"
              alt="Sergiani Travel"
              width={200}
              height={50}
              priority
              className={cn('h-9 w-auto transition-all duration-300 md:h-10', dark && 'brightness-0 invert')}
            />
          </Link>

          <nav className="hidden items-center gap-1 xl:flex" aria-label="Κύρια πλοήγηση">
            {NAV_ITEMS.map(({ to, label }) => {
              const active = isActive(pathname, to);
              return (
                <Link
                  key={to}
                  href={to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'whitespace-nowrap rounded-full px-3 py-2 font-sans text-[13px] font-medium uppercase tracking-[0.1em] transition-all',
                    dark ? 'text-surface/85 hover:bg-surface/10 hover:text-surface' : 'text-primary hover:bg-primary/5',
                    active && (dark ? 'bg-surface/15 text-surface' : 'bg-primary/10 text-primary')
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant={dark ? 'ghost' : 'primary'} size="sm" className="hidden md:inline-flex">
              <Link href="/kratisi">Κλείστε Online Θέση</Link>
            </Button>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={cn('grid h-11 w-11 place-items-center rounded-full xl:hidden', dark ? 'text-surface hover:bg-surface/10' : 'text-primary hover:bg-primary/10')}
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
          'fixed inset-0 z-50 bg-deep-ink transition-all duration-500 ease-editorial xl:hidden',
          mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileOpen}
      >
        <div className="flex items-center justify-between px-6 py-5">
          <Link href="/" aria-label="Sergiani Travel — αρχική">
            <Image src="/brand/logo-300x75.png" alt="Sergiani Travel" width={200} height={50} className="h-9 w-auto brightness-0 invert" />
          </Link>
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
            <Link href="/kratisi">Κλείστε Online Θέση</Link>
          </Button>
        </nav>
      </div>
    </>
  );
}
