import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

const C = {
  bg: '#0F1419',
  text: '#ECEFF3',
  accent: '#4ADE80',
} as const;

function BackButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 4 }}>
      <ChevronLeft size={28} color={C.accent} />
    </Pressable>
  );
}

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: C.accent,
        headerTitle: '',
        headerShadowVisible: false,
        headerLeft: () => <BackButton />,
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="needs" />
      <Stack.Screen name="debts" />
      <Stack.Screen name="ready" />
    </Stack>
  );
}
