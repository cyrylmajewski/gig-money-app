import { sortCopy } from '@/lib/array';
import type {
  Debt,
  DeferredPayment,
  MonthlyCoverage,
  MonthlyNeeds,
  NeedCategory,
  TierCategory,
  TierResult,
} from '@/types/models';

type SnowballSettings = {
  snowballTargetOverride?: string | null;
  deprioritizeCreditCards?: boolean;
};

const EMPTY_NEEDS: MonthlyNeeds = {
  housing: 0,
  food: 0,
  transport: 0,
  other: 0,
};

const DEFAULT_FLOOR_RATIOS: Record<NeedCategory, number> = {
  food: 0.5,
  housing: 0.6,
  transport: 0.3,
  other: 0,
};

export function roundPLN(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function getMonthKey(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getCurrentMonthlyCoverage(
  coverages: MonthlyCoverage[],
  date?: Date
): MonthlyCoverage {
  const key = getMonthKey(date);
  const existing = coverages.find((c) => c.month === key);
  if (existing) {
    return {
      ...existing,
      needs: { ...existing.needs },
      minimumPayments: { ...existing.minimumPayments },
    };
  }
  return {
    month: key,
    needs: { ...EMPTY_NEEDS },
    minimumPayments: {},
  };
}

export function getOutstandingNeeds(
  needs: MonthlyNeeds,
  coverage: MonthlyCoverage
): MonthlyNeeds {
  return {
    housing: getOutstandingAmount(needs.housing, coverage.needs.housing),
    food: getOutstandingAmount(needs.food, coverage.needs.food),
    transport: getOutstandingAmount(needs.transport, coverage.needs.transport),
    other: getOutstandingAmount(needs.other, coverage.needs.other),
  };
}

export function getOutstandingMinimums(
  debts: Debt[],
  coverage: MonthlyCoverage
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const debt of debts) {
    if (!isActiveDebt(debt)) continue;

    const alreadyPaid = coverage.minimumPayments[debt.id] ?? 0;
    const required = Math.min(debt.minimumPayment, debt.remainingAmount);
    const outstanding = getOutstandingAmount(required, alreadyPaid);

    if (outstanding > 0) {
      result[debt.id] = outstanding;
    }
  }

  return result;
}

export function getSnowballTarget(
  debts: Debt[],
  deprioritizeCreditCards?: boolean
): Debt | null {
  return (
    getSnowballQueue(debts, {
      deprioritizeCreditCards,
      snowballTargetOverride: null,
    })[0] ?? null
  );
}

export function getSnowballQueue(
  debts: Debt[],
  settings: SnowballSettings = {}
): Debt[] {
  const active = getActiveDebts(debts);
  const manualTarget = settings.snowballTargetOverride
    ? active.find((debt) => debt.id === settings.snowballTargetOverride)
    : null;
  const rest = manualTarget
    ? active.filter((debt) => debt.id !== manualTarget.id)
    : active;

  const autoQueue = settings.deprioritizeCreditCards
    ? [
        ...sortByBalance(rest.filter((debt) => debt.type !== 'credit_card')),
        ...sortByBalance(rest.filter((debt) => debt.type === 'credit_card')),
      ]
    : sortByBalance(rest);

  return manualTarget ? [manualTarget, ...autoQueue] : autoQueue;
}

export type SnowballTargetSource =
  | 'manual' // user-picked override
  | 'auto-smallest' // flag off — smallest active debt
  | 'auto-no-cc' // flag on, picked smallest non-credit-card
  | 'auto-fallback-cc'; // flag on but only CCs left

export interface EffectiveSnowballTarget {
  debt: Debt | null;
  source: SnowballTargetSource;
}

export function getEffectiveSnowballTarget(
  debts: Debt[],
  settings: SnowballSettings
): EffectiveSnowballTarget {
  const manualTarget = findManualSnowballTarget(debts, settings);
  if (manualTarget) {
    return { debt: manualTarget, source: 'manual' };
  }

  const picked = getSnowballTarget(debts, settings.deprioritizeCreditCards);
  if (!picked) {
    return { debt: null, source: 'auto-smallest' };
  }

  if (!settings.deprioritizeCreditCards) {
    return { debt: picked, source: 'auto-smallest' };
  }
  if (picked.type !== 'credit_card') {
    return { debt: picked, source: 'auto-no-cc' };
  }
  return { debt: picked, source: 'auto-fallback-cc' };
}

export function getUnresolvedDeferred(
  payments: DeferredPayment[]
): DeferredPayment[] {
  return sortCopy(
    payments.filter((payment) => !payment.resolved),
    (a, b) => a.deferredAt.localeCompare(b.deferredAt)
  );
}

export function getActiveDebts(debts: Debt[]): Debt[] {
  return debts.filter(isActiveDebt);
}

export function getDefaultFloor(
  category: NeedCategory,
  outstanding: number
): number {
  const ratio = DEFAULT_FLOOR_RATIOS[category] ?? 0;
  return roundPLN(ratio * outstanding);
}

export function getFloorForCategory(
  category: NeedCategory,
  outstanding: number
): number {
  return getDefaultFloor(category, outstanding);
}

export function getPreviousMonthsAverage(
  category: 'food' | 'housing',
  coverage: MonthlyCoverage[],
  monthsBack: number = 3
): number | null {
  const currentMonth = getMonthKey();
  const prior = sortCopy(
    coverage.filter((entry) => entry.month !== currentMonth),
    (a, b) => b.month.localeCompare(a.month)
  ).slice(0, monthsBack);

  if (prior.length === 0) return null;

  const sum = prior.reduce(
    (acc, entry) => acc + (entry.needs[category] ?? 0),
    0
  );
  return roundPLN(sum / prior.length);
}

export function allocateTier(
  categories: TierCategory[],
  available: number
): TierResult {
  const active = categories
    .filter((category) => category.outstanding > 0)
    .map(clampFloor);

  if (active.length === 0) return { allocations: {}, remaining: available };

  const floorTotal = sumFloors(active);
  if (available < floorTotal) {
    return splitAcrossFloors(active, available, floorTotal);
  }

  const allocations = assignFloors(active);
  const remaining = pourByPriority(
    active,
    allocations,
    roundPLN(available - floorTotal)
  );

  return { allocations, remaining };
}

function getOutstandingAmount(required: number, covered = 0): number {
  return roundPLN(Math.max(0, required - covered));
}

function isActiveDebt(debt: Debt): boolean {
  return debt.closedAt === null && debt.remainingAmount > 0;
}

function sortByBalance(debts: Debt[]): Debt[] {
  return sortCopy(debts, (a, b) => {
    if (a.remainingAmount !== b.remainingAmount) {
      return a.remainingAmount - b.remainingAmount;
    }
    return a.label.localeCompare(b.label);
  });
}

function findManualSnowballTarget(
  debts: Debt[],
  settings: SnowballSettings
): Debt | null {
  if (!settings.snowballTargetOverride) return null;

  return (
    getActiveDebts(debts).find(
      (debt) => debt.id === settings.snowballTargetOverride
    ) ?? null
  );
}

function clampFloor(category: TierCategory): TierCategory {
  return {
    ...category,
    floor: Math.min(category.floor, category.outstanding),
  };
}

function sumFloors(categories: TierCategory[]): number {
  return roundPLN(
    categories.reduce((total, category) => total + category.floor, 0)
  );
}

function splitAcrossFloors(
  categories: TierCategory[],
  available: number,
  floorTotal: number
): TierResult {
  if (floorTotal === 0) {
    return { allocations: {}, remaining: available };
  }

  let distributed = 0;
  const allocations: Record<string, number> = {};

  categories.forEach((category, index) => {
    const isLast = index === categories.length - 1;
    const amount = isLast
      ? roundPLN(available - distributed)
      : roundPLN(available * (category.floor / floorTotal));

    allocations[category.key] = amount;
    distributed = roundPLN(distributed + amount);
  });

  return { allocations, remaining: 0 };
}

function assignFloors(categories: TierCategory[]): Record<string, number> {
  const allocations: Record<string, number> = {};

  for (const category of categories) {
    allocations[category.key] = category.floor;
  }

  return allocations;
}

function pourByPriority(
  categories: TierCategory[],
  allocations: Record<string, number>,
  available: number
): number {
  let remaining = available;

  for (const category of sortCopy(
    categories,
    (a, b) => a.priority - b.priority
  )) {
    const missing = roundPLN(category.outstanding - category.floor);
    const amount = roundPLN(Math.min(missing, remaining));

    allocations[category.key] = roundPLN(allocations[category.key] + amount);
    remaining = roundPLN(remaining - amount);

    if (remaining <= 0) break;
  }

  return remaining;
}
