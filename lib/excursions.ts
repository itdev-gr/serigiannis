export type RouteDateRow = { route_id: string; service_date: string };

/** Group list_route_dates rows into route_id -> sorted unique ISO dates. */
export function groupRouteDates(rows: RouteDateRow[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const arr = map.get(r.route_id) ?? [];
    if (!arr.includes(r.service_date)) arr.push(r.service_date);
    map.set(r.route_id, arr);
  }
  for (const arr of map.values()) arr.sort();
  return map;
}

/** Admin textarea (one boarding point per line) -> clean array. */
export function parseBoardingPoints(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}
