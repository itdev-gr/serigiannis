import { PostForm } from '@/components/admin/PostForm';
import { FlashBanner } from '@/components/admin/FlashBanner';
import { getAdminRoutes } from '@/lib/queries/ticketing';
import { upsertPost } from '../../actions';

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [routes, sp] = await Promise.all([
    getAdminRoutes().then((rs) => rs.filter((r) => r.status === 'published')),
    searchParams,
  ]);
  return (
    <div>
      <h1 className="mb-8 font-display text-4xl font-semibold text-primary">Νέο Άρθρο</h1>
      <div className="mb-6 empty:hidden"><FlashBanner saved={sp.saved} error={sp.error} /></div>
      <PostForm routes={routes} action={upsertPost} />
    </div>
  );
}
