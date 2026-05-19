import { describe, expect, it } from 'vitest';

import { groupIncomesByDay } from '@/lib/income-history';
import type { Allocation, Income } from '@/types/models';

const allocation: Allocation = {
  needs: { housing: 0, food: 0, transport: 0, other: 0 },
  minimumPayments: {},
  unallocated: 0,
};

function income(id: string, amount: number, date: string): Income {
  return { id, amount, date, allocation };
}

describe('groupIncomesByDay', () => {
  it('groups incomes by day and sums each day', () => {
    const groups = groupIncomesByDay([
      income('older', 50, '2026-05-07T12:00:00.000Z'),
      income('newer-a', 100, '2026-05-08T08:00:00.000Z'),
      income('newer-b', 75, '2026-05-08T18:00:00.000Z'),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      key: '2026-05-08',
      total: 175,
    });
    expect(groups[0]?.incomes.map((item) => item.id)).toEqual([
      'newer-b',
      'newer-a',
    ]);
    expect(groups[1]).toMatchObject({
      key: '2026-05-07',
      total: 50,
    });
  });

  it('does not mutate the input array', () => {
    const incomes = [
      income('first', 100, '2026-05-07T12:00:00.000Z'),
      income('second', 200, '2026-05-08T12:00:00.000Z'),
    ];

    groupIncomesByDay(incomes);

    expect(incomes.map((item) => item.id)).toEqual(['first', 'second']);
  });
});
