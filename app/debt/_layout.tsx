import { Stack } from 'expo-router';

const C = {
  bg: '#0F1419',
  text: '#ECEFF3',
} as const;

export default function DebtLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.bg },
        headerTintColor: '#4ADE80',
        headerShadowVisible: false,
      }}
    />
  );
}
