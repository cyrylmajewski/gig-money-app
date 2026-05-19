import { getMonthKey } from '@/lib/distribution/helpers';
import { useAppStore } from '@/store';
import type { Debt, DeferredPayment, Income } from '@/types/models';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const values = new Map<string, string>();
    return {
      getString: (key: string) => values.get(key),
      set: (key: string, value: string) => values.set(key, value),
      remove: (key: string) => values.delete(key),
    };
  },
}));

const existingDeferred: DeferredPayment = {
  id: 'deferred-existing',
  kind: 'need',
  needCategory: 'housing',
  amount: 100,
  deferredAt: '2026-01-01T00:00:00.000Z',
  reason: 'postponing',
  resolved: false,
};

const newDeferred: DeferredPayment = {
  id: 'deferred-new',
  kind: 'minimum_payment',
  debtId: 'd1',
  amount: 50,
  deferredAt: '2026-01-02T00:00:00.000Z',
  reason: 'agreed_delay',
  resolved: false,
};

const resolvedDeferred: DeferredPayment = {
  ...existingDeferred,
  id: 'deferred-resolved',
  resolved: true,
};

const income: Income = {
  id: 'income-1',
  amount: 500,
  date: '2026-01-03T00:00:00.000Z',
  allocation: {
    needs: { housing: 0, food: 0, transport: 0, other: 0 },
    minimumPayments: {},
    unallocated: 500,
  },
};

const debt: Debt = {
  id: 'd1',
  label: 'Karta mBank test',
  type: 'credit_card',
  creditorKind: 'bank',
  creditorId: 'mbank',
  originalAmount: 4200,
  remainingAmount: 4200,
  minimumPayment: 50,
  interestRate: 18.5,
  paymentDay: 12,
  closedAt: null,
};

beforeEach(() => {
  useAppStore.setState({
    installationDate: '2026-01-01T00:00:00.000Z',
    onboardingCompleted: true,
    monthlyNeeds: { housing: 0, food: 0, transport: 0, other: 0 },
    debts: [],
    incomes: [],
    deferredPayments: [],
    monthlyCoverage: [],
    shortfallContacts: [],
    settings: {
      locale: 'pl',
      strictMode: false,
      deprioritizeCreditCards: false,
      snowballTargetOverride: null,
      lastCelebrationDebtId: null,
      lastRealityCheckAt: null,
    },
  });
});

describe('useAppStore deferred payment lifecycle', () => {
  it('keeps unresolved deferred payments pending when processing income', () => {
    useAppStore.setState({ deferredPayments: [existingDeferred] });

    useAppStore.getState().processIncome(income);

    expect(useAppStore.getState().deferredPayments).toEqual([existingDeferred]);
  });

  it('keeps resolved deferred payment history when processing income', () => {
    useAppStore.setState({ deferredPayments: [resolvedDeferred] });

    useAppStore.getState().processIncome(income);

    expect(useAppStore.getState().deferredPayments).toEqual([resolvedDeferred]);
  });

  it('appends new deferred payments without resolving existing ones', () => {
    useAppStore.setState({ deferredPayments: [existingDeferred] });

    useAppStore.getState().processIncome(income, [newDeferred]);

    expect(useAppStore.getState().deferredPayments).toEqual([
      existingDeferred,
      newDeferred,
    ]);
  });

  it('resolves current-month need deferred payments once the category is covered', () => {
    useAppStore.setState({
      monthlyNeeds: { housing: 100, food: 0, transport: 0, other: 0 },
      deferredPayments: [existingDeferred],
    });

    useAppStore.getState().processIncome({
      ...income,
      allocation: {
        ...income.allocation,
        needs: { housing: 100, food: 0, transport: 0, other: 0 },
        unallocated: 400,
      },
    });

    expect(useAppStore.getState().deferredPayments).toEqual([
      { ...existingDeferred, resolved: true },
    ]);
  });

  it('resolves current-month minimum payment deferred payments once the minimum is covered', () => {
    useAppStore.setState({
      debts: [debt],
      deferredPayments: [newDeferred],
    });

    useAppStore.getState().processIncome({
      ...income,
      allocation: {
        ...income.allocation,
        minimumPayments: { d1: 50 },
        unallocated: 450,
      },
    });

    expect(useAppStore.getState().deferredPayments).toEqual([
      { ...newDeferred, resolved: true },
    ]);
  });

  it('keeps prior-month deferred payments pending when current-month coverage is complete', () => {
    useAppStore.setState({
      monthlyNeeds: { housing: 100, food: 0, transport: 0, other: 0 },
      deferredPayments: [existingDeferred],
    });

    useAppStore.getState().processIncome({
      ...income,
      date: '2026-02-03T00:00:00.000Z',
      allocation: {
        ...income.allocation,
        needs: { housing: 100, food: 0, transport: 0, other: 0 },
        unallocated: 400,
      },
    });

    expect(useAppStore.getState().deferredPayments).toEqual([existingDeferred]);
  });

  it('reconciles stale current-month deferred payments from existing state', () => {
    const currentDeferred = {
      ...existingDeferred,
      deferredAt: new Date().toISOString(),
    };
    useAppStore.setState({
      monthlyNeeds: { housing: 100, food: 0, transport: 0, other: 0 },
      monthlyCoverage: [
        {
          month: getMonthKey(new Date()),
          needs: { housing: 100, food: 0, transport: 0, other: 0 },
          minimumPayments: {},
        },
      ],
      deferredPayments: [currentDeferred],
    });

    useAppStore.getState().reconcileDeferredPayments();

    expect(useAppStore.getState().deferredPayments).toEqual([
      { ...currentDeferred, resolved: true },
    ]);
  });

  it('resolves only the selected deferred payment explicitly', () => {
    useAppStore.setState({ deferredPayments: [existingDeferred, newDeferred] });

    useAppStore.getState().resolveDeferredPayment(existingDeferred.id);

    expect(useAppStore.getState().deferredPayments).toEqual([
      { ...existingDeferred, resolved: true },
      newDeferred,
    ]);
  });
});
