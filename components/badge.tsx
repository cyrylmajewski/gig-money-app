import { Text, YStack } from 'tamagui';

interface BadgeProps {
  label: string;
  variant?: 'accent' | 'muted';
}

const Badge = ({ label, variant = 'accent' }: BadgeProps) => {
  const isAccent = variant === 'accent';
  return (
    <YStack
      bg={isAccent ? '$accent3' : '$color3'}
      rounded="$2"
      px="$2"
      py="$1"
      self="flex-start"
    >
      <Text color={isAccent ? '$accent11' : '$color11'} fontSize="$1">
        {label}
      </Text>
    </YStack>
  );
};

export { Badge };
export type { BadgeProps };
