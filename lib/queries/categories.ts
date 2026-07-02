import { isDbConfigured, createPublicClient } from '@/lib/supabase/server';
import { seedCategories } from '@/data/seed/tours';
import type { Category } from '@/types/db';

export async function getCategories(): Promise<Category[]> {
  if (!isDbConfigured()) return seedCategories;
  const sb = createPublicClient();
  const { data, error } = await sb.from('categories').select('*').order('sort_order');
  if (error) {
    console.error('getCategories:', error.message);
    return [];
  }
  return (data ?? []) as Category[];
}
