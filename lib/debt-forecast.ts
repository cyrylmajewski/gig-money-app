import type { Debt, Income } from '@/types/models';
import { getExtraDebtPaymentAmount } from './allocation-extra';
import { getMonthKey } from './distribution';

export interface DebtClosureForecast {
  date: Date;
  approximate: boolean;
}

export function forecastDebtClosureDate(
  debt: Debt,
  incomes: Income[],
  now: Date = new Date(),
): DebtClosureForecast | null {
  if (debt.remainingAmount <= 0) return null;

  const monthlyPayments = new Map<string, number>();

  for (const income of incomes) {
    const minimum = income.allocation.minimumPayments[debt.id] ?? 0;
    const extra = getExtraDebtPaymentAmount(income.allocation, debt.id);
    const total = minimum + extra;
    if (total <= 0) continue;

    const monthKey = getMonthKey(new Date(income.date));
    monthlyPayments.set(monthKey, (monthlyPayments.get(monthKey) ?? 0) + total);
  }

  let monthlyPayment: number;
  let approximate = false;

  if (monthlyPayments.size >= 2) {
    monthlyPayment =
      [...monthlyPayments.values()].reduce((sum, value) => sum + value, 0) /
      monthlyPayments.size;
  } else if (debt.minimumPayment > 0) {
    monthlyPayment = debt.minimumPayment;
    approximate = true;
  } else {
    return null;
  }

  if (monthlyPayment <= 0) return null;

  const monthsLeft = Math.ceil(debt.remainingAmount / monthlyPayment);
  const target = new Date(now);
  target.setMonth(target.getMonth() + monthsLeft);

  return { date: target, approximate };
}
