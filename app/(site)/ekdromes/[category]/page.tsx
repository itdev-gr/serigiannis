import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeading } from '@/components/shared/PageHeading';
import { ToursExplorer } from '@/components/trips/ToursExplorer';
import { getTours } from '@/lib/queries/tours';
import { getCategories } from '@/lib/queries/categories';

// Δίχτυ ασφαλείας: χωρίς αυτό οι σελίδες κατηγοριών έμεναν παγωμένες από το
// build αν ξέφευγε κάποια ρητή ακύρωση (revalidatePublic).
export const revalidate = 300;

const CATEGORY_SLUGS = ['monoimeres', 'polyimeres', 'thalassia-mpania', 'kroyazieres', 'pezopories', 'eksoterikou'];

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const categories = await getCategories();
  const cat = categories.find((c) => c.slug === category);
  if (!cat) return {};
  return {
    title: `${cat.name_el} Εκδρομές`,
    description: `${cat.name_el} εκδρομές από την Αθήνα με τη Sergiani Travel.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const [tours, categories] = await Promise.all([getTours(), getCategories()]);
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();

  return (
    <>
      <PageHeading
        eyebrow="Εκδρομές"
        title={`${cat.name_el} Εκδρομές`}
        subtitle={cat.description_el ?? `Οργανωμένες ${cat.name_el.toLowerCase()} εκδρομές από την Αθήνα.`}
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Εκδρομές', href: '/ekdromes' }, { label: cat.name_el }]}
      />
      <section className="pb-16 pt-4 md:pb-24 md:pt-6">
        <div className="container">
          <ToursExplorer tours={tours} categories={categories} lockedCategory={cat.slug} />
        </div>
      </section>
    </>
  );
}
