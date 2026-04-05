export type DebtType = 'payday_loan' | 'credit' | 'credit_card' | 'installment' | 'other';

export type CreditorKind = 'bank' | 'payday_lender' | 'landlord' | 'private_person' | 'employer' | 'other';

export interface Debt {
  id: string;
  label: string;
  type: DebtType;
  creditorKind: CreditorKind;
  originalAmount: number;      // initial debt amount in PLN
  remainingAmount: number;     // current outstanding balance in PLN
  minimumPayment: number;      // required monthly payment in PLN
  interestRate: number;        // annual rate as decimal, 0 if unknown
  createdAt: string;           // ISO 8601 date
  closedAt: string | null;     // ISO date when marked as closed
}

export interface MonthlyNeeds {
  housing: number;   // PLN
  food: number;      // PLN
  transport: number; // PLN
  other: number;     // PLN
}

export interface MonthlyCoverage {
  month: string; // "YYYY-MM"
  needs: {
    housing: number;
    food: number;
    transport: number;
    other: number;
  };
  minimumPayments: Record<string, number>; // debtId -> amount paid this month
}

export interface DeferredPayment {
  id: string;
  kind: 'need' | 'minimum_payment';
  needCategory?: keyof MonthlyNeeds;
  debtId?: string;
  amount: number;            // PLN
  deferredAt: string;        // ISO date
  reason: 'agreed_delay' | 'postponing' | 'other';
  resolved: boolean;
}

export interface Allocation {
  deferredPayments: number;
  needs: {
    housing: number;
    food: number;
    transport: number;
    other: number;
  };
  minimumPayments: Record<string, number>; // debtId -> amount
  extraDebtPayment: {
    debtId: string;
    amount: number;
  } | null;
  unallocated: number;
  wasAdjustedByUser: boolean;
}

export interface Income {
  id: string;
  amount: number;    // PLN
  source?: string;
  date: string;      // ISO date
  allocation: Allocation;
}

export interface RealityCheckResponse {
  id: string;
  date: string;
  question: string;
  category: keyof MonthlyNeeds | 'general';
  answer: 'yes' | 'barely' | 'no';
}

export interface Settings {
  currency: 'PLN';
  locale: 'pl' | 'en';
  lastRealityCheckAt: string | null;
}

export interface AppState {
  schemaVersion: number;
  installationDate: string;
  onboardingCompleted: boolean;
  monthlyNeeds: MonthlyNeeds;
  debts: Debt[];
  incomes: Income[];
  deferredPayments: DeferredPayment[];
  monthlyCoverage: MonthlyCoverage[];
  realityChecks: RealityCheckResponse[];
  settings: Settings;
}
