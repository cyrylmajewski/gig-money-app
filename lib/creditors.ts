import type { DebtType } from '@/types/models';

export type CreditorCategory = 'bank' | 'bnpl' | 'payday_lender';

export interface Creditor {
  id: string;
  name: string;
  phone: string;
  hours: string;
  category: CreditorCategory;
}

// ── Banks ────────────────────────────────────────────────────────────────────

const BANKS: Creditor[] = [
  {
    id: 'pko_bp',
    name: 'PKO Bank Polski',
    phone: '+48 800 302 302',
    hours: 'pon-pt 8:00-21:00',
    category: 'bank',
  },
  {
    id: 'pekao',
    name: 'Bank Pekao',
    phone: '+48 42 683 23 23',
    hours: 'pon-pt 8:00-20:00',
    category: 'bank',
  },
  {
    id: 'mbank',
    name: 'mBank',
    phone: '+48 42 6 300 800',
    hours: '24/7',
    category: 'bank',
  },
  {
    id: 'ing',
    name: 'ING Bank Śląski',
    phone: '+48 32 357 00 69',
    hours: 'pon-pt 8:00-20:00',
    category: 'bank',
  },
  {
    id: 'santander',
    name: 'Santander Bank Polska',
    phone: '+48 61 81 19 999',
    hours: 'pon-pt 8:00-20:00, sob 8:00-16:00',
    category: 'bank',
  },
  {
    id: 'bnp_paribas',
    name: 'BNP Paribas',
    phone: '+48 500 990 500',
    hours: 'pon-pt 8:00-20:00',
    category: 'bank',
  },
  {
    id: 'millennium',
    name: 'Bank Millennium',
    phone: '+48 801 331 331',
    hours: 'pon-pt 8:00-20:00',
    category: 'bank',
  },
  {
    id: 'alior',
    name: 'Alior Bank',
    phone: '+48 19 502',
    hours: 'pon-pt 8:00-20:00',
    category: 'bank',
  },
  {
    id: 'credit_agricole',
    name: 'Credit Agricole',
    phone: '+48 71 35 49 009',
    hours: 'pon-pt 8:00-20:00',
    category: 'bank',
  },
  {
    id: 'nest_bank',
    name: 'Nest Bank',
    phone: '+48 22 438 41 41',
    hours: 'pon-pt 8:00-20:00',
    category: 'bank',
  },
];

// ── BNPL / Installment providers ─────────────────────────────────────────────

const BNPL: Creditor[] = [
  {
    id: 'paypo',
    name: 'PayPo',
    phone: '+48 22 209 72 60',
    hours: 'pon-pt 8:00-20:00',
    category: 'bnpl',
  },
  {
    id: 'klarna',
    name: 'Klarna',
    phone: '+48 22 307 10 27',
    hours: 'pon-pt 9:00-17:00',
    category: 'bnpl',
  },
  {
    id: 'allegro_pay',
    name: 'Allegro Pay',
    phone: '+48 61 887 33 00',
    hours: 'pon-pt 7:30-21:00',
    category: 'bnpl',
  },
];

// ── Payday lenders ───────────────────────────────────────────────────────────

const PAYDAY_LENDERS: Creditor[] = [
  {
    id: 'provident',
    name: 'Provident',
    phone: '+48 801 800 008',
    hours: 'pon-pt 8:00-20:00',
    category: 'payday_lender',
  },
  {
    id: 'vivus',
    name: 'Vivus',
    phone: '+48 22 203 07 62',
    hours: 'pon-pt 8:00-20:00',
    category: 'payday_lender',
  },
  {
    id: 'wonga',
    name: 'Wonga',
    phone: '+48 22 601 30 05',
    hours: 'pon-pt 8:00-18:00',
    category: 'payday_lender',
  },
];

// ── All creditors ────────────────────────────────────────────────────────────

export const POLISH_CREDITORS: Creditor[] = [
  ...BANKS,
  ...BNPL,
  ...PAYDAY_LENDERS,
];

export function getCreditorById(id: string | null): Creditor | null {
  if (!id) return null;
  return POLISH_CREDITORS.find((c) => c.id === id) ?? null;
}

/**
 * Returns the relevant creditor list for a given debt type.
 * Returns empty array for "other" (private/informal debts).
 */
export function getCreditorsByDebtType(type: DebtType): Creditor[] {
  switch (type) {
    case 'credit':
    case 'credit_card':
      return BANKS;
    case 'installment':
      return BNPL;
    case 'payday_loan':
      return PAYDAY_LENDERS;
    case 'other':
      return [];
  }
}

/**
 * Returns the i18n key suffix for the creditor section label.
 */
export function getCreditorLabelKey(type: DebtType): string | null {
  switch (type) {
    case 'credit':
    case 'credit_card':
      return 'debts.form.creditorBank';
    case 'installment':
      return 'debts.form.creditorBnpl';
    case 'payday_loan':
      return 'debts.form.creditorPayday';
    case 'other':
      return null;
  }
}
