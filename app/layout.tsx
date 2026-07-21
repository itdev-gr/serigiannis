import type { Metadata } from 'next';
import './globals.css';
import { SITE_URL, orgJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Μονοήμερες Εκδρομές από Αθήνα 2026 | Sergiani Travel',
    template: '%s · Sergiani Travel',
  },
  description:
    'Μονοήμερες και πολυήμερες εκδρομές από Αθήνα, κρουαζιέρες, θαλάσσια μπάνια και ενοικιάσεις πούλμαν. Sergiani Travel - ταξίδια με πάθος από το 1995!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd()) }} />
        {children}
      </body>
    </html>
  );
}
