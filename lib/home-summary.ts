import {
  getActiveDebts,
  getEffectiveSnowballTarget,
  getMonthKey,
} from '@/lib/distribution';
import type { SnowballTargetSource } from '@/lib/distribution';
import type {
  Debt,
  DeferredPayment,
  Income,
  MonthlyCoverage,
  MonthlyNeeds,
  Settings,
} from '@/types/models';

export interface HomeSummaryInput {
  debts: Debt[];
  incomes: Income[];
  monthlyCoverage: MonthlyCoverage[];
  deferredPayments: DeferredPayment[];
  settings: Settings;
  now?: Date;
}

export interface HomeSummary {
  activeDebts: Debt[];
  closedDebts: Debt[];
  snowballTarget: Debt | null;
  targetSource: SnowballTargetSource;
  recentIncome: Income | null;
  coveredNeeds: MonthlyNeeds;
  thisMonthPayments: number;
  lastMonthPayments: number;
  pendingDeferredCount: number;
  totalRemaining: number;
  totalPaid: number;
}

function getIncomeStats(
  incomes: Income[],
  now: Date,
  thisMonthKey: string,
  lastMonthKey: string,
): Pick<HomeSummary, 'recentIncome' | 'thisMonthPayments' | 'lastMonthPayments'> {
  let latest: Income | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;
  let thisMonthPayments = 0;
  let lastMonthPayments = 0;

  for (const income of incomes) {
    const date = new Date(income.date);
    const time = date.getTime();
    const monthKey = getMonthKey(date);

    if (time > latestTime) {
      latest = income;
      latestTime = time;
    }
    if (monthKey === thisMonthKey) {
      thisMonthPayments += income.amount;
    } else if (monthKey === lastMonthKey) {
      lastMonthPayments += income.amount;
    }
  }

  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  return {
    recentIncome: latest && latestTime >= sevenDaysAgo ? latest : null,
    thisMonthPayments,
    lastMonthPayments,
  };
}

export function buildHomeSummary({
  debts,
  incomes,
  monthlyCoverage,
  deferredPayments,
  settings,
  now = new Date(),
}: HomeSummaryInput): HomeSummary {
  const activeDebts = getActiveDebts(debts).sort(
    (a, b) => a.remainingAmount - b.remainingAmount,
  );
  const closedDebts = debts.filter((debt) => debt.closedAt !== null);
  const { debt: snowballTarget, source: targetSource } =
    getEffectiveSnowballTarget(activeDebts, settings);

  const thisMonthKey = getMonthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = getMonthKey(lastMonthDate);
  const thisMonthCoverage = monthlyCoverage.find(
    (coverage) => coverage.month === thisMonthKey,
  );
  const incomeStats = getIncomeStats(
    incomes,
    now,
    thisMonthKey,
    lastMonthKey,
  );

  return {
    activeDebts,
    closedDebts,
    snowballTarget,
    targetSource,
    recentIncome: incomeStats.recentIncome,
    coveredNeeds: thisMonthCoverage?.needs ?? {
      housing: 0,
      food: 0,
      transport: 0,
      other: 0,
    },
    thisMonthPayments: incomeStats.thisMonthPayments,
    lastMonthPayments: incomeStats.lastMonthPayments,
    pendingDeferredCount: deferredPayments.reduce(
      (count, payment) => count + (payment.resolved ? 0 : 1),
      0,
    ),
    totalRemaining: activeDebts.reduce(
      (sum, debt) => sum + debt.remainingAmount,
      0,
    ),
    totalPaid: debts.reduce(
      (sum, debt) => sum + (debt.originalAmount - debt.remainingAmount),
      0,
    ),
  };
}
