import type {
  Debt,
  DeferredPayment,
  MonthlyCoverage,
  MonthlyNeeds,
  TierCategory,
  TierResult,
} from '@/types/models';

/**
 * Round a number to 2 decimal places (grosze precision).
 * Uses banker-safe rounding via Math.round.
 */
export function roundPLN(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Get the YYYY-MM string for a given date (or current date if omitted).
 */
export function getMonthKey(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Find or create the MonthlyCoverage record for the current month.
 * Returns a copy -- does not mutate the input array.
 */
export function getCurrentMonthlyCoverage(
  coverages: MonthlyCoverage[],
  date?: Date,
): MonthlyCoverage {
  const key = getMonthKey(date);
  const existing = coverages.find((c) => c.month === key);
  if (existing) {
    return { ...existing, needs: { ...existing.needs }, minimumPayments: { ...existing.minimumPayments } };
  }
  return {
    month: key,
    needs: { housing: 0, food: 0, transport: 0, other: 0 },
    minimumPayments: {},
  };
}

/**
 * Calculate how much of each need category is still outstanding this month.
 * Returns an object with the same shape as MonthlyNeeds where each value
 * is max(0, need - alreadyCovered).
 */
export function getOutstandingNeeds(
  needs: MonthlyNeeds,
  coverage: MonthlyCoverage,
): MonthlyNeeds {
  return {
    housing: roundPLN(Math.max(0, needs.housing - (coverage.needs.housing ?? 0))),
    food: roundPLN(Math.max(0, needs.food - (coverage.needs.food ?? 0))),
    transport: roundPLN(Math.max(0, needs.transport - (coverage.needs.transport ?? 0))),
    other: roundPLN(Math.max(0, needs.other - (coverage.needs.other ?? 0))),
  };
}

/**
 * For each active debt, calculate the outstanding minimum payment for this month.
 * The minimum payment is capped at the debt's remainingAmount (never overpay).
 * Returns a map of debtId -> outstanding minimum.
 */
export function getOutstandingMinimums(
  debts: Debt[],
  coverage: MonthlyCoverage,
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const debt of debts) {
    if (debt.closedAt !== null || debt.remainingAmount <= 0) continue;

    const alreadyPaid = coverage.minimumPayments[debt.id] ?? 0;
    const effectiveMinimum = Math.min(debt.minimumPayment, debt.remainingAmount);
    const outstanding = roundPLN(Math.max(0, effectiveMinimum - alreadyPaid));

    if (outstanding > 0) {
      result[debt.id] = outstanding;
    }
  }

  return result;
}

/**
 * Determine the snowball target: the active debt with the smallest remainingAmount.
 * Ties are broken alphabetically by label (stable sort).
 * Debts with remainingAmount <= 0 or closedAt !== null are excluded.
 */
export function getSnowballTarget(debts: Debt[]): Debt | null {
  const active = debts.filter((d) => d.closedAt === null && d.remainingAmount > 0);

  if (active.length === 0) return null;

  active.sort((a, b) => {
    if (a.remainingAmount !== b.remainingAmount) {
      return a.remainingAmount - b.remainingAmount;
    }
    return a.label.localeCompare(b.label);
  });

  return active[0];
}

/**
 * Get unresolved deferred payments, sorted oldest first (FIFO by deferredAt).
 */
export function getUnresolvedDeferred(
  payments: DeferredPayment[],
): DeferredPayment[] {
  return [...payments]
    .filter((p) => !p.resolved)
    .sort((a, b) => a.deferredAt.localeCompare(b.deferredAt));
}

/**
 * Filter debts to only active ones (not closed, positive remaining balance).
 */
export function getActiveDebts(debts: Debt[]): Debt[] {
  return debts.filter((d) => d.closedAt === null && d.remainingAmount > 0);
}

/**
 * Default floor ratios per need category.
 * These define the minimum guaranteed share of the outstanding amount.
 */
const DEFAULT_FLOOR_RATIOS: Record<string, number> = {
  food: 0.50,
  housing: 0.60,
  transport: 0.30,
  other: 0,
};

/**
 * Get the default floor (minimum guaranteed allocation) for a need category.
 * The floor is a ratio of the outstanding amount.
 */
export function getDefaultFloor(category: string, outstanding: number): number {
  const ratio = DEFAULT_FLOOR_RATIOS[category] ?? 0;
  return roundPLN(ratio * outstanding);
}

/**
 * Allocate available funds within a single tier using Floor + Waterfall.
 *
 * 3-phase algorithm:
 *   1. FALLBACK: if available < sum of floors, split proportionally across floors
 *   2. PASS 1: give each category its floor
 *   3. PASS 2: waterfall by priority (ascending) for the remainder above floors
 *
 * Does NOT mutate the input array.
 *
 * @param categories - Tier categories with outstanding amounts, floors, and priorities
 * @param available  - Total funds available for this tier
 * @returns Allocations per category and leftover for the next tier
 */
export function allocateTier(
  categories: TierCategory[],
  available: number,
): TierResult {
  // Filter out zero-outstanding categories
  const active = categories
    .filter((c) => c.outstanding > 0)
    .map((c) => ({ ...c, floor: Math.min(c.floor, c.outstanding) }));

  if (active.length === 0) return { allocations: {}, remaining: available };

  const sumFloors = roundPLN(active.reduce((s, c) => s + c.floor, 0));
  const result: Record<string, number> = {};

  // FALLBACK: extreme deficit -- proportional split across floors
  if (available < sumFloors) {
    if (sumFloors === 0) {
      return { allocations: {}, remaining: available };
    }
    let distributed = 0;
    for (let i = 0; i < active.length; i++) {
      if (i === active.length - 1) {
        // Last category absorbs rounding residue
        result[active[i].key] = roundPLN(available - distributed);
      } else {
        const share = roundPLN(available * (active[i].floor / sumFloors));
        result[active[i].key] = share;
        distributed = roundPLN(distributed + share);
      }
    }
    return { allocations: result, remaining: 0 };
  }

  // PASS 1: give floors to everyone
  for (const c of active) {
    result[c.key] = c.floor;
  }
  let rem = roundPLN(available - sumFloors);

  // PASS 2: waterfall by priority for the remainder
  const sorted = [...active].sort((a, b) => a.priority - b.priority);
  for (const c of sorted) {
    const need = roundPLN(c.outstanding - c.floor);
    const give = roundPLN(Math.min(need, rem));
    result[c.key] = roundPLN(result[c.key] + give);
    rem = roundPLN(rem - give);
    if (rem <= 0) break;
  }

  return { allocations: result, remaining: rem };
}
