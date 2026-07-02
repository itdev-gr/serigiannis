import { isDbConfigured, createPublicClient } from '@/lib/supabase/server';
import { seedSettings } from '@/data/seed/tours';
import type { SettingsData } from '@/types/db';

export async function getSettings(): Promise<SettingsData> {
  if (!isDbConfigured()) return seedSettings;
  const sb = createPublicClient();
  const { data, error } = await sb.from('settings').select('data').eq('id', 1).maybeSingle();
  if (error || !data) {
    if (error) console.error('getSettings:', error.message);
    return seedSettings;
  }
  return data.data as SettingsData;
}
