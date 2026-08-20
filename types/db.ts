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
  /** Ποιο εβδομαδιαίο πρόγραμμα τη γέννησε — null στις χειροκίνητες (0035). */
  pattern_id?: string | null;
};

/** Εβδομαδιαίο πρόγραμμα αναχωρήσεων εκδρομής (0035) — «κάθε Σάββατο, 50 θέσεις». */
export type TourDeparturePattern = {
  id: string;
  tour_id: string;
  /** extract(dow): 0=Κυριακή … 6=Σάββατο. */
  weekdays: number[];
  valid_from: string; // 'YYYY-MM-DD'
  valid_to: string | null;
  capacity: number | null;
  note: string | null;
  is_active: boolean;
};

export type Tour = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  /** Σύντομη περιγραφή 1–2 προτάσεων (0032) — η εισαγωγική παράγραφος κάτω από
   *  τον τίτλο στη σελίδα της εκδρομής. Το summary μένει μόνο στην ενότητα
   *  «Περιγραφή» πιο κάτω. */
  short_description: string | null;
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
  /** «Τι θα δείτε» — μία σειρά ανά αξιοθέατο/εμπειρία (0030). Κενό = η ενότητα
   *  δεν εμφανίζεται καθόλου στη σελίδα της εκδρομής. */
  highlights: string[];
  /** Τι καλύπτει η τιμή (0030) — μία σειρά ανά παροχή. */
  included: string[];
  /** Τι ΔΕΝ καλύπτει η τιμή (0030) — μία σειρά ανά έξοδο του ταξιδιώτη. */
  not_included: string[];
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

/** One traveller captured on a tour order (sanitised server-side: name, phone
 *  and — από το 0027, όταν η εκδρομή έχει meeting_points — το σημείο επιβίβασης.
 *  Το κλειδί λείπει σε παραγγελίες προ-0027 και σε εκδρομές χωρίς σημεία). */
export type TourPassenger = { name: string; phone: string | null; meeting_point?: string | null };

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
  /** Παράγωγο (0027): το κοινό σημείο επιβίβασης όλων των ταξιδιωτών, null
   *  όταν διαφέρουν, πριν το checkout, ή σε εκδρομές χωρίς meeting_points.
   *  Η πηγή αλήθειας είναι το passengers[].meeting_point. */
  meeting_point: string | null;
  payment_provider: string | null;
  /** card | iris | wallet | other — από το μητρώο συναλλαγών Viva (0034). */
  payment_method: string | null;
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
  marketing_opt_in?: boolean;
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
