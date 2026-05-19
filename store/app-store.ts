import { getExtraDebtPaymentAmount } from '@/lib/allocation-extra';
import { getMonthKey, roundPLN } from '@/lib/distribution/helpers';
import type {
  Allocation,
  AppState,
  Debt,
  DebtPaymentMap,
  DeferredPayment,
  Income,
  MonthlyCoverage,
  MonthlyNeeds,
  Settings,
} from '@/types/models';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from './storage';

const isSameMonth = (isoDate: string, monthKey: string) =>
  getMonthKey(new Date(isoDate)) === monthKey;

function isCovered(amount: number, required: number) {
  return required > 0 && roundPLN(amount) >= roundPLN(required);
}

function resolveCoveredDeferredPayments(
  payments: DeferredPayment[],
  state: Pick<AppState, 'monthlyNeeds'>,
  monthlyCoverage: AppState['monthlyCoverage'],
  debts: Debt[],
  monthKey: string
): DeferredPayment[] {
  const coverage = monthlyCoverage.find((c) => c.month === monthKey);
  if (!coverage) return payments;

  const debtsById = new Map(debts.map((debt) => [debt.id, debt]));
  let changed = false;

  const resolved = payments.map((payment) => {
    if (payment.resolved || !isSameMonth(payment.deferredAt, monthKey)) {
      return payment;
    }

    if (payment.kind === 'need' && payment.needCategory) {
      const required = state.monthlyNeeds[payment.needCategory];
      const covered = coverage.needs[payment.needCategory] ?? 0;
      if (isCovered(covered, required)) {
        changed = true;
        return { ...payment, resolved: true };
      }
      return payment;
    }

    if (payment.kind === 'minimum_payment' && payment.debtId) {
      const debt = debtsById.get(payment.debtId);
      if (!debt) return payment;

      if (debt.closedAt !== null || debt.remainingAmount <= 0) {
        changed = true;
        return { ...payment, resolved: true };
      }

      const covered = coverage.minimumPayments[payment.debtId] ?? 0;
      if (isCovered(covered, debt.minimumPayment)) {
        changed = true;
        return { ...payment, resolved: true };
      }
      return payment;
    }

    return payment;
  });

  return changed ? resolved : payments;
}

function applyCoverage(
  coverages: MonthlyCoverage[],
  allocation: Allocation,
  monthKey: string
): MonthlyCoverage[] {
  let found = false;
  const next = coverages.map((coverage) => {
    if (coverage.month !== monthKey) return coverage;

    found = true;
    return {
      ...coverage,
      needs: addNeeds(coverage.needs, allocation.needs),
      minimumPayments: addPayments(
        coverage.minimumPayments,
        allocation.minimumPayments
      ),
    };
  });

  if (found) return next;

  return [
    ...next,
    {
      month: monthKey,
      needs: { ...allocation.needs },
      minimumPayments: { ...allocation.minimumPayments },
    },
  ];
}

function addNeeds(current: MonthlyNeeds, incoming: MonthlyNeeds): MonthlyNeeds {
  return {
    housing: roundPLN(current.housing + incoming.housing),
    food: roundPLN(current.food + incoming.food),
    transport: roundPLN(current.transport + incoming.transport),
    other: roundPLN(current.other + incoming.other),
  };
}

function addPayments(
  current: DebtPaymentMap,
  incoming: DebtPaymentMap
): DebtPaymentMap {
  const next = { ...current };

  for (const [debtId, amount] of Object.entries(incoming)) {
    next[debtId] = roundPLN((next[debtId] ?? 0) + amount);
  }

  return next;
}

function applyDebtPayments(
  debts: Debt[],
  allocation: Allocation,
  date: Date
): Debt[] {
  return debts.map((debt) => {
    const reduction = getDebtReduction(allocation, debt.id);
    if (reduction <= 0) return debt;

    const remainingAmount = roundPLN(
      Math.max(0, debt.remainingAmount - reduction)
    );

    return {
      ...debt,
      remainingAmount,
      closedAt: remainingAmount <= 0 ? date.toISOString() : debt.closedAt,
    };
  });
}

function getDebtReduction(allocation: Allocation, debtId: string): number {
  return roundPLN(
    (allocation.minimumPayments[debtId] ?? 0) +
      getExtraDebtPaymentAmount(allocation, debtId)
  );
}

function withNewDeferredPayments(
  current: DeferredPayment[],
  incoming?: DeferredPayment[]
): DeferredPayment[] {
  return incoming ? [...current, ...incoming] : current;
}

interface AppActions {
  setOnboardingCompleted: (completed: boolean) => void;
  setMonthlyNeeds: (needs: MonthlyNeeds) => void;
  addDebt: (debt: Debt) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
  addIncome: (income: Income) => void;
  processIncome: (
    income: Income,
    newDeferredPayments?: DeferredPayment[]
  ) => void;
  addDeferredPayment: (payment: DeferredPayment) => void;
  resolveDeferredPayment: (id: string) => void;
  reconcileDeferredPayments: () => void;
  recordShortfallContact: (contactId: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  resetState: () => void;
}

type AppStore = AppState & AppActions;

const initialState: AppState = {
  schemaVersion: 1,
  installationDate: new Date().toISOString(),
  onboardingCompleted: false,
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
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      setOnboardingCompleted: (completed) =>
        set({ onboardingCompleted: completed }),

      setMonthlyNeeds: (needs) => set({ monthlyNeeds: needs }),

      addDebt: (debt) => set((state) => ({ debts: [...state.debts, debt] })),

      updateDebt: (id, updates) =>
        set((state) => ({
          debts: state.debts.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),

      removeDebt: (id) =>
        set((state) => ({
          debts: state.debts.filter((d) => d.id !== id),
        })),

      addIncome: (income) =>
        set((state) => ({ incomes: [...state.incomes, income] })),

      processIncome: (income, newDeferredPayments) =>
        set((state) => {
          const allocation = income.allocation;
          const date = new Date(income.date);
          const monthKey = getMonthKey(date);

          const incomes = [...state.incomes, income];
          const monthlyCoverage = applyCoverage(
            state.monthlyCoverage,
            allocation,
            monthKey
          );
          const debts = applyDebtPayments(state.debts, allocation, date);
          const deferredPayments = resolveCoveredDeferredPayments(
            withNewDeferredPayments(
              state.deferredPayments,
              newDeferredPayments
            ),
            state,
            monthlyCoverage,
            debts,
            monthKey
          );

          return { incomes, monthlyCoverage, debts, deferredPayments };
        }),

      addDeferredPayment: (payment) =>
        set((state) => ({
          deferredPayments: [...state.deferredPayments, payment],
        })),

      resolveDeferredPayment: (id) =>
        set((state) => ({
          deferredPayments: state.deferredPayments.map((p) =>
            p.id === id ? { ...p, resolved: true } : p
          ),
        })),

      reconcileDeferredPayments: () =>
        set((state) => {
          const monthKey = getMonthKey(new Date());
          const deferredPayments = resolveCoveredDeferredPayments(
            state.deferredPayments,
            state,
            state.monthlyCoverage,
            state.debts,
            monthKey
          );
          if (deferredPayments === state.deferredPayments) return state;
          return { deferredPayments };
        }),

      recordShortfallContact: (contactId) =>
        set((state) => {
          const month = getMonthKey(new Date());
          const already = state.shortfallContacts.some(
            (c) => c.contactId === contactId && c.month === month
          );
          if (already) return state;
          return {
            shortfallContacts: [
              ...state.shortfallContacts,
              { contactId, month, confirmedAt: new Date().toISOString() },
            ],
          };
        }),

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      resetState: () =>
        set({ ...initialState, installationDate: new Date().toISOString() }),
    }),
    {
      name: 'gigmoney-app-state',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
