export type DebtType =
  | 'payday_loan'
  | 'credit'
  | 'credit_card'
  | 'installment'
  | 'other';

export type CreditorKind =
  | 'bank'
  | 'payday_lender'
  | 'landlord'
  | 'private_person'
  | 'employer'
  | 'other';

export interface Debt {
  id: string;
  label: string;
  type: DebtType;
  creditorKind: CreditorKind;
  creditorId: string | null;
  originalAmount: number;
  remainingAmount: number;
  minimumPayment: number;
  interestRate: number;
  paymentDay: number | null;
  closedAt: string | null;
}

export interface MonthlyNeeds {
  housing: number;
  food: number;
  transport: number;
  other: number;
}

export type NeedCategory = keyof MonthlyNeeds;
export type DebtPaymentMap = Record<string, number>;

export interface MonthlyCoverage {
  month: string;
  needs: MonthlyNeeds;
  minimumPayments: DebtPaymentMap;
}

export type DeferredPaymentReason = 'agreed_delay' | 'postponing' | 'other';

export type DeferredPaymentReasons = Record<string, DeferredPaymentReason>;

export interface DeferredPayment {
  id: string;
  kind: 'need' | 'minimum_payment';
  needCategory?: NeedCategory;
  debtId?: string;
  amount: number;
  deferredAt: string;
  reason: DeferredPaymentReason;
  resolved: boolean;
}

export interface TierCategory {
  key: string;
  outstanding: number;
  floor: number;
  priority: number;
}

export interface TierResult {
  allocations: Record<string, number>;
  remaining: number;
}

export interface Allocation {
  needs: MonthlyNeeds;
  minimumPayments: DebtPaymentMap;
  extraDebtPayments?: DebtPaymentMap;
  unallocated: number;
}

export interface Income {
  id: string;
  amount: number;
  source?: string;
  date: string;
  allocation: Allocation;
}

export interface Settings {
  locale: 'pl' | 'en';
  strictMode: boolean;
  deprioritizeCreditCards: boolean;
  snowballTargetOverride: string | null;
  lastCelebrationDebtId: string | null;
  lastRealityCheckAt: string | null;
}

export interface ShortfallContact {
  contactId: string;
  month: string;
  confirmedAt: string;
}

export interface AppState {
  installationDate: string;
  onboardingCompleted: boolean;
  monthlyNeeds: MonthlyNeeds;
  debts: Debt[];
  incomes: Income[];
  deferredPayments: DeferredPayment[];
  monthlyCoverage: MonthlyCoverage[];
  shortfallContacts: ShortfallContact[];
  settings: Settings;
}
