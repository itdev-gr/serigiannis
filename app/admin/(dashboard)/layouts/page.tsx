import Link from 'next/link';
import { getAdminLayouts } from '@/lib/queries/ticketing';
import { deleteLayout } from '../ticketing-actions';
import { Button } from '@/components/ui/Button';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { searchNormalize } from '@/lib/filters';

export default async function LayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; q?: string }>;
}) {
  const [allLayouts, sp] = await Promise.all([getAdminLayouts(), searchParams]);
  const q = sp.q;
  const layouts = q
    ? allLayouts.filter((l) => searchNormalize(l.name).includes(searchNormalize(q)))
    : allLayouts;
  return (
    <div className="max-w-3xl">
      <FlashBanner saved={sp.saved} error={sp.error} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold text-primary">Λεωφορεία (Διατάξεις)</h1>
        <Button asChild><Link href="/admin/layouts/new">+ Νέα διάταξη</Link></Button>
      </div>
      <p className="mt-2 text-[14px] text-muted">
        Οι κατόψεις θέσεων που ανατίθενται στα δρομολόγια. Η αλλαγή διάταξης δεν επηρεάζει ήδη υλοποιημένα δρομολόγια.
      </p>

      <div className="mt-4 flex">
        <AdminSearch action="/admin/layouts" placeholder="Αναζήτηση ονόματος διάταξης…" defaultValue={q} />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-surface">
        {layouts.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 last:border-0">
            <Link href={`/admin/layouts/${l.id}`} className="font-medium text-primary hover:underline">{l.name}</Link>
            <div className="flex items-center gap-4">
              <span className="text-[13px] text-muted">
                {l.layout.decks.length > 1 ? 'Διώροφο' : 'Μονώροφο'} · {l.online_seats_total} θέσεις online
                {!l.is_active && ' · Ανενεργή'}
              </span>
              <ConfirmForm action={deleteLayout.bind(null, l.id)} message={`Διαγραφή διάταξης «${l.name}»; Θα αποτύχει αν χρησιμοποιείται σε δρομολόγια.`}>
                <button type="submit" className="text-[13px] text-cta hover:underline">Διαγραφή</button>
              </ConfirmForm>
            </div>
          </div>
        ))}
        {layouts.length === 0 && <p className="px-4 py-6 text-[14px] text-muted">Δεν υπάρχουν διατάξεις.</p>}
      </div>
    </div>
  );
}
