import type {
  Allocation,
  AppState,
  Debt,
  DebtPaymentMap,
  DeferredPayment,
  DeferredPaymentReasons,
  MonthlyNeeds,
  NeedCategory,
  Settings,
  TierCategory,
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

const NEED_CATEGORIES: NeedCategory[] = [
  'housing',
  'food',
  'transport',
  'other',
];

type MinimumPaymentStep = {
  minimumPayments: DebtPaymentMap;
  remaining: number;
};

type ExtraPaymentStep = {
  extraDebtPayments: DebtPaymentMap;
  remaining: number;
};

export function distributeIncome(
  amount: number,
  state: AppState,
  date?: Date
): Allocation {
  if (amount <= 0) {
    return emptyAllocation();
  }

  const coverage = getCurrentMonthlyCoverage(state.monthlyCoverage, date);
  const outstanding = getOutstandingNeeds(state.monthlyNeeds, coverage);
  const activeDebts = getActiveDebts(state.debts);

  const primaryNeeds = allocateTier(
    createPrimaryNeedTier(outstanding),
    roundPLN(amount)
  );

  const secondaryNeeds = allocateTier(
    createSecondaryNeedTier(outstanding),
    primaryNeeds.remaining
  );

  const outstandingMinimums = getOutstandingMinimums(activeDebts, coverage);
  const minimums = allocateMinimumPayments(
    activeDebts,
    outstandingMinimums,
    state.settings,
    secondaryNeeds.remaining
  );

  const extra = allocateExtraDebtPayments(
    activeDebts,
    state.settings,
    minimums.minimumPayments,
    minimums.remaining
  );

  return {
    needs: {
      housing: primaryNeeds.allocations['housing'] ?? 0,
      food: primaryNeeds.allocations['food'] ?? 0,
      transport: secondaryNeeds.allocations['transport'] ?? 0,
      other: secondaryNeeds.allocations['other'] ?? 0,
    },
    minimumPayments: minimums.minimumPayments,
    extraDebtPayments:
      Object.keys(extra.extraDebtPayments).length > 0
        ? extra.extraDebtPayments
        : undefined,
    unallocated: roundPLN(extra.remaining),
  };
}

function createPrimaryNeedTier(outstanding: MonthlyNeeds): TierCategory[] {
  return [
    createNeedCategory('food', outstanding, 1),
    createNeedCategory('housing', outstanding, 2),
  ];
}

function createSecondaryNeedTier(outstanding: MonthlyNeeds): TierCategory[] {
  return [
    createNeedCategory('transport', outstanding, 1),
    createNeedCategory('other', outstanding, 2),
  ];
}

function createNeedCategory(
  category: NeedCategory,
  outstanding: MonthlyNeeds,
  priority: number
): TierCategory {
  const amount = outstanding[category];

  return {
    key: category,
    outstanding: amount,
    floor: getFloorForCategory(category, amount),
    priority,
  };
}

function allocateMinimumPayments(
  debts: Debt[],
  outstandingMinimums: DebtPaymentMap,
  settings: Settings,
  available: number
): MinimumPaymentStep {
  const totalNeeded = sumPayments(outstandingMinimums);

  if (totalNeeded <= 0) {
    return { minimumPayments: {}, remaining: available };
  }

  if (available >= totalNeeded) {
    return {
      minimumPayments: { ...outstandingMinimums },
      remaining: roundPLN(available - totalNeeded),
    };
  }

  const minimumPayments: DebtPaymentMap = {};
  let remaining = available;

  for (const debt of getSnowballQueue(debts, settings)) {
    const needed = outstandingMinimums[debt.id] ?? 0;
    if (needed <= 0) continue;

    const amount = roundPLN(Math.min(remaining, needed));
    if (amount > 0) {
      minimumPayments[debt.id] = amount;
      remaining = roundPLN(remaining - amount);
    }

    if (remaining <= 0) break;
  }

  return { minimumPayments, remaining };
}

function allocateExtraDebtPayments(
  debts: Debt[],
  settings: Settings,
  minimumPayments: DebtPaymentMap,
  available: number
): ExtraPaymentStep {
  const extraDebtPayments: DebtPaymentMap = {};
  let remaining = available;

  for (const debt of getSnowballQueue(debts, settings)) {
    if (remaining <= 0) break;

    const alreadyAllocated = minimumPayments[debt.id] ?? 0;
    const unpaidBalance = roundPLN(debt.remainingAmount - alreadyAllocated);
    const amount = roundPLN(Math.min(remaining, Math.max(0, unpaidBalance)));

    if (amount <= 0) continue;

    extraDebtPayments[debt.id] = amount;
    remaining = roundPLN(remaining - amount);
  }

  return { extraDebtPayments, remaining };
}

function sumPayments(payments: DebtPaymentMap): number {
  return roundPLN(
    Object.values(payments).reduce((sum, amount) => sum + amount, 0)
  );
}

export function computeNewDeferredPayments(
  allocation: Allocation,
  state: AppState,
  date?: Date
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
    )
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

  for (const category of NEED_CATEGORIES) {
    const shortfall = roundPLN(
      outstanding[category] - allocation.needs[category]
    );
    if (shortfall <= 0) continue;

    pushIfNew({
      id: makeId(),
      kind: 'need',
      needCategory: category,
      amount: shortfall,
      deferredAt: now,
      reason: 'postponing',
      resolved: false,
    });
  }

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

export function computeDeferredWithReasons(
  allocation: Allocation,
  state: AppState,
  reasons: DeferredPaymentReasons,
  date?: Date
): DeferredPayment[] {
  const base = computeNewDeferredPayments(allocation, state, date);

  return base.map((dp) => {
    const key =
      dp.kind === 'need' ? `need:${dp.needCategory}` : `debt:${dp.debtId}`;
    const reason = reasons[key] ?? 'postponing';
    return { ...dp, reason };
  });
}

function emptyAllocation(): Allocation {
  return {
    needs: { housing: 0, food: 0, transport: 0, other: 0 },
    minimumPayments: {},
    unallocated: 0,
  };
}
