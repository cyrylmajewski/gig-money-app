import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './storage';
import type {
  AppState,
  Debt,
  DeferredPayment,
  Income,
  MonthlyNeeds,
  Settings,
} from '@/types/models';
import { getExtraDebtPaymentAmount } from '@/lib/allocation-extra';
import { getMonthKey, roundPLN } from '@/lib/distribution/helpers';

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
  monthKey: string,
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

interface AppActions {
  setOnboardingCompleted: (completed: boolean) => void;
  setMonthlyNeeds: (needs: MonthlyNeeds) => void;
  addDebt: (debt: Debt) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
  addIncome: (income: Income) => void;
  processIncome: (income: Income, newDeferredPayments?: DeferredPayment[]) => void;
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
  settings: { currency: 'PLN', locale: 'pl', strictMode: false, deprioritizeCreditCards: false, snowballTargetOverride: null, lastCelebrationDebtId: null, lastRealityCheckAt: null, tier1PriorityOrder: 'food_first' },
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      setOnboardingCompleted: (completed) =>
        set({ onboardingCompleted: completed }),

      setMonthlyNeeds: (needs) =>
        set({ monthlyNeeds: needs }),

      addDebt: (debt) =>
        set((state) => ({ debts: [...state.debts, debt] })),

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

          // 1. Add income record
          const incomes = [...state.incomes, income];

          // 2. Update monthly coverage
          const monthKey = getMonthKey(date);
          let coverageFound = false;
          const monthlyCoverage = state.monthlyCoverage.map((c) => {
            if (c.month !== monthKey) return c;
            coverageFound = true;
            const needs = {
              housing: roundPLN(c.needs.housing + allocation.needs.housing),
              food: roundPLN(c.needs.food + allocation.needs.food),
              transport: roundPLN(c.needs.transport + allocation.needs.transport),
              other: roundPLN(c.needs.other + allocation.needs.other),
            };
            const minimumPayments = { ...c.minimumPayments };
            for (const [debtId, amount] of Object.entries(allocation.minimumPayments)) {
              minimumPayments[debtId] = roundPLN((minimumPayments[debtId] ?? 0) + amount);
            }
            return { ...c, needs, minimumPayments };
          });
          if (!coverageFound) {
            const minimumPayments: Record<string, number> = {};
            for (const [debtId, amount] of Object.entries(allocation.minimumPayments)) {
              minimumPayments[debtId] = amount;
            }
            monthlyCoverage.push({
              month: monthKey,
              needs: { ...allocation.needs },
              minimumPayments,
            });
          }

          // 3. Apply payments to debt balances
          const debts = state.debts.map((d) => {
            let reduction = 0;
            if (allocation.minimumPayments[d.id]) {
              reduction += allocation.minimumPayments[d.id];
            }
            reduction += getExtraDebtPaymentAmount(allocation, d.id);
            if (reduction <= 0) return d;

            const newRemaining = roundPLN(Math.max(0, d.remainingAmount - reduction));
            return {
              ...d,
              remainingAmount: newRemaining,
              closedAt: newRemaining <= 0 ? date.toISOString() : d.closedAt,
            };
          });

          const unresolvedAndNew = newDeferredPayments
            ? [...state.deferredPayments, ...newDeferredPayments]
            : state.deferredPayments;
          const deferredPayments = resolveCoveredDeferredPayments(
            unresolvedAndNew,
            state,
            monthlyCoverage,
            debts,
            monthKey,
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
            monthKey,
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

      resetState: () => set({ ...initialState, installationDate: new Date().toISOString() }),
    }),
    {
      name: 'gigmoney-app-state',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
