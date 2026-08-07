import { notFound } from 'next/navigation';
import type { Post } from '@/types/db';
import { createServerClient } from '@/lib/supabase/server';
import { PostForm } from '@/components/admin/PostForm';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { getAdminRoutes } from '@/lib/queries/ticketing';
import { routeLabel } from '@/lib/ticketing';
import { upsertPost } from '../../../actions';

export default async function EditPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id } = await params;
  const sb = await createServerClient();
  const [{ data: post }, allRoutes, sp] = await Promise.all([
    sb.from('posts').select('*').eq('id', id).maybeSingle(),
    getAdminRoutes(),
    searchParams,
  ]);
  if (!post) notFound();
  const routes = allRoutes.filter((r) => r.status === 'published');
  // Keep the post's currently-linked route selectable even if it's a draft,
  // so saving doesn't silently clear the link.
  const linkedId = (post as Post).route_id;
  if (linkedId && !routes.some((r) => r.id === linkedId)) {
    const linked = allRoutes.find((r) => r.id === linkedId);
    if (linked) routes.push({ ...linked, title: `${routeLabel(linked)} (πρόχειρη)` });
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-4xl font-semibold text-primary">Επεξεργασία</h1>
      <p className="mb-8 text-muted">{(post as Post).title}</p>
      <div className="mb-6 empty:hidden"><FlashBanner saved={sp.saved} error={sp.error} /></div>
      <PostForm post={post as Post} routes={routes} action={upsertPost} />
    </div>
  );
}
