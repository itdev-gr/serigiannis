import type { Tour } from '@/types/db';

/**
 * Newest non-featured published tours for the home "Προτεινόμενες εκδρομές" section.
 *
 * The migrated data has no structured departure dates (tour_departures is empty,
 * departure_note is null), so we can't filter by an actual "upcoming" date. Recency
 * is the best available relevance proxy: higher `sort_order` == later-migrated ==
 * current-season tours, while old/expired tours (e.g. 2024 Christmas trips) sit at
 * the low end. Sorting desc surfaces the relevant ones and buries the stale ones.
 * Featured tours are excluded because they already appear in the listing section.
 */
export function pickNewsTours(tours: Tour[], limit = 3): Tour[] {
  return tours
    .filter((t) => !t.is_featured)
    .slice()
    .sort((a, b) => b.sort_order - a.sort_order)
    .slice(0, limit);
}
