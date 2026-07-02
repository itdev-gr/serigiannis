// Hand-written DB types mirroring supabase/migrations. After the schema is applied,
// regenerate with: supabase gen types typescript > types/db.ts

export type TourStatus = 'draft' | 'published' | 'hidden' | 'archived';

export type Category = {
  id: string;
  slug: string;
  name_el: string;
  description_el: string | null;
  sort_order: number;
};

export type TourImage = {
  id: string;
  tour_id: string;
  storage_path: string;
  alt_el: string | null;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  position: number;
};

export type Tour = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  body: Record<string, unknown>;
  price_from: number | null;
  price_original: number | null;
  currency: string;
  duration_label: string | null;
  departure_note: string | null;
  meeting_point: string | null;
  status: TourStatus;
  is_featured: boolean;
  cover_image_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  source_url: string | null;
  sort_order: number;
  published_at: string | null;
  // Joined/derived (populated by the data layer):
  categories?: Category[];
  images?: TourImage[];
  next_departure?: string | null;
};

export type SettingsData = {
  phones: string[];
  address: string;
  email: string;
  hours: { weekdays: string; saturday: string };
  social?: { facebook?: string; instagram?: string; youtube?: string };
};
