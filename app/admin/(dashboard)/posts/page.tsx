import Link from 'next/link';
import { Plus, Pencil, Eye, EyeOff, Trash2 } from 'lucide-react';
import { getAdminPosts } from '@/lib/queries/posts';
import { setPostStatus, deletePost } from '../actions';
import { ConfirmForm } from '@/components/admin/ConfirmForm';

const STATUS_STYLE: Record<string, string> = {
  published: 'bg-olive/15 text-olive',
  draft: 'bg-muted/15 text-muted',
  hidden: 'bg-amber/15 text-[#a15c00]',
  archived: 'bg-muted/15 text-muted',
};
const STATUS_LABEL: Record<string, string> = {
  published: 'Δημοσιευμένο', draft: 'Πρόχειρο', hidden: 'Κρυμμένο', archived: 'Αρχειοθετημένο',
};

export default async function AdminPostsPage() {
  const posts = await getAdminPosts();
  const published = posts.filter((p) => p.status === 'published').length;

  return (
    <div>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold text-primary">Νέα</h1>
          <p className="mt-1 text-muted">{posts.length} συνολικά · {published} δημοσιευμένα</p>
        </div>
        <Link href="/admin/posts/new" className="inline-flex items-center gap-1.5 rounded-full bg-cta px-4 py-2 font-sans text-[13px] font-semibold text-surface hover:bg-cta-hover">
          <Plus className="h-4 w-4" strokeWidth={2} /> Νέο Άρθρο
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-border bg-background/50 font-sans text-[12px] uppercase tracking-[0.1em] text-muted">
            <tr>
              <th className="px-5 py-3">Τίτλος</th>
              <th className="px-5 py-3">Κατάσταση</th>
              <th className="px-5 py-3">Ημ/νία δημοσίευσης</th>
              <th className="px-5 py-3 text-right">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-muted">Δεν βρέθηκαν άρθρα.</td></tr>
            )}
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="px-5 py-3">
                  <div className="font-medium text-primary">{p.title}</div>
                  <div className="font-sans text-[12px] text-muted">/{p.slug}</div>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] ${STATUS_STYLE[p.status] ?? ''}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-body">
                  {p.published_at ? new Date(p.published_at).toLocaleDateString('el-GR') : '—'}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <form action={setPostStatus.bind(null, p.id, p.status === 'published' ? 'hidden' : 'published')}>
                      <button type="submit" title={p.status === 'published' ? 'Απόκρυψη' : 'Δημοσίευση'} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-background hover:text-primary">
                        {p.status === 'published' ? <EyeOff className="h-4 w-4" strokeWidth={1.75} /> : <Eye className="h-4 w-4" strokeWidth={1.75} />}
                      </button>
                    </form>
                    <Link href={`/admin/posts/${p.id}/edit`} title="Επεξεργασία" className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-background hover:text-primary">
                      <Pencil className="h-4 w-4" strokeWidth={1.75} />
                    </Link>
                    <ConfirmForm action={deletePost.bind(null, p.id)} message={`Διαγραφή «${p.title}»;`}>
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
