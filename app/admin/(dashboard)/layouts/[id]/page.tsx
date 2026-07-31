import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminLayout } from '@/lib/queries/ticketing';
import { upsertLayout } from '../../ticketing-actions';
import { Button } from '@/components/ui/Button';
import { LayoutEditor } from '@/components/admin/LayoutEditor';
import { adminInput } from '@/components/admin/ui';
import { FlashBanner } from '@/components/admin/FlashBanner';

export default async function LayoutDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const isNew = id === 'new';
  const layout = isNew ? null : await getAdminLayout(id);
  if (!isNew && !layout) notFound();

  return (
    <div className="max-w-4xl">
      <p className="mb-2 text-[13px]"><Link href="/admin/layouts" className="text-muted hover:text-primary">← Λεωφορεία</Link></p>
      <FlashBanner saved={sp.saved} error={sp.error} />
      <h1 className="font-display text-4xl font-semibold text-primary">
        {isNew ? 'Νέα διάταξη' : layout!.name}
      </h1>

      <form action={upsertLayout} className="mt-6 grid gap-5">
        {!isNew && <input type="hidden" name="id" value={layout!.id} />}
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
          <label className="block text-[13px] text-muted">Όνομα
            <input name="name" defaultValue={layout?.name ?? ''} required className={adminInput} />
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
