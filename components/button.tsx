import type { GetProps } from 'tamagui';
import { Button as TamaguiButton, styled } from 'tamagui';

export const Button = styled(TamaguiButton, {
  rounded: '$4',
  accessibilityRole: 'button',

  variants: {
    variant: {
      primary: {
        size: '$5',
        bg: '$accent9',
        color: '$color12',
        pressStyle: { bg: '$accent10' },
      },
      secondary: {
        size: '$4',
        bg: 'transparent',
        borderWidth: 1,
        borderColor: '$color5',
        color: '$color11',
        pressStyle: { opacity: 0.7 },
      },
      ghost: {
        size: '$3',
        bg: 'transparent',
        color: '$color8',
        pressStyle: { opacity: 0.7 },
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
  },
});

export type ButtonProps = GetProps<typeof Button>;
