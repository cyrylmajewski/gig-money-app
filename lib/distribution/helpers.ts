import type {
  Debt,
  DeferredPayment,
  MonthlyCoverage,
  MonthlyNeeds,
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
