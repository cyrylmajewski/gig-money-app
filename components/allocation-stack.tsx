import { Text, XStack, YStack } from 'tamagui';

import type { AllocationSummarySegment } from '@/lib/allocation-summary';
import { formatAmount } from '@/lib/format';

type LegendMode = 'none' | 'labels' | 'amounts' | 'rows';

interface AllocationStackSegment extends AllocationSummarySegment {
  label: string;
}

interface AllocationStackProps {
  segments: AllocationStackSegment[];
  currency: string;
  barHeight?: number;
  legend?: LegendMode;
}

const SEGMENT_COLORS = {
  needs: '$accent9',
  minimums: '$yellow9',
  extra: '$green9',
  unallocated: '$color6',
} as const satisfies Record<AllocationSummarySegment['key'], string>;

export function AllocationStack({
  segments,
  currency,
  barHeight = 10,
  legend = 'amounts',
}: AllocationStackProps) {
  if (segments.length === 0) return null;

  return (
    <YStack gap="$2">
      <XStack height={barHeight} rounded="$10" overflow="hidden">
        {segments.map((segment) => (
          <YStack
            key={segment.key}
            flex={segment.amount}
            bg={SEGMENT_COLORS[segment.key]}
            height={barHeight}
          />
        ))}
      </XStack>

      {legend === 'labels' && (
        <XStack flexWrap="wrap" gap="$2">
          {segments.map((segment) => (
            <XStack key={segment.key} items="center" gap="$1.5">
              <YStack
                width={8}
                height={8}
                rounded="$10"
                bg={SEGMENT_COLORS[segment.key]}
              />
              <Text color="$color11" fontSize="$1">
                {segment.label}
              </Text>
            </XStack>
          ))}
        </XStack>
      )}

      {legend === 'amounts' && (
        <XStack flexWrap="wrap" gap="$2">
          {segments.map((segment) => (
            <XStack key={segment.key} items="center" gap="$1.5">
              <YStack
                width={8}
                height={8}
                rounded="$10"
                bg={SEGMENT_COLORS[segment.key]}
              />
              <Text color="$color11" fontSize="$1">
                {segment.label}: {formatAmount(segment.amount)} {currency}
              </Text>
            </XStack>
          ))}
        </XStack>
      )}

      {legend === 'rows' && (
        <YStack gap="$1.5">
          {segments.map((segment) => (
            <XStack key={segment.key} items="center" justify="space-between">
              <XStack items="center" gap="$2">
                <YStack
                  width={8}
                  height={8}
                  rounded="$10"
                  bg={SEGMENT_COLORS[segment.key]}
                />
                <Text color="$color11" fontSize="$2">
                  {segment.label}
                </Text>
              </XStack>
              <Text color="$color12" fontSize="$2" fontWeight="500">
                {formatAmount(segment.amount)} {currency}
              </Text>
            </XStack>
          ))}
        </YStack>
      )}
    </YStack>
  );
}

export type { AllocationStackSegment };
