import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminLayout } from '@/lib/queries/ticketing';
import { upsertLayout } from '../../ticketing-actions';
import { Button } from '@/components/ui/Button';
import { LayoutEditor } from '@/components/admin/LayoutEditor';

const inputCls = 'w-full rounded-md border border-border bg-surface px-3 py-2 font-sans text-[14px] text-body focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';

export default async function LayoutDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === 'new';
  const layout = isNew ? null : await getAdminLayout(id);
  if (!isNew && !layout) notFound();

  return (
    <div className="max-w-4xl">
      <p className="mb-2 text-[13px]"><Link href="/admin/layouts" className="text-muted hover:text-primary">← Λεωφορεία</Link></p>
      <h1 className="font-display text-4xl font-semibold text-primary">
        {isNew ? 'Νέα διάταξη' : layout!.name}
      </h1>

      <form action={upsertLayout} className="mt-6 grid gap-5">
        {!isNew && <input type="hidden" name="id" value={layout!.id} />}
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <label className="block text-[13px] text-muted">Όνομα
            <input name="name" defaultValue={layout?.name ?? ''} required className={inputCls} />
          </label>
          <label className="mt-6 flex items-center gap-2 text-[14px] text-body">
            <input type="checkbox" name="is_active" defaultChecked={layout?.is_active ?? true} className="h-4 w-4" /> Ενεργή
          </label>
        </div>
        <LayoutEditor initial={layout?.layout ?? null} />
        <div><Button type="submit" size="lg">Αποθήκευση διάταξης</Button></div>
      </form>
    </div>
  );
}
