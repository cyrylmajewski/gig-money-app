import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

import { NeedsForm } from '@/components/needs-form';
import { formatAmountForInput } from '@/lib/format';
import { useAppStore } from '@/store';
import type { MonthlyNeeds } from '@/types/models';

export default function EditNeedsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const monthlyNeeds = useAppStore((s) => s.monthlyNeeds);
  const setMonthlyNeeds = useAppStore((s) => s.setMonthlyNeeds);

  function handleSubmit(parsed: MonthlyNeeds) {
    setMonthlyNeeds(parsed);
    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Stack.Screen options={{ title: t('onboarding.needs.title') }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        <YStack px="$5" pt="$4" gap="$4">
          <NeedsForm
            defaultValues={{
              housing: formatAmountForInput(monthlyNeeds.housing),
              food: formatAmountForInput(monthlyNeeds.food),
              transport: formatAmountForInput(monthlyNeeds.transport),
              other: formatAmountForInput(monthlyNeeds.other),
            }}
            onSubmit={handleSubmit}
            submitLabel={t('common.save')}
          />
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
