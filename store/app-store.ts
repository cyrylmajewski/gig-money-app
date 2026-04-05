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

interface AppActions {
  setOnboardingCompleted: (completed: boolean) => void;
  setMonthlyNeeds: (needs: MonthlyNeeds) => void;
  addDebt: (debt: Debt) => void;
  updateDebt: (id: string, updates: Partial<Debt>) => void;
  removeDebt: (id: string) => void;
  addIncome: (income: Income) => void;
  addDeferredPayment: (payment: DeferredPayment) => void;
  resolveDeferredPayment: (id: string) => void;
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
  settings: { currency: 'PLN', locale: 'pl', lastRealityCheckAt: null },
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
