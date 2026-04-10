import { Stack } from 'expo-router';

import { useNavOptions } from '@/hooks/use-nav-options';

export default function IncomeLayout() {
  const navOptions = useNavOptions();
  return <Stack screenOptions={navOptions} />;
}
