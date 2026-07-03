import Link from 'next/link';
import type { Post } from '@/types/db';
import { Button } from '@/components/ui/Button';

const inputCls =
  'w-full rounded-md border border-border bg-surface px-4 py-2.5 font-sans text-[15px] text-body transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10';
const labelCls = 'mb-1.5 block font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-primary';

const STATUSES = [
  { v: 'published', l: 'Δημοσιευμένο' },
  { v: 'draft', l: 'Πρόχειρο' },
  { v: 'hidden', l: 'Κρυμμένο' },
];

export function PostForm({
  post,
  action,
}: {
  post?: Post | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid max-w-2xl gap-5">
      {post?.id && <input type="hidden" name="id" value={post.id} />}

      <label className="block">
        <span className={labelCls}>Τίτλος *</span>
        <input name="title" required defaultValue={post?.title ?? ''} className={inputCls} />
      </label>

      <label className="block">
        <span className={labelCls}>Slug (URL) *</span>
        <input name="slug" required defaultValue={post?.slug ?? ''} className={inputCls} placeholder="π.χ. nea-dromologia-2026" />
      </label>

      <label className="block">
        <span className={labelCls}>Απόσπασμα</span>
        <textarea name="excerpt" rows={3} defaultValue={post?.excerpt ?? ''} className={inputCls} />
      </label>

      <label className="block">
        <span className={labelCls}>Κείμενο</span>
        <textarea name="body" rows={12} defaultValue={post?.body ?? ''} className={inputCls} />
      </label>

      <label className="block">
        <span className={labelCls}>Κατάσταση</span>
        <select name="status" defaultValue={post?.status ?? 'draft'} className={inputCls}>
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </label>

      <label className="block">
        <span className={labelCls}>SEO Τίτλος</span>
        <input name="seo_title" defaultValue={post?.seo_title ?? ''} className={inputCls} />
      </label>

      <label className="block">
        <span className={labelCls}>SEO Περιγραφή</span>
        <textarea name="seo_description" rows={3} defaultValue={post?.seo_description ?? ''} className={inputCls} />
      </label>

      <label className="block">
        <span className={labelCls}>Εικόνα εξωφύλλου</span>
        <input
          name="cover"
          type="file"
          accept="image/*"
          className="block text-[14px] text-muted file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:font-sans file:text-[13px] file:font-semibold file:text-surface"
        />
      </label>

      <div className="mt-2 flex items-center gap-4">
        <Button type="submit" size="lg">Αποθήκευση</Button>
        <Link href="/admin/posts" className="font-sans text-[14px] font-semibold text-muted hover:text-primary">Άκυρο</Link>
      </div>
    </form>
  );
}
