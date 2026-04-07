import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, TextInput, Keyboard } from 'react-native';
import { YStack, XStack, Text, H2, Button, Paragraph } from 'tamagui';
import { useAppStore } from '@/store';

const C = {
  bg: '#0F1419',
  card: '#1A2029',
  border: '#2A3140',
  text: '#ECEFF3',
  textSec: '#B8BEC8',
  muted: '#7C8594',
  accent: '#4ADE80',
  accentPress: '#3BC96E',
  error: '#FB7185',
} as const;

function parseAmount(raw: string): number {
  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) || value < 0 ? 0 : value;
}

interface NeedsField {
  key: 'housing' | 'food' | 'transport' | 'other';
  labelKey: string;
  placeholder: string;
}

const FIELDS: NeedsField[] = [
  { key: 'housing', labelKey: 'onboarding.needs.housing', placeholder: 'onboarding.needs.housingPlaceholder' },
  { key: 'food', labelKey: 'onboarding.needs.food', placeholder: 'onboarding.needs.foodPlaceholder' },
  { key: 'transport', labelKey: 'onboarding.needs.transport', placeholder: 'onboarding.needs.transportPlaceholder' },
  { key: 'other', labelKey: 'onboarding.needs.other', placeholder: 'onboarding.needs.otherPlaceholder' },
];

export default function NeedsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setMonthlyNeeds = useAppStore((s) => s.setMonthlyNeeds);

  const [values, setValues] = useState<Record<string, string>>({
    housing: '',
    food: '',
    transport: '',
    other: '',
  });
  const [showError, setShowError] = useState(false);

  const parsed = {
    housing: parseAmount(values.housing ?? ''),
    food: parseAmount(values.food ?? ''),
    transport: parseAmount(values.transport ?? ''),
    other: parseAmount(values.other ?? ''),
  };

  const total = parsed.housing + parsed.food + parsed.transport + parsed.other;
  const hasAnyValue = total > 0;

  function handleChange(key: string, raw: string) {
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

  function handleContinue() {
    Keyboard.dismiss();
    if (!hasAnyValue) {
      setShowError(true);
      return;
    }
    setMonthlyNeeds(parsed);
    router.push('/onboarding/debts');
  }

  const formattedTotal = total.toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        <YStack
          bg={C.bg}
          px="$5"
          pt="$4"
          gap="$4"
        >
          <H2 color={C.text} fontWeight="700" letterSpacing={-0.5}>
            {t('onboarding.needs.title')}
          </H2>

          <YStack gap="$3">
            {FIELDS.map(({ key, labelKey, placeholder }) => (
              <YStack key={key} gap="$2">
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  fontWeight="600"
                  color={C.textSec}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t(labelKey)}
                </Text>
                <XStack
                  bg={C.card}
                  borderWidth={1}
                  borderColor={C.border}
                  rounded="$4"
                  items="center"
                  px="$4"
                  height={48}
                >
                  <TextInput
                    style={{ flex: 1, fontSize: 18, color: C.text, fontFamily: 'Jersey25_400Regular', paddingVertical: 8 }}
                    placeholderTextColor={C.muted}
                    placeholder={t(placeholder)}
                    keyboardType="decimal-pad"
                    value={values[key]}
                    onChangeText={(raw) => handleChange(key, raw)}
                    accessibilityLabel={t(labelKey)}
                  />
                  <Text fontFamily="$body" fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
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
            bg={C.card}
            rounded="$4"
            px="$4"
            py="$3"
            borderWidth={1}
            borderColor={C.border}
          >
            <Text fontFamily="$body" fontSize="$4" fontWeight="600" color={C.textSec}>
              {t('onboarding.needs.total')}
            </Text>
            <XStack items="baseline" gap="$1">
              <Text fontFamily="$body" fontSize="$6" fontWeight="800" color={hasAnyValue ? C.text : C.muted}>
                {formattedTotal}
              </Text>
              <Text fontFamily="$body" fontSize="$4" fontWeight="600" color={C.textSec}>
                {t('common.currency')}
              </Text>
            </XStack>
          </XStack>

          {showError && (
            <Paragraph fontFamily="$body" fontSize="$3" color={C.error} style={{ textAlign: 'center' }}>
              {t('onboarding.needs.validationError')}
            </Paragraph>
          )}

          {/* CTA */}
          <Button
            size="$5"
            bg={hasAnyValue ? C.accent : C.border}
            pressStyle={{ bg: C.accentPress }}
            onPress={handleContinue}
            accessibilityRole="button"
          >
            <Text fontFamily="$body" color={hasAnyValue ? C.bg : C.muted} fontWeight="700">{t('common.continue')}</Text>
          </Button>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
