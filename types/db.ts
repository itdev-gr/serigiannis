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

/** A bookable price category of a tour («Το άτομο σε δίκλινο», «Παιδιά έως 9 ετών»…). */
export type TourPriceTier = {
  id: string;
  tour_id: string;
  label: string;
  price_cents: number;
  price_original_cents: number | null;
  max_qty: number;
  position: number;
  is_active: boolean;
};

/** A departure date offered on the tour page. */
export type TourDeparture = {
  id: string;
  tour_id: string;
  starts_on: string; // 'YYYY-MM-DD'
  ends_on: string | null;
  note: string | null;
  capacity: number | null;
  is_active: boolean;
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
  /** Optional selectable meeting points (admin textarea, one per line). Empty
   *  by default — the customer only sees a picker at checkout when this is
   *  non-empty, mirroring bus_routes.boarding_points. */
  meeting_points: string[];
  /** Προαιρετική σύνδεση με bookable εκδρομή πούλμαν (bus_routes.id): η σελίδα
   *  δείχνει τότε στον οδηγό κρατήσεων. Ποτέ δεν αντιγράφει τιμές ή ημερομηνίες. */
  route_id: string | null;
  status: TourStatus;
  is_featured: boolean;
  bookings_open: boolean;
  cover_image_id: string | null;
  seo_title: string | null;
  seo_description: string | null;
  source_url: string | null;
  sort_order: number;
  published_at: string | null;
  // Joined/derived (populated by the data layer):
  categories?: Category[];
  images?: TourImage[];
  price_tiers?: TourPriceTier[];
  departures?: TourDeparture[];
  next_departure?: string | null;
};

/** One line of a tour order — snapshotted at order time (labels/prices frozen). */
export type TourOrderItem = {
  tier_id: string;
  label: string;
  unit_cents: number;
  qty: number;
  line_cents: number;
};

export type TourOrderStatus = 'pending' | 'awaiting_payment' | 'paid' | 'offline' | 'cancelled' | 'expired';

/** One traveller captured on a tour order (sanitised server-side: only name + phone kept). */
export type TourPassenger = { name: string; phone: string | null };

export type TourOrder = {
  id: string;
  public_code: string;
  status: TourOrderStatus;
  expires_at: string | null;
  tour_id: string | null;
  tour_title: string;
  tour_slug: string | null;
  departure_date: string | null;
  items: TourOrderItem[];
  party_size: number;
  amount_total_cents: number;
  customer_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  passengers: TourPassenger[];
  /** The customer's chosen meeting point, once finalize_tour_order has stored
   *  it — null before checkout and for tours without meeting_points. */
  meeting_point: string | null;
  payment_provider: string | null;
  paid_at: string | null;
  created_at: string;
};

/** get_tour_order_by_token RPC result. meeting_points is the tour's own list
 *  (not a TourOrder field) — read alongside the order so the checkout page
 *  can render the picker without a second round trip. */
export type TourOrderBundle =
  | { ok: true; order: TourOrder; meeting_points: string[] }
  | { ok: false; error: string };

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_path: string | null;
  status: TourStatus;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  trip_date: string | null; // 'YYYY-MM-DD' — ημερομηνία εκδρομής
  price: number | null;     // per-person €, drives booking total
  route_id: string | null;  // linked bookable excursion (bus_routes.id) — deep-link CTA
  created_at: string;
  updated_at: string;
};

export type SettingsData = {
  phones: string[];
  phone24h?: string; // 24ωρο κινητό, shown in the header top bar
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
  // Editable home-page section headings (eyebrow/title/subtitle), each falling back to content.ts defaults.
  homeSections?: {
    destinations?: { eyebrow?: string; title?: string; subtitle?: string };
    listing?: { eyebrow?: string; title?: string; subtitle?: string };
    testimonials?: { eyebrow?: string; title?: string };
    news?: { eyebrow?: string; title?: string; subtitle?: string };
    cta?: { title?: string; body?: string };
  };
  poylman?: { valueProps?: { title: string; description: string }[]; routes?: { from: string; to: string; hours: string }[] };
  // Editable legal page bodies (plain text, paragraphs separated by a blank line).
  // If unset/empty, the hardcoded default sections render unchanged.
  legal?: { terms?: string; privacy?: string };
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
  // Anti-spam (not stored): honeypot must stay empty; ts is the form-render timestamp (ms).
  hp?: string;
  ts?: number;
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
