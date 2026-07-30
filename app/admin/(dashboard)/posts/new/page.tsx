import { PostForm } from '@/components/admin/PostForm';
import { getAdminRoutes } from '@/lib/queries/ticketing';
import { upsertPost } from '../../actions';

export default async function NewPostPage() {
  const routes = (await getAdminRoutes()).filter((r) => r.status === 'published');
  return (
    <div>
      <h1 className="mb-8 font-display text-4xl font-semibold text-primary">Νέο Άρθρο</h1>
      <PostForm routes={routes} action={upsertPost} />
    </div>
  );
}
