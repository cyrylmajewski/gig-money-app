import { describe, expect, it } from 'vitest';

import { buildHomeSummary } from '@/lib/home-summary';
import type {
  Allocation,
  Debt,
  DeferredPayment,
  Income,
  MonthlyCoverage,
  Settings,
} from '@/types/models';

const allocation: Allocation = {
  needs: { housing: 0, food: 0, transport: 0, other: 0 },
  minimumPayments: {},
  unallocated: 0,
};

const settings: Settings = {
  locale: 'pl',
  strictMode: false,
  deprioritizeCreditCards: false,
  snowballTargetOverride: null,
  lastCelebrationDebtId: null,
  lastRealityCheckAt: null,
};

function debt(
  id: string,
  remainingAmount: number,
  closedAt: string | null = null
): Debt {
  return {
    id,
    label: id,
    type: 'credit',
    creditorKind: 'bank',
    creditorId: null,
    originalAmount: 1000,
    remainingAmount,
    minimumPayment: 100,
    interestRate: 0,
    paymentDay: null,
    closedAt,
  };
}

function income(id: string, amount: number, date: string): Income {
  return { id, amount, date, allocation };
}

function deferred(id: string, resolved: boolean): DeferredPayment {
  return {
    id,
    kind: 'need',
    needCategory: 'food',
    amount: 100,
    deferredAt: '2026-05-01T00:00:00.000Z',
    reason: 'postponing',
    resolved,
  };
}

describe('buildHomeSummary', () => {
  it('builds dashboard totals without mutating input arrays', () => {
    const debts = [
      debt('large', 900),
      debt('small', 300),
      debt('closed', 0, '2026-05-01T00:00:00.000Z'),
    ];
    const incomes = [
      income('last-month', 70, '2026-04-20T00:00:00.000Z'),
      income('older-current', 100, '2026-05-01T00:00:00.000Z'),
      income('latest-current', 200, '2026-05-07T00:00:00.000Z'),
    ];
    const monthlyCoverage: MonthlyCoverage[] = [
      {
        month: '2026-05',
        needs: { housing: 500, food: 200, transport: 0, other: 0 },
        minimumPayments: {},
      },
    ];
    const originalDebtOrder = debts.map((item) => item.id);
    const originalIncomeOrder = incomes.map((item) => item.id);

    const summary = buildHomeSummary({
      debts,
      incomes,
      monthlyCoverage,
      deferredPayments: [deferred('pending', false), deferred('done', true)],
      settings,
      now: new Date('2026-05-08T00:00:00.000Z'),
    });

    expect(summary.activeDebts.map((item) => item.id)).toEqual([
      'small',
      'large',
    ]);
    expect(summary.closedDebts.map((item) => item.id)).toEqual(['closed']);
    expect(summary.snowballTarget?.id).toBe('small');
    expect(summary.recentIncome?.id).toBe('latest-current');
    expect(summary.coveredNeeds).toEqual({
      housing: 500,
      food: 200,
      transport: 0,
      other: 0,
    });
    expect(summary.thisMonthPayments).toBe(300);
    expect(summary.lastMonthPayments).toBe(70);
    expect(summary.pendingDeferredCount).toBe(1);
    expect(summary.totalRemaining).toBe(1200);
    expect(summary.totalPaid).toBe(1800);
    expect(debts.map((item) => item.id)).toEqual(originalDebtOrder);
    expect(incomes.map((item) => item.id)).toEqual(originalIncomeOrder);
  });

  it('omits stale recent income after seven days', () => {
    const summary = buildHomeSummary({
      debts: [],
      incomes: [income('stale', 100, '2026-04-20T00:00:00.000Z')],
      monthlyCoverage: [],
      deferredPayments: [],
      settings,
      now: new Date('2026-05-08T00:00:00.000Z'),
    });

    expect(summary.recentIncome).toBeNull();
  });
});
