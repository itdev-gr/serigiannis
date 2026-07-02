import Link from 'next/link';
import { Pencil, Eye, EyeOff, Star, Trash2, Plus } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { setStatus, setFeatured, deleteTour } from '../actions';
import { ConfirmForm } from '@/components/admin/ConfirmForm';

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-olive/15 text-olive',
  draft: 'bg-muted/15 text-muted',
  hidden: 'bg-amber/15 text-[#a15c00]',
  archived: 'bg-muted/15 text-muted',
};
const STATUS_LABEL: Record<string, string> = {
  published: 'Δημοσιευμένη', draft: 'Πρόχειρη', hidden: 'Κρυμμένη', archived: 'Αρχειοθετημένη',
};

export default async function AdminToursPage() {
  const sb = await createServerClient();
  const { data: tours } = await sb
    .from('tours')
    .select('id, slug, title, status, is_featured, price_from')
    .order('sort_order');
  const rows = tours ?? [];
  const published = rows.filter((t) => t.status === 'published').length;

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold text-primary">Εκδρομές</h1>
          <p className="mt-1 text-muted">{rows.length} συνολικά · {published} δημοσιευμένες</p>
        </div>
        <Link href="/admin/tours/new" className="inline-flex items-center gap-1.5 rounded-full bg-cta px-4 py-2 font-sans text-[13px] font-semibold text-surface hover:bg-cta-hover">
          <Plus className="h-4 w-4" strokeWidth={2} /> Νέα Εκδρομή
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-background/50 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <tr>
              <th className="px-5 py-3">Τίτλος</th>
              <th className="px-5 py-3">Κατάσταση</th>
              <th className="px-5 py-3">Τιμή</th>
              <th className="px-5 py-3 text-right">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3">
                  <div className="font-medium text-primary">{t.title}</div>
                  <div className="font-sans text-[12px] text-muted">/{t.slug}</div>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] ${STATUS_STYLE[t.status] ?? ''}`}>
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-body">{t.price_from != null ? `από ${t.price_from}€` : '—'}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <form action={setFeatured.bind(null, t.id, !t.is_featured)}>
                      <button type="submit" title={t.is_featured ? 'Αφαίρεση από προβεβλημένες' : 'Προβολή στην αρχική'} className={`grid h-8 w-8 place-items-center rounded-md hover:bg-background ${t.is_featured ? 'text-gold' : 'text-muted'}`}>
                        <Star className="h-4 w-4" strokeWidth={1.75} fill={t.is_featured ? 'currentColor' : 'none'} />
                      </button>
                    </form>
                    <form action={setStatus.bind(null, t.id, t.status === 'published' ? 'hidden' : 'published')}>
                      <button type="submit" title={t.status === 'published' ? 'Απόκρυψη' : 'Δημοσίευση'} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-background hover:text-primary">
                        {t.status === 'published' ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                      </button>
                    </form>
                    <Link href={`/admin/tours/${t.id}/edit`} title="Επεξεργασία" className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-background hover:text-primary">
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    </Link>
                    <ConfirmForm action={deleteTour.bind(null, t.id)} message={`Διαγραφή «${t.title}»;`}>
                      <button type="submit" title="Διαγραφή" className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-cta/10 hover:text-cta">
                        <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </ConfirmForm>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
