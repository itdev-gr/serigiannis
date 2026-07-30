import Link from 'next/link';
import type { Post } from '@/types/db';
import type { AdminRoute } from '@/lib/queries/ticketing';
import { routeLabel } from '@/lib/ticketing';
import { Button } from '@/components/ui/Button';
import { adminInput, adminLabel } from '@/components/admin/ui';

const STATUSES = [
  { v: 'published', l: 'Δημοσιευμένο' },
  { v: 'draft', l: 'Πρόχειρο' },
  { v: 'hidden', l: 'Κρυμμένο' },
];

export function PostForm({
  post,
  routes = [],
  action,
}: {
  post?: Post | null;
  routes?: AdminRoute[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid max-w-2xl gap-5">
      {post?.id && <input type="hidden" name="id" value={post.id} />}

      <label className="block">
        <span className={adminLabel}>Τίτλος *</span>
        <input name="title" required defaultValue={post?.title ?? ''} className={adminInput} />
      </label>

      <label className="block">
        <span className={adminLabel}>Slug (URL) *</span>
        <input name="slug" required defaultValue={post?.slug ?? ''} className={adminInput} placeholder="π.χ. nea-dromologia-2026" />
      </label>

      <label className="block">
        <span className={adminLabel}>Απόσπασμα</span>
        <textarea name="excerpt" rows={3} defaultValue={post?.excerpt ?? ''} className={adminInput} />
      </label>

      <label className="block">
        <span className={adminLabel}>Κείμενο</span>
        <textarea name="body" rows={12} defaultValue={post?.body ?? ''} className={adminInput} />
      </label>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block">
          <span className={adminLabel}>Ημερομηνία εκδρομής</span>
          <input name="trip_date" type="date" defaultValue={post?.trip_date ?? ''} className={adminInput} />
        </label>
        <label className="block">
          <span className={adminLabel}>Τιμή ανά άτομο (€)</span>
          <input name="price" type="number" min={0} step="0.01" defaultValue={post?.price ?? ''} className={adminInput} />
        </label>
        <label className="block">
          <span className={adminLabel}>Ημερομηνία δημοσίευσης</span>
          <input name="published_on" type="date" defaultValue={post?.published_at ? post.published_at.slice(0, 10) : ''} className={adminInput} />
        </label>
      </div>

      <label className="block">
        <span className={adminLabel}>Σύνδεση με εκδρομή (προαιρετικό)</span>
        <select name="route_id" defaultValue={post?.route_id ?? ''} className={adminInput}>
          <option value="">— Χωρίς σύνδεση —</option>
          {routes.map((r) => <option key={r.id} value={r.id}>{routeLabel(r)}</option>)}
        </select>
        <span className="mt-1.5 block text-[13px] text-muted">
          Αν έχει συνδεθεί εκδρομή, η ημερομηνία/τιμή του συστήματος κρατήσεων υπερισχύουν στο κουμπί κράτησης.
        </span>
      </label>

      <label className="block">
        <span className={adminLabel}>Κατάσταση</span>
        <select name="status" defaultValue={post?.status ?? 'draft'} className={adminInput}>
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </label>

      <label className="block">
        <span className={adminLabel}>SEO Τίτλος</span>
        <input name="seo_title" defaultValue={post?.seo_title ?? ''} className={adminInput} />
      </label>

      <label className="block">
        <span className={adminLabel}>SEO Περιγραφή</span>
        <textarea name="seo_description" rows={3} defaultValue={post?.seo_description ?? ''} className={adminInput} />
      </label>

      <label className="block">
        <span className={adminLabel}>Εικόνα εξωφύλλου</span>
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
