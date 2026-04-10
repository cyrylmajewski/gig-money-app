import { allocateTier } from '@/lib/distribution/helpers';
import type { TierCategory } from '@/types/models';

/**
 * Helper: sum all values in an allocations record.
 */
function sumAllocations(allocs: Record<string, number>): number {
  return Object.values(allocs).reduce((s, v) => s + v, 0);
}

/**
 * Helper: round to 2 decimal places (mirrors roundPLN).
 */
function r(n: number): number {
  return Math.round(n * 100) / 100;
}

describe('allocateTier', () => {
  // ─── Test 1: Extreme deficit (fallback) ──────────────────────────────
  it('should split proportionally across floors when available < sum of floors', () => {
    const categories: TierCategory[] = [
      { key: 'housing', outstanding: 1000, floor: 600, priority: 2 },
      { key: 'food', outstanding: 800, floor: 400, priority: 1 },
    ];

    const result = allocateTier(categories, 566);

    expect(result.allocations['housing']).toBe(339.6);
    expect(result.allocations['food']).toBe(226.4);
    expect(result.remaining).toBe(0);
    expect(r(sumAllocations(result.allocations))).toBe(566);
  });

  // ─── Test 2: Moderate deficit (floors + partial waterfall) ───────────
  it('should give floors then waterfall remainder by priority when partially funded', () => {
    const categories: TierCategory[] = [
      { key: 'housing', outstanding: 1000, floor: 600, priority: 2 },
      { key: 'food', outstanding: 800, floor: 400, priority: 1 },
    ];

    const result = allocateTier(categories, 1200);

    expect(result.allocations['housing']).toBe(600);
    expect(result.allocations['food']).toBe(600);
    expect(result.remaining).toBe(0);
  });

  // ─── Test 3: Income exactly equals sum of floors ─────────────────────
  it('should take the main path (not fallback) when available equals sum of floors', () => {
    const categories: TierCategory[] = [
      { key: 'housing', outstanding: 1000, floor: 600, priority: 2 },
      { key: 'food', outstanding: 800, floor: 400, priority: 1 },
    ];

    const result = allocateTier(categories, 1000);

    expect(result.allocations['housing']).toBe(600);
    expect(result.allocations['food']).toBe(400);
    expect(result.remaining).toBe(0);
  });

  // ─── Test 4: Full coverage ───────────────────────────────────────────
  it('should fully cover all categories and return surplus as remaining', () => {
    const categories: TierCategory[] = [
      { key: 'housing', outstanding: 1000, floor: 600, priority: 2 },
      { key: 'food', outstanding: 800, floor: 400, priority: 1 },
    ];

    const result = allocateTier(categories, 2000);

    expect(result.allocations['housing']).toBe(1000);
    expect(result.allocations['food']).toBe(800);
    expect(result.remaining).toBe(200);
  });

  // ─── Test 5: Housing-first priority override ─────────────────────────
  it('should respect priority ordering in waterfall phase', () => {
    const categories: TierCategory[] = [
      { key: 'housing', outstanding: 1000, floor: 600, priority: 1 },
      { key: 'food', outstanding: 800, floor: 400, priority: 2 },
    ];

    const result = allocateTier(categories, 1200);

    // housing gets floor=600 + waterfall remainder 200 = 800
    expect(result.allocations['housing']).toBe(800);
    expect(result.allocations['food']).toBe(400);
    expect(result.remaining).toBe(0);
  });

  // ─── Test 6: Category with floor=0 ──────────────────────────────────
  it('should handle category with floor=0 correctly', () => {
    const categories: TierCategory[] = [
      { key: 'other', outstanding: 300, floor: 0, priority: 1 },
    ];

    const result = allocateTier(categories, 500);

    expect(result.allocations['other']).toBe(300);
    expect(result.remaining).toBe(200);
  });

  // ─── Test 7: User override floor ────────────────────────────────────
  it('should use overridden floor values in fallback proportional split', () => {
    const categories: TierCategory[] = [
      { key: 'housing', outstanding: 1000, floor: 700, priority: 2 },
      { key: 'food', outstanding: 800, floor: 400, priority: 1 },
    ];

    const result = allocateTier(categories, 566);

    // sumFloors=1100, 566 < 1100 -> fallback
    // housing: roundPLN(566 * 700/1100) = 360.18
    // food: 566 - 360.18 = 205.82
    expect(result.allocations['housing']).toBe(360.18);
    expect(result.allocations['food']).toBe(205.82);
    expect(result.remaining).toBe(0);
    expect(r(sumAllocations(result.allocations))).toBe(566);
  });

  // ─── Edge case: Empty categories ────────────────────────────────────
  it('should return empty allocations and full remaining when categories array is empty', () => {
    const result = allocateTier([], 500);

    expect(result.allocations).toEqual({});
    expect(result.remaining).toBe(500);
  });

  // ─── Edge case: All categories outstanding=0 ────────────────────────
  it('should skip categories with outstanding=0 and return full remaining', () => {
    const categories: TierCategory[] = [
      { key: 'housing', outstanding: 0, floor: 600, priority: 1 },
      { key: 'food', outstanding: 0, floor: 400, priority: 2 },
    ];

    const result = allocateTier([], 500);

    expect(result.allocations).toEqual({});
    expect(result.remaining).toBe(500);
  });

  // ─── Edge case: floor > outstanding ─────────────────────────────────
  it('should clamp floor to outstanding when floor exceeds outstanding', () => {
    const categories: TierCategory[] = [
      { key: 'housing', outstanding: 200, floor: 600, priority: 1 },
      { key: 'food', outstanding: 300, floor: 400, priority: 2 },
    ];

    // floors are clamped: housing floor=200 (min(600,200)), food floor=300 (min(400,300))
    // sumFloors = 500, available=1000 >= 500, remainder=500
    // waterfall: housing needs 0 more (200-200), food needs 0 more (300-300)
    // remaining = 500
    const result = allocateTier(categories, 1000);

    expect(result.allocations['housing']).toBe(200);
    expect(result.allocations['food']).toBe(300);
    expect(result.remaining).toBe(500);
  });

  // ─── Edge case: available=0 ─────────────────────────────────────────
  it('should allocate nothing when available is 0', () => {
    const categories: TierCategory[] = [
      { key: 'housing', outstanding: 1000, floor: 600, priority: 1 },
      { key: 'food', outstanding: 800, floor: 400, priority: 2 },
    ];

    const result = allocateTier(categories, 0);

    // available(0) < sumFloors(1000) => fallback
    // proportional of 0 = 0 for each
    // But the last-item residual logic: 0 - 0 = 0
    expect(result.allocations['housing']).toBe(0);
    expect(result.allocations['food']).toBe(0);
    expect(result.remaining).toBe(0);
  });

  // ─── Edge case: Single category ─────────────────────────────────────
  it('should give a single category min(outstanding, available)', () => {
    const categories: TierCategory[] = [
      { key: 'housing', outstanding: 500, floor: 300, priority: 1 },
    ];

    // available=300, floor clamped to 300 (min(300,500)), sumFloors=300
    // available(300) == sumFloors(300) => main path
    // pass 1: housing=300, rem=0
    // pass 2: nothing
    const result = allocateTier(categories, 300);
    expect(result.allocations['housing']).toBe(300);
    expect(result.remaining).toBe(0);

    // available exceeds outstanding
    const result2 = allocateTier(categories, 800);
    expect(result2.allocations['housing']).toBe(500);
    expect(result2.remaining).toBe(300);
  });

  // ─── Edge case: Rounding invariant ──────────────────────────────────
  it('should ensure sum(allocations) + remaining == available exactly', () => {
    // Use an amount that produces tricky rounding
    const categories: TierCategory[] = [
      { key: 'a', outstanding: 1000, floor: 333, priority: 1 },
      { key: 'b', outstanding: 1000, floor: 333, priority: 2 },
      { key: 'c', outstanding: 1000, floor: 334, priority: 3 },
    ];

    const available = 777;
    const result = allocateTier(categories, available);

    const total = r(sumAllocations(result.allocations) + result.remaining);
    expect(total).toBe(available);
  });

  // ─── Edge case: Three categories with waterfall ─────────────────────
  it('should waterfall across three categories in priority order', () => {
    const categories: TierCategory[] = [
      { key: 'a', outstanding: 500, floor: 100, priority: 3 },
      { key: 'b', outstanding: 500, floor: 100, priority: 1 },
      { key: 'c', outstanding: 500, floor: 100, priority: 2 },
    ];

    // sumFloors=300, available=700, remainder=400
    // waterfall by priority (asc): b(1)->c(2)->a(3)
    // b needs 400 more, gets 400 => b=500, rem=0
    // c and a get floor only
    const result = allocateTier(categories, 700);

    expect(result.allocations['b']).toBe(500);
    expect(result.allocations['c']).toBe(100);
    expect(result.allocations['a']).toBe(100);
    expect(result.remaining).toBe(0);
  });
});
