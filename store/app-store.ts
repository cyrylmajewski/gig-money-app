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
import { getMonthKey, roundPLN } from '@/lib/distribution/helpers';

interface AppActions {
  setOnboardingCompleted: (completed: boolean) => void;
  setMonthlyNeeds: (needs: MonthlyNeeds) => void;
  addDebt: (debt: Debt) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
  addIncome: (income: Income) => void;
  processIncome: (income: Income) => void;
  addDeferredPayment: (payment: DeferredPayment) => void;
  resolveDeferredPayment: (id: string) => void;
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
  settings: { currency: 'PLN', locale: 'pl', strictMode: false, lastRealityCheckAt: null, tier1PriorityOrder: 'food_first' },
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

      processIncome: (income) =>
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
            if (allocation.extraDebtPayment?.debtId === d.id) {
              reduction += allocation.extraDebtPayment.amount;
            }
            if (reduction <= 0) return d;

            const newRemaining = roundPLN(Math.max(0, d.remainingAmount - reduction));
            return {
              ...d,
              remainingAmount: newRemaining,
              closedAt: newRemaining <= 0 ? date.toISOString() : d.closedAt,
            };
          });

          // 4. Resolve all unresolved deferred payments (cleanup)
          const deferredPayments = state.deferredPayments.map((p) =>
            p.resolved ? p : { ...p, resolved: true },
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
