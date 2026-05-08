import { Plus } from '@tamagui/lucide-icons-2';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from 'tamagui';

export function IncomeFab() {
  const { push } = useRouter();
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
      style={[styles.fab, { backgroundColor: theme.accent9.val }]}
    >
      <Plus size={28} color={theme.color12.val as never} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  },
});
