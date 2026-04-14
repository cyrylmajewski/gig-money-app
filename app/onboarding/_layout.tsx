import { ChevronLeft } from '@tamagui/lucide-icons-2';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { useNavOptions } from '@/hooks/use-nav-options';

function BackButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 4 }}>
      <ChevronLeft size={28} />
    </Pressable>
  );
}

export default function OnboardingLayout() {
  const navOptions = useNavOptions();
  return (
    <Stack
      screenOptions={{
        ...navOptions,
        headerTitle: '',
        headerLeft: () => <BackButton />,
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="needs-intro" />
      <Stack.Screen name="needs" />
      <Stack.Screen name="debts-intro" />
      <Stack.Screen name="debts" />
      <Stack.Screen name="strict-mode" />
      <Stack.Screen name="ready" />
    </Stack>
  );
}
