import { notFound } from 'next/navigation';
import type { Post } from '@/types/db';
import { createServerClient } from '@/lib/supabase/server';
import { PostForm } from '@/components/admin/PostForm';
import { upsertPost } from '../../../actions';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createServerClient();
  const { data: post } = await sb.from('posts').select('*').eq('id', id).maybeSingle();
  if (!post) notFound();

  return (
    <div>
      <h1 className="mb-2 font-display text-4xl font-semibold text-primary">Επεξεργασία</h1>
      <p className="mb-8 text-muted">{(post as Post).title}</p>
      <PostForm post={post as Post} action={upsertPost} />
    </div>
  );
}
