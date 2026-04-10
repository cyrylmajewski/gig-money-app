import { useTheme } from 'tamagui';

export function useNavOptions() {
  const theme = useTheme();
  return {
    headerStyle: { backgroundColor: theme.background.val },
    headerTintColor: theme.color.val,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.background.val },
  } as const;
}
