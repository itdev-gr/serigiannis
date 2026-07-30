import type { Post } from '@/types/db';

/**
 * ΝΕΑ listing order (client request): the excursions that are coming up appear
 * first, soonest date first; undated articles follow (newest first); excursions
 * whose date has passed go last (most recent first).
 */
export function sortPostsForListing(posts: Post[], todayIso: string): Post[] {
  const upcoming = posts
    .filter((p) => p.trip_date && p.trip_date >= todayIso)
    .sort((a, b) => a.trip_date!.localeCompare(b.trip_date!));
  const undated = posts
    .filter((p) => !p.trip_date)
    .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''));
  const past = posts
    .filter((p) => p.trip_date && p.trip_date < todayIso)
    .sort((a, b) => b.trip_date!.localeCompare(a.trip_date!));
  return [...upcoming, ...undated, ...past];
}
