import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CookieConsent } from '@/components/layout/CookieConsent';
import { getSettings } from '@/lib/queries/settings';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  // Fallback: settings rows saved before phone24h existed — reuse the first mobile (69…) number.
  const phone24h = s.phone24h ?? s.phones.find((p) => p.replace(/\s/g, '').startsWith('69')) ?? null;
  return (
    <>
      <a href="#main" className="skip-link">Μετάβαση στο περιεχόμενο</a>
      <Navbar phones={s.phones} phone24h={phone24h} />
      {children}
      <Footer />
      <CookieConsent />
    </>
  );
}
