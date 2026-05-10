export function sortCopy<T>(
  items: readonly T[],
  compareFn: (a: T, b: T) => number,
): T[] {
  return items.slice().sort(compareFn);
}
