import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform, ScrollView, InputAccessoryView, View } from 'react-native';
import { YStack, XStack, Text, H2, Input, Button, Label, Paragraph } from 'tamagui';
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
  const insets = useSafeAreaInsets();
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
    // Allow digits, comma, dot only
    const cleaned = raw.replace(/[^0-9.,]/g, '');
    // One decimal separator max
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <YStack
          bg={C.bg}
          px="$5"
          pt={insets.top + 16}
          gap="$4"
        >
          {/* Title */}
          <H2 color={C.text} fontWeight="700" letterSpacing={-0.5}>
            {t('onboarding.needs.title')}
          </H2>

          {/* Input fields */}
          <YStack gap="$3">
            {FIELDS.map(({ key, labelKey, placeholder }, index) => (
              <YStack key={key} gap="$2">
                <Label
                  htmlFor={`needs-${key}`}
                  fontSize="$3"
                  fontWeight="600"
                  color={C.muted}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t(labelKey)}
                </Label>
                <XStack
                  bg={C.card}
                  borderWidth={1}
                  borderColor={C.border}
                  rounded="$4"
                  items="center"
                  px="$4"
                  height={48}
                >
                  <Input
                    id={`needs-${key}`}
                    flex={1}
                    unstyled
                    fontSize="$5"
                    color={C.text}
                    placeholderTextColor={C.muted}
                    placeholder={t(placeholder)}
                    keyboardType="decimal-pad"
                    value={values[key]}
                    onChangeText={(raw) => handleChange(key, raw)}
                    accessibilityLabel={t(labelKey)}
                    {...(Platform.OS === 'ios' ? { inputAccessoryViewID: 'needs-empty' } : {})}
                  />
                  <Text fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
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
            <Text fontSize="$4" fontWeight="600" color={C.textSec}>
              {t('onboarding.needs.total')}
            </Text>
            <XStack items="baseline" gap="$1">
              <Text fontSize="$6" fontWeight="800" color={hasAnyValue ? C.text : C.muted}>
                {formattedTotal}
              </Text>
              <Text fontSize="$4" fontWeight="600" color={C.textSec}>
                {t('common.currency')}
              </Text>
            </XStack>
          </XStack>

          {/* Validation error */}
          {showError && (
            <Paragraph fontSize="$3" color={C.error} textAlign="center">
              {t('onboarding.needs.validationError')}
            </Paragraph>
          )}
        </YStack>
      </ScrollView>

      {/* Sticky CTA */}
      <YStack px="$5" pb={insets.bottom + 16} pt="$3" bg={C.bg}>
        <Button
          size="$5"
          bg={hasAnyValue ? C.accent : C.border}
          color={hasAnyValue ? C.bg : C.muted}
          pressStyle={{ bg: C.accentPress }}
          onPress={handleContinue}
          fontWeight="700"
          accessibilityRole="button"
        >
          {t('common.continue')}
        </Button>
      </YStack>
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID="needs-empty">
          <View />
        </InputAccessoryView>
      )}
    </KeyboardAvoidingView>
  );
}
