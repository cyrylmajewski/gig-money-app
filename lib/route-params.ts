export type RouteParamValue = string | string[] | undefined;

export function parseJsonParam<T>(
  value: RouteParamValue,
  fallback: T,
): T {
  if (typeof value !== 'string') return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
