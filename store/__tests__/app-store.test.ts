import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '@/store';
import type { DeferredPayment, Income } from '@/types/models';

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
    deferredPayments: 0,
    needs: { housing: 0, food: 0, transport: 0, other: 0 },
    minimumPayments: {},
    extraDebtPayment: null,
    unallocated: 500,
    wasAdjustedByUser: false,
  },
};

beforeEach(() => {
  useAppStore.setState({
    schemaVersion: 1,
    installationDate: '2026-01-01T00:00:00.000Z',
    onboardingCompleted: true,
    monthlyNeeds: { housing: 0, food: 0, transport: 0, other: 0 },
    debts: [],
    incomes: [],
    deferredPayments: [],
    monthlyCoverage: [],
    realityChecks: [],
    shortfallContacts: [],
    settings: {
      currency: 'PLN',
      locale: 'pl',
      strictMode: false,
      deprioritizeCreditCards: false,
      snowballTargetOverride: null,
      lastCelebrationDebtId: null,
      lastRealityCheckAt: null,
      tier1PriorityOrder: 'food_first',
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

  it('resolves only the selected deferred payment explicitly', () => {
    useAppStore.setState({ deferredPayments: [existingDeferred, newDeferred] });

    useAppStore.getState().resolveDeferredPayment(existingDeferred.id);

    expect(useAppStore.getState().deferredPayments).toEqual([
      { ...existingDeferred, resolved: true },
      newDeferred,
    ]);
  });
});
