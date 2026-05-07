import { describe, expect, it } from 'vitest';
import { forecastDebtClosureDate } from '@/lib/debt-forecast';
import type { Debt, Income } from '@/types/models';

const debt: Debt = {
  id: 'd1',
  label: 'Loan',
  type: 'credit',
  creditorKind: 'bank',
  creditorId: null,
  originalAmount: 2000,
  remainingAmount: 1000,
  minimumPayment: 250,
  interestRate: 0,
  paymentDay: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  closedAt: null,
};

function income(date: string, minimum: number, extra = 0): Income {
  return {
    id: date,
    amount: minimum + extra,
    date,
    allocation: {
      deferredPayments: 0,
      needs: { housing: 0, food: 0, transport: 0, other: 0 },
      minimumPayments: minimum > 0 ? { d1: minimum } : {},
      extraDebtPayment: extra > 0 ? { debtId: 'd1', amount: extra } : null,
      unallocated: 0,
      wasAdjustedByUser: false,
    },
  };
}

describe('forecastDebtClosureDate', () => {
  it('uses minimum payment as an approximate forecast with less than two payment months', () => {
    const forecast = forecastDebtClosureDate(
      debt,
      [income('2026-01-10T00:00:00.000Z', 100)],
      new Date('2026-05-01T00:00:00.000Z'),
    );

    expect(forecast?.approximate).toBe(true);
    expect(forecast?.date.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('averages monthly totals when at least two payment months exist', () => {
    const forecast = forecastDebtClosureDate(
      debt,
      [
        income('2026-01-10T00:00:00.000Z', 100, 100),
        income('2026-01-20T00:00:00.000Z', 50),
        income('2026-02-10T00:00:00.000Z', 250),
      ],
      new Date('2026-05-01T00:00:00.000Z'),
    );

    expect(forecast?.approximate).toBe(false);
    expect(forecast?.date.toISOString()).toBe('2026-09-01T00:00:00.000Z');
  });

  it('returns null when there is no usable payment estimate', () => {
    const forecast = forecastDebtClosureDate(
      { ...debt, minimumPayment: 0 },
      [],
      new Date('2026-05-01T00:00:00.000Z'),
    );

    expect(forecast).toBeNull();
  });
});
