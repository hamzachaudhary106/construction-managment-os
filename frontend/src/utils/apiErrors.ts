/** Extract validation/error messages from API error response */
export function apiErrors(err: unknown): string[] {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return [];
  if (Array.isArray(data)) return data.map(String);
  if (typeof data.detail === 'string') return [data.detail];
  if (typeof data === 'object' && data !== null) {
    return Object.entries(data).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((e) => `${k}: ${e}`) : [`${k}: ${String(v)}`]
    );
  }
  return [];
}
