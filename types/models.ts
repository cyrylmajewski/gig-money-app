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
  createdAt: string;
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

export interface DebtPayment {
  debtId: string;
  amount: number;
}

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
  note?: string;
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
  deferredPayments: number;
  needs: MonthlyNeeds;
  minimumPayments: DebtPaymentMap;
  // Kept for older saved allocations. New records use extraDebtPayments.
  extraDebtPayment: DebtPayment | null;
  extraDebtPayments?: DebtPaymentMap;
  unallocated: number;
  wasAdjustedByUser: boolean;
}

export interface Income {
  id: string;
  amount: number;
  source?: string;
  date: string;
  allocation: Allocation;
}

export interface RealityCheckResponse {
  id: string;
  date: string;
  question: string;
  category: NeedCategory | 'general';
  answer: 'yes' | 'barely' | 'no';
}

export interface Settings {
  currency: 'PLN';
  locale: 'pl' | 'en';
  strictMode: boolean;
  deprioritizeCreditCards: boolean;
  snowballTargetOverride: string | null;
  lastCelebrationDebtId: string | null;
  lastRealityCheckAt: string | null;
  tier1PriorityOrder: 'food_first' | 'housing_first';
  floorOverrides?: Partial<Record<NeedCategory, number>>;
}

export interface ShortfallContact {
  contactId: string;
  month: string;
  confirmedAt: string;
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
  shortfallContacts: ShortfallContact[];
  settings: Settings;
}
