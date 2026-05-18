import type {
  Allocation,
  AppState,
  DeferredPayment,
  DeferredPaymentReasons,
} from '@/types/models';
import {
  allocateTier,
  getActiveDebts,
  getCurrentMonthlyCoverage,
  getFloorForCategory,
  getOutstandingMinimums,
  getOutstandingNeeds,
  getSnowballQueue,
  roundPLN,
} from './helpers';

/**
 * Distribute an income amount across the current-month priority order.
 *
 * Current order:
 *   1. Housing + food needs (outstanding this month)
 *   2. Transport + other needs (outstanding this month)
 *   3. Minimum debt payments (snowball queue when there is not enough for all)
 *   4. Extra snowball payments (smallest remaining balance first)
 *
 * This pure function does not resolve existing deferred payments directly.
 * The store reconciles deferred records after applying confirmed income to
 * monthly coverage and debt balances.
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

  // ── Step 1: Housing + food (Floor + Waterfall) ────────────────────────

  const foodFirst = (state.settings.tier1PriorityOrder ?? 'food_first') === 'food_first';
  const tier1 = allocateTier([
    { key: 'housing', outstanding: outstanding.housing, floor: getFloorForCategory('housing', outstanding.housing, state.settings.floorOverrides), priority: foodFirst ? 2 : 1 },
    { key: 'food', outstanding: outstanding.food, floor: getFloorForCategory('food', outstanding.food, state.settings.floorOverrides), priority: foodFirst ? 1 : 2 },
  ], remaining);
  const housingAlloc = tier1.allocations['housing'] ?? 0;
  const foodAlloc = tier1.allocations['food'] ?? 0;
  remaining = tier1.remaining;

  // ── Step 2: Transport + other needs (Floor + Waterfall) ───────────────

  const tier3 = allocateTier([
    { key: 'transport', outstanding: outstanding.transport, floor: getFloorForCategory('transport', outstanding.transport, state.settings.floorOverrides), priority: 1 },
    { key: 'other', outstanding: outstanding.other, floor: getFloorForCategory('other', outstanding.other, state.settings.floorOverrides), priority: 2 },
  ], remaining);
  const transportAlloc = tier3.allocations['transport'] ?? 0;
  const otherAlloc = tier3.allocations['other'] ?? 0;
  remaining = tier3.remaining;

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
      // Not enough -- avoid splitting one income into several unusable partial
      // payments. Pay minimums in the same focused order as the snowball plan.
      for (const debt of getSnowballQueue(activeDebts, state.settings)) {
        const needed = outstandingMins[debt.id] ?? 0;
        if (needed <= 0) continue;

        const share = roundPLN(Math.min(remaining, needed));
        if (share > 0) {
          minimumPayments[debt.id] = share;
          remaining = roundPLN(remaining - share);
        }

        if (remaining <= 0) break;
      }
    }
  }

  // ── Step 4: Extra snowball payment ────────────────────────────────────

  const extraDebtPayments: Record<string, number> = {};

  if (remaining > 0) {
    for (const debt of getSnowballQueue(activeDebts, state.settings)) {
      const alreadyAllocated = minimumPayments[debt.id] ?? 0;
      const maxExtra = roundPLN(debt.remainingAmount - alreadyAllocated);
      const snowballAmount = roundPLN(Math.min(remaining, Math.max(0, maxExtra)));

      if (snowballAmount <= 0) continue;

      extraDebtPayments[debt.id] = snowballAmount;
      remaining = roundPLN(remaining - snowballAmount);

      if (remaining <= 0) break;
    }
  }

  const extraDebtPaymentEntries = Object.entries(extraDebtPayments);
  const extraDebtPayment =
    extraDebtPaymentEntries.length > 0
      ? {
          debtId: extraDebtPaymentEntries[0][0],
          amount: extraDebtPaymentEntries[0][1],
        }
      : null;

  // ── Build result ──────────────────────────────────────────────────────

  return {
    // Deferred payments are tracked separately and closed manually.
    deferredPayments: 0,
    needs: {
      housing: housingAlloc,
      food: foodAlloc,
      transport: transportAlloc,
      other: otherAlloc,
    },
    minimumPayments,
    extraDebtPayment,
    extraDebtPayments:
      extraDebtPaymentEntries.length > 0 ? extraDebtPayments : undefined,
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
  const unresolvedKeys = new Set(
    state.deferredPayments.flatMap((payment) =>
      payment.resolved ? [] : [getDeferredPaymentKey(payment)]
    ),
  );
  let counter = 0;

  const makeId = () => {
    counter++;
    return `deferred-${Date.now()}-${counter}`;
  };

  const pushIfNew = (payment: DeferredPayment) => {
    const key = getDeferredPaymentKey(payment);
    if (unresolvedKeys.has(key)) return;
    unresolvedKeys.add(key);
    result.push(payment);
  };

  // Check housing shortfall
  const housingShortfall = roundPLN(outstanding.housing - allocation.needs.housing);
  if (housingShortfall > 0) {
    pushIfNew({
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
    pushIfNew({
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
    pushIfNew({
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
    pushIfNew({
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
      pushIfNew({
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

function getDeferredPaymentKey(payment: DeferredPayment): string {
  return payment.kind === 'need'
    ? `need:${payment.needCategory}`
    : `debt:${payment.debtId}`;
}

/**
 * Companion to {@link computeNewDeferredPayments} that applies a per-category
 * reason map (and optional free-text note) supplied by the L4 confirmation flow.
 *
 * Reason keys use the format `'need:<category>'` for needs and
 * `'debt:<debtId>'` for missed minimum payments. Missing entries default to
 * `'postponing'`. The `note` is attached only to records whose final reason is
 * `'other'`.
 */
export function computeDeferredWithReasons(
  allocation: Allocation,
  state: AppState,
  reasons: DeferredPaymentReasons,
  note?: string,
  date?: Date,
): DeferredPayment[] {
  const base = computeNewDeferredPayments(allocation, state, date);

  return base.map((dp) => {
    const key =
      dp.kind === 'need'
        ? `need:${dp.needCategory}`
        : `debt:${dp.debtId}`;
    const reason = reasons[key] ?? 'postponing';
    const next: DeferredPayment = { ...dp, reason };
    if (reason === 'other' && note !== undefined) {
      next.note = note;
    }
    return next;
  });
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
