import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, H2, H3, Input, Paragraph, Text, XStack, YStack } from 'tamagui';

import { formatAmountForInput, parseAmount } from '@/lib/format';
import { useAppStore } from '@/store';
import type { MonthlyNeeds } from '@/types/models';

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
    housing: formatAmountForInput(monthlyNeeds.housing),
    food: formatAmountForInput(monthlyNeeds.food),
    transport: formatAmountForInput(monthlyNeeds.transport),
    other: formatAmountForInput(monthlyNeeds.other),
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
          <YStack gap="$3">
            {FIELDS.map(({ key, labelKey, placeholder }) => (
              <YStack key={key} gap="$2">
                <Text
                  color="$color9"
                  fontSize="$2"
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t(labelKey)}
                </Text>
                <XStack
                  bg="$color2"
                  borderWidth={1}
                  borderColor="$color4"
                  rounded="$4"
                  items="center"
                  px="$3"
                  height={48}
                >
                  <Input
                    unstyled
                    flex={1}
                    keyboardType="decimal-pad"
                    value={values[key]}
                    onChangeText={(raw) => handleChange(key, raw)}
                    placeholder={t(placeholder)}
                    fontSize="$4"
                    color="$color11"
                  />
                  <Text color="$color9" fontSize="$3">
                    {t('common.currency')}
                  </Text>
                </XStack>
              </YStack>
            ))}
          </YStack>

          {/* Running total */}
          <XStack
            justify="space-between"
            items="center"
            bg="$color3"
            borderWidth={1}
            borderColor="$color5"
            rounded="$4"
            px="$4"
            py="$3.5"
          >
            <Text color="$color11" fontSize="$4">
              {t('onboarding.needs.total')}
            </Text>
            <XStack items="baseline" gap="$1.5">
              <H3 fontWeight="700">{formattedTotal}</H3>
              <Text color="$color11" fontSize="$3">
                {t('common.currency')}
              </Text>
            </XStack>
          </XStack>

          {showError && (
            <Paragraph color="$color9" style={{ textAlign: 'center' }}>
              {t('onboarding.needs.validationError')}
            </Paragraph>
          )}

          {/* CTA */}
          <Button
            size="$5"
            bg="$accent9"
            pressStyle={{ bg: '$accent10' }}
            onPress={handleSave}
          >
            <Button.Text color="$color12">{t('common.save')}</Button.Text>
          </Button>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
