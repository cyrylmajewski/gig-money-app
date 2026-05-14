import type { Allocation } from '@/types/models';

export interface ExtraDebtPaymentEntry {
  debtId: string;
  amount: number;
}

export function getExtraDebtPaymentEntries(
  allocation: Allocation
): ExtraDebtPaymentEntry[] {
  const entries = Object.entries(allocation.extraDebtPayments ?? {})
    .filter(([, amount]) => amount > 0)
    .map(([debtId, amount]) => ({ debtId, amount }));

  if (entries.length > 0) return entries;

  return allocation.extraDebtPayment ? [allocation.extraDebtPayment] : [];
}

export function getExtraDebtPaymentAmount(
  allocation: Allocation,
  debtId: string
): number {
  return getExtraDebtPaymentEntries(allocation)
    .filter((entry) => entry.debtId === debtId)
    .reduce((sum, entry) => sum + entry.amount, 0);
}

export function getExtraDebtPaymentTotal(allocation: Allocation): number {
  return getExtraDebtPaymentEntries(allocation).reduce(
    (sum, entry) => sum + entry.amount,
    0
  );
}
