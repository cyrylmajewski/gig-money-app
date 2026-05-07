import type { Allocation } from '@/types/models';

export type AllocationSegmentKey = 'needs' | 'minimums' | 'extra' | 'unallocated';

export interface AllocationSummarySegment {
  key: AllocationSegmentKey;
  amount: number;
}

export interface AllocationSummary {
  needs: number;
  minimums: number;
  extra: number;
  unallocated: number;
  segments: AllocationSummarySegment[];
}

export function summarizeAllocation(allocation: Allocation): AllocationSummary {
  const needs = Object.values(allocation.needs).reduce((sum, value) => sum + value, 0);
  const minimums = Object.values(allocation.minimumPayments).reduce(
    (sum, value) => sum + value,
    0,
  );
  const extra = allocation.extraDebtPayment?.amount ?? 0;
  const unallocated = allocation.unallocated;

  const rawSegments: AllocationSummarySegment[] = [
    { key: 'needs', amount: needs },
    { key: 'minimums', amount: minimums },
    { key: 'extra', amount: extra },
    { key: 'unallocated', amount: unallocated },
  ];
  const segments = rawSegments.filter((segment) => segment.amount > 0);

  return { needs, minimums, extra, unallocated, segments };
}
