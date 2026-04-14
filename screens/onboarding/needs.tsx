import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { H2, YStack } from 'tamagui';

import { NeedsForm } from '@/components/needs-form';
import { formatAmountForInput } from '@/lib/format';
import { useAppStore } from '@/store';
import type { MonthlyNeeds } from '@/types/models';

export default function NeedsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const monthlyNeeds = useAppStore((s) => s.monthlyNeeds);
  const setMonthlyNeeds = useAppStore((s) => s.setMonthlyNeeds);

  function handleSubmit(parsed: MonthlyNeeds) {
    setMonthlyNeeds(parsed);
    router.push('/onboarding/debts-intro');
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        <YStack px="$5" pt="$4" gap="$4">
          <H2 letterSpacing={-0.5}>{t('onboarding.needs.title')}</H2>
          <NeedsForm
            defaultValues={{
              housing: formatAmountForInput(monthlyNeeds.housing),
              food: formatAmountForInput(monthlyNeeds.food),
              transport: formatAmountForInput(monthlyNeeds.transport),
              other: formatAmountForInput(monthlyNeeds.other),
            }}
            onSubmit={handleSubmit}
            submitLabel={t('common.continue')}
          />
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
