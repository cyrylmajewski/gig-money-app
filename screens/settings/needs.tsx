import { useAppStore } from '@/store';
import type { MonthlyNeeds } from '@/types/models';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, H2, Paragraph, Text, XStack, YStack } from 'tamagui';

import { parseAmount, formatAmountForInput as formatForDisplay } from '@/lib/format';

interface NeedsField {
  key: keyof MonthlyNeeds;
  labelKey: string;
  placeholder: string;
}

const FIELDS: NeedsField[] = [
  {
    key: 'housing',
    labelKey: 'onboarding.needs.housing',
    placeholder: 'onboarding.needs.housingPlaceholder',
  },
  {
    key: 'food',
    labelKey: 'onboarding.needs.food',
    placeholder: 'onboarding.needs.foodPlaceholder',
  },
  {
    key: 'transport',
    labelKey: 'onboarding.needs.transport',
    placeholder: 'onboarding.needs.transportPlaceholder',
  },
  {
    key: 'other',
    labelKey: 'onboarding.needs.other',
    placeholder: 'onboarding.needs.otherPlaceholder',
  },
];

export default function EditNeedsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const monthlyNeeds = useAppStore((s) => s.monthlyNeeds);
  const setMonthlyNeeds = useAppStore((s) => s.setMonthlyNeeds);

  const [values, setValues] = useState<Record<keyof MonthlyNeeds, string>>({
    housing: formatForDisplay(monthlyNeeds.housing),
    food: formatForDisplay(monthlyNeeds.food),
    transport: formatForDisplay(monthlyNeeds.transport),
    other: formatForDisplay(monthlyNeeds.other),
  });
  const [showError, setShowError] = useState(false);

  const parsed: MonthlyNeeds = {
    housing: parseAmount(values.housing),
    food: parseAmount(values.food),
    transport: parseAmount(values.transport),
    other: parseAmount(values.other),
  };

  const total = parsed.housing + parsed.food + parsed.transport + parsed.other;
  const hasAnyValue = total > 0;

  function handleChange(key: keyof MonthlyNeeds, raw: string) {
    const cleaned = raw.replace(/[^0-9.,]/g, '');
    const normalised = cleaned.replace(',', '.');
    const parts = normalised.split('.');
    let final = (parts[0] ?? '').slice(0, 6);
    if (parts.length > 1) {
      final += ',' + (parts[1] ?? '').slice(0, 2);
    }
    setValues((prev) => ({ ...prev, [key]: final }));
    setShowError(false);
  }

  function handleSave() {
    Keyboard.dismiss();
    if (!hasAnyValue) {
      setShowError(true);
      return;
    }
    setMonthlyNeeds(parsed);
    router.back();
  }

  const formattedTotal = total.toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: '',
          headerStyle: {},
        }}
      />
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

          <YStack gap="$3">
            {FIELDS.map(({ key, labelKey, placeholder }) => (
              <YStack key={key} gap="$2">
                <Text textTransform="uppercase" letterSpacing={0.5}>
                  {t(labelKey)}
                </Text>
                <XStack
                  borderWidth={1}
                  rounded="$4"
                  items="center"
                  px="$4"
                  height={48}
                >
                  <TextInput
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                    }}
                    placeholder={t(placeholder)}
                    keyboardType="decimal-pad"
                    value={values[key]}
                    onChangeText={(raw) => handleChange(key, raw)}
                    accessibilityLabel={t(labelKey)}
                  />
                  <Text ml="$2">{t('common.currency')}</Text>
                </XStack>
              </YStack>
            ))}
          </YStack>

          {/* Running total */}
          <XStack
            justify="space-between"
            items="center"
            rounded="$4"
            px="$4"
            py="$3"
            borderWidth={1}
          >
            <Text>{t('onboarding.needs.total')}</Text>
            <XStack items="baseline" gap="$1">
              <Text>{formattedTotal}</Text>
              <Text>{t('common.currency')}</Text>
            </XStack>
          </XStack>

          {showError && (
            <Paragraph style={{ textAlign: 'center' }}>
              {t('onboarding.needs.validationError')}
            </Paragraph>
          )}

          <Button size="$5" onPress={handleSave} accessibilityRole="button">
            <Text>{t('common.save')}</Text>
          </Button>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
