import type { Income } from '@/types/models';

export interface IncomeDayGroup {
  key: string;
  label: string;
  total: number;
  incomes: Income[];
}

function getDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function groupIncomesByDay(incomes: Income[]): IncomeDayGroup[] {
  const groupsByKey = new Map<string, IncomeDayGroup>();

  for (const income of incomes) {
    const date = new Date(income.date);
    const key = getDateKey(date);
    const existing = groupsByKey.get(key);

    if (existing) {
      existing.incomes.push(income);
      existing.total += income.amount;
      continue;
    }

    groupsByKey.set(key, {
      key,
      label: date.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      total: income.amount,
      incomes: [income],
    });
  }

  return [...groupsByKey.values()]
    .map((group) => ({
      ...group,
      incomes: group.incomes.toSorted(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    }))
    .sort((a, b) => b.key.localeCompare(a.key));
}
