'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Pencil, Eye, EyeOff, Star, Trash2, Search } from 'lucide-react';
import type { Category } from '@/types/db';
import type { AdminTourRow } from '@/lib/queries/tours';
import { setStatus, setFeatured, deleteTour } from '@/app/admin/(dashboard)/actions';
import { ConfirmForm } from '@/components/admin/ConfirmForm';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-olive/15 text-olive',
  draft: 'bg-muted/15 text-muted',
  hidden: 'bg-amber/15 text-[#a15c00]',
  archived: 'bg-muted/15 text-muted',
};
const STATUS_LABEL: Record<string, string> = {
  published: 'Δημοσιευμένη', draft: 'Πρόχειρη', hidden: 'Κρυμμένη', archived: 'Αρχειοθετημένη',
};

function tabCls(active: boolean) {
  return cn(
    'rounded-full border px-3.5 py-1.5 font-sans text-[13px] transition-colors',
    active ? 'border-primary bg-primary text-surface' : 'border-border text-body hover:border-primary'
  );
}

export function AdminToursTable({ tours, categories }: { tours: AdminTourRow[]; categories: Category[] }) {
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tours.filter((t) => {
      const catOk = cat === 'all' || t.categories.some((c) => c.slug === cat);
      const qOk = !term || t.title.toLowerCase().includes(term) || t.slug.toLowerCase().includes(term);
      return catOk && qOk;
    });
  }, [tours, cat, q]);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCat('all')} className={tabCls(cat === 'all')}>Όλες</button>
          {categories.map((c) => (
            <button key={c.slug} type="button" onClick={() => setCat(c.slug)} className={tabCls(cat === c.slug)}>{c.name_el}</button>
          ))}
        </div>
        <div className="relative lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.75} aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Αναζήτηση εκδρομής…"
            aria-label="Αναζήτηση εκδρομής"
            className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-[14px] text-body focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      <p className="mb-3 text-[13px] text-muted">{filtered.length} από {tours.length} εκδρομές</p>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-background/50 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <tr>
              <th className="px-5 py-3">Τίτλος</th>
              <th className="px-5 py-3">Κατηγορίες</th>
              <th className="px-5 py-3">Κατάσταση</th>
              <th className="px-5 py-3">Τιμή</th>
              <th className="px-5 py-3 text-right">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">Δεν βρέθηκαν εκδρομές.</td></tr>
            )}
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3">
                  <div className="font-medium text-primary">{t.title}</div>
                  <div className="font-sans text-[12px] text-muted">/{t.slug}</div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {t.categories.length === 0 && <span className="text-[12px] text-muted">—</span>}
                    {t.categories.map((c) => (
                      <span key={c.slug} className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 font-sans text-[11px] font-medium text-primary">{c.name_el}</span>
                    ))}
                  </div>
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
    </>
  );
}
