/**
 * Decide a post's published_at. Never resets an existing date on re-save;
 * an explicit form date always wins; first publish stamps "now".
 */
export function resolvePublishedAt(opts: {
  status: string;
  submitted: string; // 'YYYY-MM-DD' from the admin form, '' when empty
  existing: string | null; // current DB value (null for new posts)
}): string | null {
  if (opts.submitted) return new Date(`${opts.submitted}T12:00:00Z`).toISOString();
  if (opts.status === 'published' && !opts.existing) return new Date().toISOString();
  return opts.existing;
}
