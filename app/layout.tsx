import type { Metadata } from 'next';
import './globals.css';
import { SITE_URL, orgJsonLd } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Sergiani Travel · Ταξιδιωτικό Γραφείο από το 1995',
    template: '%s · Sergiani Travel',
  },
  description:
    'Μονοήμερες και πολυήμερες εκδρομές, κρουαζιέρες και ενοικιάσεις πούλμαν από την Αθήνα. 30 χρόνια εμπειρίας.',
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
