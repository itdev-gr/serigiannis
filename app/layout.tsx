import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
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
      <body>{children}</body>
    </html>
  );
}
