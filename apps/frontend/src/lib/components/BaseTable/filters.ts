export function normalizeFilterValue<T = string>(filterValue: unknown): T[] {
  if (Array.isArray(filterValue)) return filterValue as T[];
  return filterValue != null ? [filterValue as T] : [];
}
