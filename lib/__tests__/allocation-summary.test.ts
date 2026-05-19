import { describe, expect, it } from 'vitest';

import { summarizeAllocation } from '@/lib/allocation-summary';
import type { Allocation } from '@/types/models';

const baseAllocation: Allocation = {
  needs: { housing: 0, food: 0, transport: 0, other: 0 },
  minimumPayments: {},
  unallocated: 0,
};

describe('summarizeAllocation', () => {
  it('sums allocation groups and keeps segment order', () => {
    const summary = summarizeAllocation({
      ...baseAllocation,
      needs: { housing: 100, food: 50, transport: 25, other: 0 },
      minimumPayments: { d1: 200, d2: 100 },
      extraDebtPayments: { d1: 75, d2: 25 },
      unallocated: 25,
    });

    expect(summary).toEqual({
      needs: 175,
      minimums: 300,
      extra: 100,
      unallocated: 25,
      segments: [
        { key: 'needs', amount: 175 },
        { key: 'minimums', amount: 300 },
        { key: 'extra', amount: 100 },
        { key: 'unallocated', amount: 25 },
      ],
    });
  });

  it('omits zero-value segments from display data', () => {
    const summary = summarizeAllocation({
      ...baseAllocation,
      needs: { housing: 100, food: 0, transport: 0, other: 0 },
    });

    expect(summary.segments).toEqual([{ key: 'needs', amount: 100 }]);
  });

  it('returns an empty segment list when nothing is allocated', () => {
    const summary = summarizeAllocation(baseAllocation);

    expect(summary.segments).toEqual([]);
  });
});
