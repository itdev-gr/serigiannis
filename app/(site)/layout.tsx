import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Μετάβαση στο περιεχόμενο</a>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
