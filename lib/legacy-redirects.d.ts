/** Τύποι για το lib/legacy-redirects.mjs (JS επειδή το φορτώνει το next.config). */
export const LEGACY_PATH_REDIRECTS: Record<string, string>;
export const LEGACY_PREFIX_REDIRECTS: Record<string, string>;
export function legacyRedirects(): { source: string; destination: string; permanent: boolean }[];
