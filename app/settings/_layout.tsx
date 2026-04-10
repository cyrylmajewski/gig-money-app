import { Stack } from 'expo-router';

import { useNavOptions } from '@/hooks/use-nav-options';

export default function SettingsLayout() {
  const navOptions = useNavOptions();
  return (
    <Stack screenOptions={navOptions}>
      <Stack.Screen name="needs" options={{ title: '' }} />
    </Stack>
  );
}
