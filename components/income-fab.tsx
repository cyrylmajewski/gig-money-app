import { Plus } from '@tamagui/lucide-icons-2';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'tamagui';

export function IncomeFab() {
  const { push } = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  function handlePress() {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    push('/income/new');
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="New income"
      style={[
        styles.fab,
        { backgroundColor: theme.accent9.val, bottom: 100 + insets.bottom },
      ]}
    >
      <Plus size={28} color="white" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
