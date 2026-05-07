import { Text, XStack } from 'tamagui';

import { formatAmount } from '@/lib/format';

interface AmountRowProps {
  label: string;
  amount: number;
  currency: string;
  accent?: boolean;
  warning?: boolean;
  muted?: boolean;
  bold?: boolean;
  compact?: boolean;
  labelMuted?: boolean;
  amountPrefix?: string;
}

export function AmountRow({
  label,
  amount,
  currency,
  accent,
  warning,
  muted,
  bold,
  compact,
  labelMuted,
  amountPrefix = '',
}: AmountRowProps) {
  const amountColor = accent
    ? '$accent9'
    : warning
      ? '$yellow9'
      : muted
        ? '$color8'
        : '$color11';
  const labelColor = labelMuted ? '$color11' : amountColor;
  const fontWeight = bold ? '600' : '400';

  return (
    <XStack py={compact ? '$0' : '$2.5'} items="center" justify="space-between">
      <Text
        color={labelColor}
        fontWeight={fontWeight}
        flex={1}
        pr="$3"
        fontSize="$3"
      >
        {label}
      </Text>
      <Text color={amountColor} fontWeight={fontWeight} fontSize="$3">
        {amountPrefix}
        {formatAmount(amount)} {currency}
      </Text>
    </XStack>
  );
}
