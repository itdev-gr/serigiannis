import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeading } from '@/components/shared/PageHeading';
import { ToursExplorer } from '@/components/trips/ToursExplorer';
import { getTours } from '@/lib/queries/tours';
import { getCategories } from '@/lib/queries/categories';
import { CATEGORY_SEO } from '@/data/category-seo';

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
  // Οι έξι βασικές κατηγορίες έχουν γραμμένο τίτλο/περιγραφή με τις φράσεις που
  // ψάχνει ο κόσμος (data/category-seo.ts)· ό,τι άλλο παίρνει το γενικό μοτίβο.
  const seo = CATEGORY_SEO[cat.slug];
  return {
    title: seo ? { absolute: seo.title } : `${cat.name_el} Εκδρομές`,
    description: seo?.description ?? `${cat.name_el} εκδρομές από την Αθήνα με τη Sergiani Travel.`,
    alternates: { canonical: `/ekdromes/${cat.slug}` },
    openGraph: {
      title: seo?.heading ?? `${cat.name_el} Εκδρομές`,
      description: seo?.description ?? `${cat.name_el} εκδρομές από την Αθήνα με τη Sergiani Travel.`,
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const [tours, categories] = await Promise.all([getTours(), getCategories()]);
  const cat = categories.find((c) => c.slug === category);
  if (!cat) notFound();
  const seo = CATEGORY_SEO[cat.slug];

  return (
    <>
      <PageHeading
        eyebrow="Εκδρομές"
        title={seo?.heading ?? `${cat.name_el} Εκδρομές`}
        subtitle={seo?.subtitle ?? cat.description_el ?? `Οργανωμένες ${cat.name_el.toLowerCase()} εκδρομές από την Αθήνα.`}
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Εκδρομές', href: '/ekdromes' }, { label: cat.name_el }]}
      />
      <section className="pb-16 pt-4 md:pb-24 md:pt-6">
        <div className="container">
          {seo && (
            // Το εισαγωγικό κείμενο δίνει στη Google το θέμα της σελίδας· για τον
            // επισκέπτη είναι δύο σύντομες παράγραφοι πριν από τον κατάλογο.
            <div data-testid="category-intro" className="mb-10 max-w-3xl space-y-4 text-[16px] leading-relaxed text-body">
              {seo.intro.map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </div>
          )}
          <ToursExplorer tours={tours} categories={categories} lockedCategory={cat.slug} />
        </div>
      </section>
    </>
  );
}
