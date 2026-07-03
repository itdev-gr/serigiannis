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
  // Editable home-page copy (optional; each field falls back to the content.ts default).
  hero?: { eyebrow?: string; titleTop?: string; titleEmph?: string; subtitle?: string };
  about?: { eyebrow?: string; title?: string; body?: string };
  stats?: { value: number; suffix?: string; label: string }[];
  testimonials?: { name: string; city: string; quote: string }[];
  trust?: { title: string; text: string }[];
  // Editable inner-page hero copy (eyebrow/title/subtitle), keyed by page slug.
  pageHeros?: Record<string, { eyebrow?: string; title?: string; subtitle?: string }>;
  promo?: { eyebrow?: string; title?: string; body?: string; cta?: string };
  process?: { eyebrow?: string; title?: string; steps?: { title: string; text: string }[] };
  poylman?: { valueProps?: { title: string; description: string }[]; routes?: { from: string; to: string; hours: string }[] };
};

export type LeadType = 'contact' | 'quote' | 'booking';
export type LeadStatus = 'new' | 'contacted' | 'booked' | 'completed' | 'cancelled';

export type Lead = {
  id: string;
  type: LeadType;
  status: LeadStatus;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string | null;
  tour_id: string | null;
  preferred_date: string | null;
  party_size: number | null;
  source_path: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  tour_title?: string | null; // joined
};

export type LeadInput = {
  type: LeadType;
  name: string;
  email?: string | null;
  phone?: string | null;
  subject?: string | null;
  message?: string | null;
  tour_id?: string | null;
  preferred_date?: string | null;
  party_size?: number | null;
  source_path?: string | null;
};

export type Client = {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  count: number;
  lastActivity: string;
  leads: Lead[];
};
