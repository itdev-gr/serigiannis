import Link from 'next/link';
import { Compass, Phone, Search } from 'lucide-react';
import { PageHeading } from '@/components/shared/PageHeading';
import { NotFoundSuggestions } from '@/components/shared/NotFoundSuggestions';
import { Button } from '@/components/ui/Button';
import { getCategories } from '@/lib/queries/categories';
import { getSettings } from '@/lib/queries/settings';
import { telHref } from '@/lib/phone';

/** Η σελίδα «δεν βρέθηκε» για όλο το δημόσιο site.
 *
 *  Παλιότερα ο επισκέπτης έπαιρνε την προεπιλογή του Next — «404 | This page
 *  could not be found», στα αγγλικά, χωρίς καμία διέξοδο. Επειδή οι εκδρομές
 *  διαγράφονται και μετονομάζονται, αυτή η σελίδα είναι συχνά η ΠΡΩΤΗ που
 *  βλέπει κάποιος που ήρθε από το Google. Οπότε: ελληνικά, με προτάσεις για
 *  αυτό που έψαχνε, και με τηλέφωνο. */
export default async function SiteNotFound() {
  const [categories, settings] = await Promise.all([getCategories(), getSettings()]);
  const phone = settings.phones[0] ?? null;

  return (
    <>
      <PageHeading
        eyebrow="Σελίδα που δεν βρέθηκε"
        title="Δεν βρήκαμε αυτή τη σελίδα"
        subtitle="Ίσως η εκδρομή ολοκληρώθηκε ή άλλαξε διεύθυνση. Δείτε παρακάτω τι μπορεί να σας ενδιαφέρει."
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Δεν βρέθηκε' }]}
      />

      <section className="pb-20">
        <div className="container max-w-3xl">
          <NotFoundSuggestions />

          <div className="mt-10 rounded-lg border border-border bg-surface p-6">
            <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.14em] text-primary">
              Δείτε τις εκδρομές μας
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/ekdromes"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 font-sans text-[14px] font-medium text-surface transition-colors hover:bg-primary/90 motion-reduce:transition-none"
              >
                <Compass className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Όλες οι εκδρομές
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/ekdromes/${c.slug}`}
                  className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 font-sans text-[14px] text-body transition-colors hover:border-primary hover:text-primary motion-reduce:transition-none"
                >
                  {c.name_el}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Button asChild variant="accent" size="lg">
              <Link href="/eisitiria">
                <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
                Κλείστε Online Θέση
              </Link>
            </Button>
            {phone && (
              <span className="font-sans text-[15px] text-muted">
                Ή καλέστε μας:{' '}
                <a href={telHref(phone)} className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-cta">
                  <Phone className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  {phone}
                </a>
              </span>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
