// src/pages/MonoimeresPage.tsx
import { useMemo, useState } from 'react';
import { PageHero } from '@/components/shared/PageHero';
import { TripCard } from '@/components/trips/TripCard';
import { SortBar, type SortKey } from '@/components/trips/SortBar';
import { Pagination } from '@/components/trips/Pagination';
import { RevealOnScroll } from '@/components/shared/RevealOnScroll';
import { trips } from '@/data/trips';

const PAGE_SIZE = 9;

export default function MonoimeresPage() {
  const [sort, setSort] = useState<SortKey>('popular');
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const arr = [...trips];
    switch (sort) {
      case 'price-asc': return arr.sort((a, b) => a.priceFrom - b.priceFrom);
      case 'price-desc': return arr.sort((a, b) => b.priceFrom - a.priceFrom);
      case 'date': return arr; // dates are non-comparable strings; keep insertion
      case 'popular':
      default: return arr.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
  }, [sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHero
        photo="https://images.unsplash.com/photo-1533760881669-80db4d7b341a?w=2000&q=85"
        photoAlt="Ελληνική παραλία"
        breadcrumbs={[{ label: 'Αρχική', to: '/' }, { label: 'Εκδρομές' }, { label: 'Μονοήμερες' }]}
        eyebrow="2026"
        title="Μονοήμερες Εκδρομές από την Αθήνα"
        subtitle="Επιλέξτε από 30+ προορισμούς — Ύδρα, Μετέωρα, Δελφοί, Σούνιο και πολλούς ακόμη."
      />
      <section className="py-16 md:py-24">
        <div className="container">
          <p className="mx-auto max-w-prose text-center font-display text-[19px] italic leading-relaxed text-muted">
            Κάθε Σαββατοκύριακο ξεκινάμε από τον σταθμό μας στο Περιστέρι και σας πάμε στα πιο όμορφα σημεία της Ελλάδας. Χωρίς άγχος, χωρίς οργάνωση από εσάς.
          </p>
          <SortBar value={sort} onChange={(v) => { setSort(v); setPage(1); }} />
          <RevealOnScroll className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((trip) => (
              <div key={trip.id} data-reveal><TripCard trip={trip} /></div>
            ))}
          </RevealOnScroll>
          <Pagination current={page} total={totalPages} onChange={setPage} />
        </div>
      </section>
    </>
  );
}
