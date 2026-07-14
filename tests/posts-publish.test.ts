import { describe, it, expect } from 'vitest';
import { resolvePublishedAt } from '@/lib/posts-publish';

describe('resolvePublishedAt', () => {
  it('uses the explicitly submitted date (noon UTC, stable day in Greece)', () => {
    expect(resolvePublishedAt({ status: 'published', submitted: '2026-03-05', existing: null }))
      .toBe('2026-03-05T12:00:00.000Z');
  });

  it('stamps now on first publish when nothing submitted', () => {
    const out = resolvePublishedAt({ status: 'published', submitted: '', existing: null });
    expect(out).not.toBeNull();
    expect(Math.abs(Date.now() - new Date(out!).getTime())).toBeLessThan(5000);
  });

  it('preserves the existing date on re-save of a published post', () => {
    expect(resolvePublishedAt({ status: 'published', submitted: '', existing: '2026-01-02T10:00:00.000Z' }))
      .toBe('2026-01-02T10:00:00.000Z');
  });

  it('keeps the date when hiding a post (unhide restores ordering)', () => {
    expect(resolvePublishedAt({ status: 'hidden', submitted: '', existing: '2026-01-02T10:00:00.000Z' }))
      .toBe('2026-01-02T10:00:00.000Z');
  });

  it('stays null for a never-published draft', () => {
    expect(resolvePublishedAt({ status: 'draft', submitted: '', existing: null })).toBeNull();
  });
});
