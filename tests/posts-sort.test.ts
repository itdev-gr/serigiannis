import { describe, expect, it } from 'vitest';
import { sortPostsForListing } from '@/lib/posts-sort';
import type { Post } from '@/types/db';

const p = (id: string, trip_date: string | null, published_at: string | null): Post =>
  ({ id, trip_date, published_at } as unknown as Post);

describe('sortPostsForListing', () => {
  it('upcoming by trip_date asc, then undated by published_at desc, then past by trip_date desc', () => {
    const posts = [
      p('past-old', '2026-06-01', '2026-05-01'),
      p('undated-new', null, '2026-07-20'),
      p('up-late', '2026-08-10', '2026-07-01'),
      p('undated-old', null, '2026-07-01'),
      p('up-today', '2026-07-30', '2026-07-02'),
      p('past-recent', '2026-07-15', '2026-07-01'),
      p('up-soon', '2026-08-01', '2026-07-03'),
    ];
    const ids = sortPostsForListing(posts, '2026-07-30').map((x) => x.id);
    expect(ids).toEqual(['up-today', 'up-soon', 'up-late', 'undated-new', 'undated-old', 'past-recent', 'past-old']);
  });

  it('does not mutate the input array', () => {
    const posts = [p('a', '2026-08-01', null), p('b', '2026-07-31', null)];
    sortPostsForListing(posts, '2026-07-30');
    expect(posts[0].id).toBe('a');
  });
});
