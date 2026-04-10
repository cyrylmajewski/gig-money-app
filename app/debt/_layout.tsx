import { Stack } from 'expo-router';

import { useNavOptions } from '@/hooks/use-nav-options';

export default function DebtLayout() {
  const navOptions = useNavOptions();
  return <Stack screenOptions={navOptions} />;
}
