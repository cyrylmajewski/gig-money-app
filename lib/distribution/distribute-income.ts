import type {
  Allocation,
  AppState,
  DeferredPayment,
  MonthlyNeeds,
} from '@/types/models';
import {
  allocateTier,
  getActiveDebts,
  getCurrentMonthlyCoverage,
  getDefaultFloor,
  getOutstandingMinimums,
  getOutstandingNeeds,
  getSnowballTarget,
  getUnresolvedDeferred,
  roundPLN,
} from './helpers';

/**
 * Resolve the floor for a given need category, respecting user overrides.
 * If an override exists, it is clamped to the outstanding amount.
 * Otherwise, the default ratio-based floor is used.
 */
function getFloorForCategory(
  category: keyof MonthlyNeeds,
  outstanding: number,
  overrides?: Partial<Record<keyof MonthlyNeeds, number>>,
): number {
  if (overrides?.[category] !== undefined) {
    return roundPLN(Math.min(overrides[category]!, outstanding));
  }
  return getDefaultFloor(category, outstanding);
}

/**
 * Distribute an income amount across the 5-step priority order.
 *
 * Priority order:
 *   1. Deferred payments (oldest first, FIFO)
 *   2. Housing + food needs (outstanding this month)
 *   3. Minimum debt payments (all active debts)
 *   4. Transport + other needs (outstanding this month)
 *   5. Extra snowball payment (smallest remaining balance first)
 *
 * This is a pure function: it reads state but never mutates it.
 * The caller is responsible for applying the result to the store.
 *
 * @param amount - Income received in PLN (must be > 0 for any allocation)
 * @param state  - Current app state snapshot
 * @param date   - Optional date override (defaults to now); used for month key
 * @returns An Allocation object ready to attach to an Income record
 */
export function distributeIncome(
  amount: number,
  state: AppState,
  date?: Date,
): Allocation {
  // Guard: zero or negative income -> empty allocation
  if (amount <= 0) {
    return emptyAllocation();
  }

  let remaining = roundPLN(amount);

  const coverage = getCurrentMonthlyCoverage(state.monthlyCoverage, date);
  const outstanding = getOutstandingNeeds(state.monthlyNeeds, coverage);
  const activeDebts = getActiveDebts(state.debts);
  const unresolvedDeferred = getUnresolvedDeferred(state.deferredPayments);

  // ── Step 1: Deferred payments — skipped (manual-only feature) ────────

  const deferredTotal = 0;

  // ── Step 2: Housing + food (Floor + Waterfall) ────────────────────────

  const foodFirst = (state.settings.tier1PriorityOrder ?? 'food_first') === 'food_first';
  const tier1 = allocateTier([
    { key: 'housing', outstanding: outstanding.housing, floor: getFloorForCategory('housing', outstanding.housing, state.settings.floorOverrides), priority: foodFirst ? 2 : 1 },
    { key: 'food', outstanding: outstanding.food, floor: getFloorForCategory('food', outstanding.food, state.settings.floorOverrides), priority: foodFirst ? 1 : 2 },
  ], remaining);
  const housingAlloc = tier1.allocations['housing'] ?? 0;
  const foodAlloc = tier1.allocations['food'] ?? 0;
  remaining = tier1.remaining;

  // ── Step 3: Minimum debt payments ─────────────────────────────────────

  const outstandingMins = getOutstandingMinimums(activeDebts, coverage);
  const minimumPayments: Record<string, number> = {};

  // Determine total outstanding minimums to enable proportional allocation
  const totalMinsNeeded = roundPLN(
    Object.values(outstandingMins).reduce((sum, v) => sum + v, 0),
  );

  if (totalMinsNeeded > 0) {
    if (remaining >= totalMinsNeeded) {
      // Enough to cover all minimums
      for (const [debtId, needed] of Object.entries(outstandingMins)) {
        minimumPayments[debtId] = needed;
      }
      remaining = roundPLN(remaining - totalMinsNeeded);
    } else {
      // Not enough -- allocate proportionally
      let distributed = 0;
      const entries = Object.entries(outstandingMins);

      for (let i = 0; i < entries.length; i++) {
        const [debtId, needed] = entries[i];
        if (i === entries.length - 1) {
          // Last entry gets the remainder to avoid rounding drift
          const share = roundPLN(remaining - distributed);
          if (share > 0) minimumPayments[debtId] = share;
        } else {
          const share = roundPLN((needed / totalMinsNeeded) * remaining);
          if (share > 0) minimumPayments[debtId] = share;
          distributed = roundPLN(distributed + share);
        }
      }
      remaining = 0;
    }
  }

  // ── Step 4: Transport + other needs (Floor + Waterfall) ───────────────

  const tier3 = allocateTier([
    { key: 'transport', outstanding: outstanding.transport, floor: getFloorForCategory('transport', outstanding.transport, state.settings.floorOverrides), priority: 1 },
    { key: 'other', outstanding: outstanding.other, floor: getFloorForCategory('other', outstanding.other, state.settings.floorOverrides), priority: 2 },
  ], remaining);
  const transportAlloc = tier3.allocations['transport'] ?? 0;
  const otherAlloc = tier3.allocations['other'] ?? 0;
  remaining = tier3.remaining;

  // ── Step 5: Extra snowball payment ────────────────────────────────────

  let extraDebtPayment: Allocation['extraDebtPayment'] = null;

  if (remaining > 0) {
    const snowballTarget = getSnowballTarget(activeDebts);
    if (snowballTarget) {
      // Don't pay more than the remaining balance (minus what was already
      // allocated as a minimum in this same distribution)
      const alreadyAllocated = minimumPayments[snowballTarget.id] ?? 0;
      const coveredThisMonth = coverage.minimumPayments[snowballTarget.id] ?? 0;
      const maxExtra = roundPLN(
        snowballTarget.remainingAmount - alreadyAllocated - coveredThisMonth,
      );
      const snowballAmount = roundPLN(Math.min(remaining, Math.max(0, maxExtra)));

      if (snowballAmount > 0) {
        extraDebtPayment = {
          debtId: snowballTarget.id,
          amount: snowballAmount,
        };
        remaining = roundPLN(remaining - snowballAmount);
      }
    }
  }

  // ── Build result ──────────────────────────────────────────────────────

  return {
    deferredPayments: deferredTotal,
    needs: {
      housing: housingAlloc,
      food: foodAlloc,
      transport: transportAlloc,
      other: otherAlloc,
    },
    minimumPayments,
    extraDebtPayment,
    unallocated: roundPLN(remaining),
    wasAdjustedByUser: false,
  };
}

/**
 * Produce a new list of DeferredPayment records that should be created
 * when income is insufficient to cover all higher-priority tiers.
 *
 * Call this after distributeIncome() to determine what shortfalls remain.
 *
 * @param allocation - The result from distributeIncome()
 * @param state      - Current app state snapshot
 * @param date       - Optional date override for the deferredAt timestamp
 * @returns Array of new DeferredPayment records (not yet resolved)
 */
export function computeNewDeferredPayments(
  allocation: Allocation,
  state: AppState,
  date?: Date,
): DeferredPayment[] {
  const now = (date ?? new Date()).toISOString();
  const coverage = getCurrentMonthlyCoverage(state.monthlyCoverage, date);
  const outstanding = getOutstandingNeeds(state.monthlyNeeds, coverage);
  const activeDebts = getActiveDebts(state.debts);
  const outstandingMins = getOutstandingMinimums(activeDebts, coverage);
  const result: DeferredPayment[] = [];
  let counter = 0;

  const makeId = () => {
    counter++;
    return `deferred-${Date.now()}-${counter}`;
  };

  // Check housing shortfall
  const housingShortfall = roundPLN(outstanding.housing - allocation.needs.housing);
  if (housingShortfall > 0) {
    result.push({
      id: makeId(),
      kind: 'need',
      needCategory: 'housing',
      amount: housingShortfall,
      deferredAt: now,
      reason: 'postponing',
      resolved: false,
    });
  }

  // Check food shortfall
  const foodShortfall = roundPLN(outstanding.food - allocation.needs.food);
  if (foodShortfall > 0) {
    result.push({
      id: makeId(),
      kind: 'need',
      needCategory: 'food',
      amount: foodShortfall,
      deferredAt: now,
      reason: 'postponing',
      resolved: false,
    });
  }

  // Check transport shortfall
  const transportShortfall = roundPLN(outstanding.transport - allocation.needs.transport);
  if (transportShortfall > 0) {
    result.push({
      id: makeId(),
      kind: 'need',
      needCategory: 'transport',
      amount: transportShortfall,
      deferredAt: now,
      reason: 'postponing',
      resolved: false,
    });
  }

  // Check other shortfall
  const otherShortfall = roundPLN(outstanding.other - allocation.needs.other);
  if (otherShortfall > 0) {
    result.push({
      id: makeId(),
      kind: 'need',
      needCategory: 'other',
      amount: otherShortfall,
      deferredAt: now,
      reason: 'postponing',
      resolved: false,
    });
  }

  // Check minimum payment shortfalls
  for (const [debtId, needed] of Object.entries(outstandingMins)) {
    const paid = allocation.minimumPayments[debtId] ?? 0;
    const shortfall = roundPLN(needed - paid);
    if (shortfall > 0) {
      result.push({
        id: makeId(),
        kind: 'minimum_payment',
        debtId,
        amount: shortfall,
        deferredAt: now,
        reason: 'postponing',
        resolved: false,
      });
    }
  }

  return result;
}

/**
 * Returns an empty allocation (used for zero/negative income).
 */
function emptyAllocation(): Allocation {
  return {
    deferredPayments: 0,
    needs: { housing: 0, food: 0, transport: 0, other: 0 },
    minimumPayments: {},
    extraDebtPayment: null,
    unallocated: 0,
    wasAdjustedByUser: false,
  };
}
