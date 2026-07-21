'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X, Ship, MapPin, Bus, Mail, Home as HomeIcon, Newspaper, Phone, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { telHref } from '@/lib/phone';

const NAV_ITEMS = [
  { to: '/', label: 'Αρχική', icon: HomeIcon },
  { to: '/ekdromes', label: 'Εκδρομές', icon: MapPin },
  { to: '/enoikiaseis-poylman', label: 'Ενοικιάσεις Πούλμαν και Μίνι Βαν', icon: Bus },
  { to: '/eisitiria', label: 'Εισιτήρια', icon: Ticket },
  { to: '/kroyazieres', label: 'Κρουαζιέρες', icon: Ship },
  { to: '/nea', label: 'Νέα', icon: Newspaper },
  { to: '/epikoinonia', label: 'Επικοινωνία', icon: Mail },
];

function isActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(to + '/');
}

function phoneDigits(phone: string): string {
  return phone.replace(/\s+/g, '');
}

export function Navbar({ phones = [], phone24h = null }: { phones?: string[]; phone24h?: string | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [heroHeaderSolid, setHeroHeaderSolid] = useState(() => pathname !== '/');
  const solidHeader = !isHome || heroHeaderSolid;
  const collapseTopBar = isHome && heroHeaderSolid;
  const topBarPhones =
    phone24h != null
      ? phones.filter((p) => phoneDigits(p) !== phoneDigits(phone24h))
      : phones;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isHome) {
      setHeroHeaderSolid(true);
      return;
    }
    setHeroHeaderSolid(false);
    const onScroll = () => setHeroHeaderSolid(window.scrollY > 32);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isHome]);

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-40 w-full pb-3 transition-[background-color,border-color,box-shadow] duration-300 ease-editorial',
          solidHeader
            ? 'border-b border-border bg-surface shadow-sm'
            : 'border-b border-white/15 bg-transparent'
        )}
      >
        <div
          className={cn(
            'hidden w-full transition-[grid-template-rows,opacity,border-color] duration-300 ease-editorial sm:grid',
            collapseTopBar ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
            !collapseTopBar && (solidHeader ? 'border-b border-border' : 'border-b border-white/15')
          )}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-3 pt-2 sm:px-6 lg:px-8">
              <div className="flex h-10 w-full items-center justify-between gap-4 font-sans text-[14px] md:text-[15px]">
                <div className="flex items-center gap-6">
                  {topBarPhones.map((p) => (
                    <a
                      key={p}
                      href={telHref(p)}
                      className={cn(
                        'flex items-center gap-2 font-bold transition-colors',
                        solidHeader ? 'text-primary hover:text-primary-hover' : 'text-white hover:text-gold'
                      )}
                    >
                      <Phone className="h-4 w-4 shrink-0 md:h-[18px] md:w-[18px]" strokeWidth={1.75} /> {p}
                    </a>
                  ))}
                </div>
                {phone24h && (
                  <a
                    href={telHref(phone24h)}
                    className={cn(
                      'flex items-center gap-2 font-bold transition-colors',
                      solidHeader ? 'text-primary hover:text-primary-hover' : 'text-white hover:text-gold'
                    )}
                  >
                    <Phone className="h-4 w-4 shrink-0 md:h-[18px] md:w-[18px]" strokeWidth={1.75} /> 24ωρο: {phone24h}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        <div
          className={cn(
            'flex w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8',
            collapseTopBar ? 'pt-2' : 'pt-4'
          )}
        >
          <Link href="/" className="flex shrink-0 items-center" aria-label="Sergiani Travel, αρχική">
            <Image
              src={solidHeader ? '/brand/logo.svg' : '/brand/logo-white.svg'}
              alt="Sergiani Travel"
              width={152}
              height={48}
              priority
              className="h-10 w-auto md:h-12"
            />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex" aria-label="Κύρια πλοήγηση">
            {NAV_ITEMS.map(({ to, label }) => {
              const active = isActive(pathname, to);
              return (
                <Link
                  key={to}
                  href={to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'whitespace-nowrap px-3 py-2.5 font-sans text-[15px] font-medium uppercase tracking-[0.08em] transition-colors duration-200',
                    solidHeader ? 'text-black hover:text-primary' : 'text-white hover:text-white/85',
                    active && solidHeader && 'text-primary',
                    active && !solidHeader && 'text-white'
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              asChild
              variant={solidHeader ? 'primary' : 'accent'}
              size="sm"
              className={cn('hidden md:inline-flex', !solidHeader && 'shadow-none')}
            >
              <Link href="/kratisi">Κλείστε Online Θέση</Link>
            </Button>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={cn(
                'grid h-[3.25rem] w-[3.25rem] place-items-center rounded-full transition-colors xl:hidden',
                solidHeader ? 'text-black hover:bg-black/5' : 'text-white hover:bg-white/10'
              )}
              aria-label="Άνοιγμα μενού"
            >
              <Menu className="h-8 w-8" strokeWidth={1.75} />
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
          <Link href="/" aria-label="Sergiani Travel, αρχική">
            <Image src="/brand/logo-white.svg" alt="Sergiani Travel" width={152} height={48} className="h-10 w-auto" />
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
          <Link
            href="/kratisi"
            className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-md bg-surface font-sans text-[16px] font-semibold tracking-[0.02em] text-primary transition-colors hover:bg-surface/90"
          >
            Κλείστε Online Θέση
          </Link>
        </nav>
      </div>
    </>
  );
}
