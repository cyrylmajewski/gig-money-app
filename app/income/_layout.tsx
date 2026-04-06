import { Stack } from 'expo-router';

export default function IncomeLayout() {
  return (
    <Stack>
      <Stack.Screen name="new" options={{ headerShown: true }} />
      <Stack.Screen name="allocate" options={{ headerShown: true }} />
      <Stack.Screen name="confirm" options={{ headerShown: true }} />
    </Stack>
  );
}
