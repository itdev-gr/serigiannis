// Bus ticketing domain types (mirror supabase/migrations/0007-0010).

export type TripKind = 'oneway' | 'round' | 'open_return';
export type OrderStatus = 'pending' | 'awaiting_payment' | 'paid' | 'offline' | 'cancelled' | 'expired';
export type TicketStatus = 'valid' | 'used' | 'cancelled';
export type SeatCellType = 'seat' | 'aisle' | 'driver' | 'door' | 'wc' | 'stairs' | 'empty';

export type SeatCell = {
  r: number;
  c: number;
  type: SeatCellType;
  seat?: string;
  online?: boolean;
};

export type LayoutDeck = { name: string; rows: number; cols: number; cells: SeatCell[] };
export type LayoutJson = { decks: LayoutDeck[] };

export type Station = {
  id: string;
  slug: string;
  name: string;
  code: string | null;
  position: number;
  is_active: boolean;
};

export type BusRoute = {
  id: string;
  origin_station_id: string;
  destination_station_id: string;
  status: 'draft' | 'published';
  duration_min: number | null;
  sales_cutoff_min: number | null;
  position: number;
  title: string | null;
  boarding_points: string[];
};

export type FareType = {
  id: string;
  route_id: string;
  name: string;
  description: string | null;
  price_oneway_cents: number;
  price_round_cents: number;
  requires_document: boolean;
  is_default: boolean;
  position: number;
  is_active: boolean;
};

export type BusLayout = {
  id: string;
  name: string;
  layout: LayoutJson;
  online_seats_total: number;
  is_active: boolean;
};

export type SchedulePattern = {
  id: string;
  route_id: string;
  layout_id: string;
  departure_time: string;
  weekdays: number[];
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
  notes: string | null;
};

export type Trip = {
  id: string;
  pattern_id: string | null;
  route_id: string;
  layout_id: string;
  service_date: string;
  departure_at: string;
  status: 'scheduled' | 'cancelled';
  sales_cutoff_min: number | null;
  online_seats_total: number;
  notes: string | null;
};

export type BookingSettings = {
  hold_minutes: number;
  sales_window_days: number;
  default_cutoff_min: number;
  refund_cutoff_hours: number;
  refund_pct_early: number;
  refund_pct_late: number;
  open_return_months: number;
};

/** Row returned by the search_trips RPC. */
export type TripRow = {
  id: string;
  time: string;
  departure_at: string;
  seats_available: number;
  double_decker: boolean;
  departed: boolean;
  bookable: boolean;
};

export type SearchResult =
  | {
      ok: true;
      route: { id: string; title?: string | null; origin_id: string; destination_id: string; duration_min: number | null };
      trips: TripRow[];
    }
  | { ok: false; error: string };

/** Bundle returned by the get_order_by_token RPC. */
export type OrderLeg = {
  leg: 'outbound' | 'return';
  trip_id: string;
  route_id: string;
  service_date: string;
  departure_at: string;
  time: string;
  origin: string;
  destination: string;
  seats: string[];
};

export type OrderTicket = {
  id: string;
  code: string;
  leg: 'outbound' | 'return';
  passenger_key: number;
  trip_id: string | null;
  seat_no: string | null;
  passenger_name: string;
  passenger_phone: string | null;
  fare_name: string;
  fare_basis: 'oneway' | 'round' | 'open_return';
  price_cents: number;
  status: TicketStatus;
  open_return: boolean;
  open_return_expires_on: string | null;
  refunded_cents: number | null;
  /** Σημείο επιβίβασης του επιβάτη (0027) — μόνο στο outbound σκέλος·
   *  λείπει/null σε return, open-return και εισιτήρια προ-0027. */
  boarding_point?: string | null;
  /** Προαιρετικό email του ίδιου του επιβάτη (0029) — όταν υπάρχει, του
   *  στέλνεται ξεχωριστά το δικό του εισιτήριο. Γράφεται σε όλα τα σκέλη. */
  passenger_email?: string | null;
};

export type OrderFare = {
  id: string;
  name: string;
  description: string | null;
  price_oneway_cents: number;
  price_round_cents: number;
  is_default: boolean;
};

export type OrderBundle =
  | {
      ok: true;
      order: {
        id: string;
        public_code: string;
        kind: TripKind;
        status: OrderStatus;
        expires_at: string | null;
        customer_name: string | null;
        email: string | null;
        phone: string | null;
        boarding_point: string | null;
        amount_total_cents: number;
        payment_provider: string | null;
        /** card | iris | wallet | other — από το μητρώο συναλλαγών Viva (0034). */
        payment_method: string | null;
        paid_at: string | null;
        created_at: string;
      };
      legs: OrderLeg[];
      tickets: OrderTicket[];
      fares: OrderFare[];
      /** Η λίστα σημείων επιβίβασης της διαδρομής (0027) — για τον επιλογέα
       *  ανά επιβάτη στο checkout. Optional: λείπει σε βάση προ-0027. */
      boarding_points?: string[];
    }
  | { ok: false; error: string };

/** Public wizard: a bookable excursion (published route + its scheduled dates). */
export type Excursion = {
  id: string;
  title: string;
  boarding_points: string[];
  dates: string[];
};
