import { isDbConfigured, createServerClient } from '@/lib/supabase/server';

export type TourPresetKind = 'meeting_point' | 'included' | 'not_included';

export type TourPreset = {
  id: string;
  kind: TourPresetKind;
  label: string;
  sort_order: number;
};

/** Οι έτοιμες γραμμές της φόρμας εκδρομής (admin μόνο — το δημόσιο site
 *  διαβάζει πάντα τα text[] πεδία της κάθε εκδρομής). */
export async function getTourPresets(): Promise<TourPreset[]> {
  if (!isDbConfigured()) return [];
  const sb = await createServerClient();
  const { data, error } = await sb
    .from('tour_presets')
    .select('id, kind, label, sort_order')
    .order('sort_order')
    .order('label');
  if (error) {
    console.error('getTourPresets:', error.message);
    return [];
  }
  return (data ?? []) as TourPreset[];
}

export function presetsOfKind(presets: TourPreset[], kind: TourPresetKind): TourPreset[] {
  return presets.filter((p) => p.kind === kind);
}
