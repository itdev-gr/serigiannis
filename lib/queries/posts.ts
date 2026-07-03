import { isDbConfigured, createPublicClient, createServerClient } from '@/lib/supabase/server';
import type { Post } from '@/types/db';

export async function getPosts(): Promise<Post[]> {
  if (!isDbConfigured()) return [];
  const sb = createPublicClient();
  const { data, error } = await sb
    .from('posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) {
    console.error('getPosts:', error.message);
    return [];
  }
  return (data ?? []) as Post[];
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (!isDbConfigured()) return null;
  const sb = createPublicClient();
  const { data, error } = await sb
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) {
    console.error('getPostBySlug:', error.message);
    return null;
  }
  return (data as Post) ?? null;
}

export async function getPublishedPostSlugs(): Promise<string[]> {
  return (await getPosts()).map((p) => p.slug);
}

/** Admin list read (all statuses, session-scoped via RLS). */
export async function getAdminPosts(): Promise<Post[]> {
  if (!isDbConfigured()) return [];
  const sb = await createServerClient();
  const { data, error } = await sb
    .from('posts')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    console.error('getAdminPosts:', error.message);
    return [];
  }
  return (data ?? []) as Post[];
}
