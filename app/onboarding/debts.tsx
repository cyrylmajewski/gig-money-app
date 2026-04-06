import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform, ScrollView, Pressable, InputAccessoryView, View } from 'react-native';
import { YStack, XStack, Text, H2, Input, Button, Label, Paragraph } from 'tamagui';
import { X } from 'lucide-react-native';
import { useAppStore } from '@/store';
import type { DebtType } from '@/types/models';

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

const DEBT_TYPES: DebtType[] = [
  'payday_loan',
  'credit',
  'credit_card',
  'installment',
  'other',
];

function parseAmount(raw: string): number {
  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) || value < 0 ? 0 : value;
}

function sanitiseDecimal(raw: string): string {
  const cleaned = raw.replace(/[^0-9.,]/g, '');
  const normalised = cleaned.replace(',', '.');
  const parts = normalised.split('.');
  let final = (parts[0] ?? '').slice(0, 8);
  if (parts.length > 1) {
    final += ',' + (parts[1] ?? '').slice(0, 2);
  }
  return final;
}

interface FormState {
  label: string;
  type: DebtType;
  remainingAmount: string;
  minimumPayment: string;
  interestRate: string;
}

const EMPTY_FORM: FormState = {
  label: '',
  type: 'credit',
  remainingAmount: '',
  minimumPayment: '',
  interestRate: '',
};

export default function OnboardingDebtsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const debts = useAppStore((s) => s.debts);
  const addDebt = useAppStore((s) => s.addDebt);
  const removeDebt = useAppStore((s) => s.removeDebt);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const hasDebts = debts.length > 0;

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
  }

  function handleSave() {
    const label = form.label.trim();
    const remaining = parseAmount(form.remainingAmount);

    if (!label) {
      setFormError(t('debts.validationLabel'));
      return;
    }
    if (remaining <= 0) {
      setFormError(t('debts.validationRemainingAmount'));
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    addDebt({
      id,
      label,
      type: form.type,
      creditorKind: 'other',
      originalAmount: remaining,
      remainingAmount: remaining,
      minimumPayment: parseAmount(form.minimumPayment),
      interestRate: parseAmount(form.interestRate),
      createdAt: new Date().toISOString(),
      closedAt: null,
    });

    setForm(EMPTY_FORM);
    setShowForm(false);
    setFormError(null);
  }

  function handleContinue() {
    router.push('/onboarding/ready');
  }

  function formatAmount(amount: number): string {
    return amount.toLocaleString('pl-PL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <YStack
          bg={C.bg}
          px="$5"
          pt={insets.top + 32}
          pb="$5"
          gap="$5"
        >
          {/* Title */}
          <H2 color={C.text} fontWeight="700" letterSpacing={-0.5}>
            {t('onboarding.debts.title')}
          </H2>

          {/* Debt list */}
          <YStack gap="$3">
            {!hasDebts ? (
              <Paragraph fontSize="$3" color={C.muted} textAlign="center" py="$4">
                {t('debts.list.empty')}
              </Paragraph>
            ) : (
              debts.map((debt) => (
                <YStack
                  key={debt.id}
                  bg={C.card}
                  borderWidth={1}
                  borderColor={C.border}
                  rounded="$4"
                  p="$4"
                  gap="$2"
                >
                  <XStack justify="space-between" items="flex-start">
                    <YStack flex={1} gap="$1">
                      <Text fontSize="$5" fontWeight="700" color={C.text}>
                        {debt.label}
                      </Text>
                      {/* Type badge */}
                      <YStack
                        bg={C.border}
                        rounded="$2"
                        px="$2"
                        py="$1"
                        self="flex-start"
                      >
                        <Text fontSize="$2" color={C.muted} fontWeight="600">
                          {t(`onboarding.debts.types.${debt.type}`)}
                        </Text>
                      </YStack>
                    </YStack>
                    {/* Remove button */}
                    <Pressable
                      onPress={() => removeDebt(debt.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.delete')}
                      hitSlop={8}
                    >
                      <YStack p="$1">
                        <X size={18} color={C.muted} />
                      </YStack>
                    </Pressable>
                  </XStack>

                  <XStack gap="$4" mt="$1">
                    <YStack gap="$1">
                      <Text fontSize="$2" color={C.muted} fontWeight="600">
                        {t('debts.form.remainingAmount')}
                      </Text>
                      <XStack items="baseline" gap="$1">
                        <Text fontSize="$4" fontWeight="700" color={C.text}>
                          {formatAmount(debt.remainingAmount)}
                        </Text>
                        <Text fontSize="$3" color={C.textSec}>
                          {t('common.currency')}
                        </Text>
                      </XStack>
                    </YStack>
                    {debt.minimumPayment > 0 && (
                      <YStack gap="$1">
                        <Text fontSize="$2" color={C.muted} fontWeight="600">
                          {t('debts.form.minimumPayment')}
                        </Text>
                        <XStack items="baseline" gap="$1">
                          <Text fontSize="$4" fontWeight="700" color={C.text}>
                            {formatAmount(debt.minimumPayment)}
                          </Text>
                          <Text fontSize="$3" color={C.textSec}>
                            {t('common.currency')}
                          </Text>
                        </XStack>
                      </YStack>
                    )}
                  </XStack>
                </YStack>
              ))
            )}
          </YStack>

          {/* Add debt toggle button */}
          {!showForm && (
            <Button
              size="$4"
              bg={C.card}
              color={C.accent}
              borderWidth={1}
              borderColor={C.accent}
              pressStyle={{ bg: C.border }}
              onPress={() => setShowForm(true)}
              fontWeight="700"
            >
              {t('onboarding.debts.addDebt')}
            </Button>
          )}

          {/* Inline form */}
          {showForm && (
            <YStack
              bg={C.card}
              borderWidth={1}
              borderColor={C.border}
              rounded="$4"
              p="$4"
              gap="$4"
            >
              {/* Label field */}
              <YStack gap="$2">
                <Label
                  htmlFor="debt-label"
                  fontSize="$3"
                  fontWeight="600"
                  color={C.muted}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t('debts.form.label')}
                </Label>
                <YStack
                  bg={C.bg}
                  borderWidth={1}
                  borderColor={C.border}
                  rounded="$4"
                  height={52}
                  px="$4"
                  justify="center"
                >
                  <Input
                    id="debt-label"
                    unstyled
                    fontSize="$5"
                    color={C.text}
                    placeholderTextColor={C.muted}
                    placeholder={t('onboarding.debts.labelPlaceholder')}
                    value={form.label}
                    onChangeText={(v) => updateField('label', v)}
                    {...(Platform.OS === 'ios' ? { inputAccessoryViewID: 'debts-empty' } : {})}
                    accessibilityLabel={t('debts.form.label')}
                  />
                </YStack>
              </YStack>

              {/* Type chips */}
              <YStack gap="$2">
                <Label
                  fontSize="$3"
                  fontWeight="600"
                  color={C.muted}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t('debts.form.type')}
                </Label>
                <XStack flexWrap="wrap" gap="$2">
                  {DEBT_TYPES.map((type) => {
                    const selected = form.type === type;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => setForm((prev) => ({ ...prev, type }))}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <YStack
                          bg={selected ? C.accent : C.bg}
                          borderWidth={1}
                          borderColor={selected ? C.accent : C.border}
                          rounded="$3"
                          px="$3"
                          py="$2"
                        >
                          <Text
                            fontSize="$3"
                            fontWeight="600"
                            color={selected ? C.bg : C.textSec}
                          >
                            {t(`onboarding.debts.types.${type}`)}
                          </Text>
                        </YStack>
                      </Pressable>
                    );
                  })}
                </XStack>
              </YStack>

              {/* Remaining amount */}
              <YStack gap="$2">
                <Label
                  htmlFor="debt-remaining"
                  fontSize="$3"
                  fontWeight="600"
                  color={C.muted}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t('debts.form.remainingAmount')}
                </Label>
                <XStack
                  bg={C.bg}
                  borderWidth={1}
                  borderColor={C.border}
                  rounded="$4"
                  items="center"
                  px="$4"
                  height={52}
                >
                  <Input
                    id="debt-remaining"
                    flex={1}
                    unstyled
                    fontSize="$5"
                    color={C.text}
                    placeholderTextColor={C.muted}
                    placeholder={t('onboarding.debts.remainingAmountPlaceholder')}
                    keyboardType="decimal-pad"
                    value={form.remainingAmount}
                    onChangeText={(v) => updateField('remainingAmount', sanitiseDecimal(v))}
                    {...(Platform.OS === 'ios' ? { inputAccessoryViewID: 'debts-empty' } : {})}
                    accessibilityLabel={t('debts.form.remainingAmount')}
                  />
                  <Text fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
                    {t('common.currency')}
                  </Text>
                </XStack>
              </YStack>

              {/* Minimum payment */}
              <YStack gap="$2">
                <Label
                  htmlFor="debt-minimum"
                  fontSize="$3"
                  fontWeight="600"
                  color={C.muted}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t('debts.form.minimumPayment')}
                </Label>
                <XStack
                  bg={C.bg}
                  borderWidth={1}
                  borderColor={C.border}
                  rounded="$4"
                  items="center"
                  px="$4"
                  height={52}
                >
                  <Input
                    id="debt-minimum"
                    flex={1}
                    unstyled
                    fontSize="$5"
                    color={C.text}
                    placeholderTextColor={C.muted}
                    placeholder={t('onboarding.debts.minimumPaymentPlaceholder')}
                    keyboardType="decimal-pad"
                    value={form.minimumPayment}
                    onChangeText={(v) => updateField('minimumPayment', sanitiseDecimal(v))}
                    {...(Platform.OS === 'ios' ? { inputAccessoryViewID: 'debts-empty' } : {})}
                    accessibilityLabel={t('debts.form.minimumPayment')}
                  />
                  <Text fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
                    {t('common.currency')}
                  </Text>
                </XStack>
              </YStack>

              {/* Interest rate (optional) */}
              <YStack gap="$2">
                <Label
                  htmlFor="debt-interest"
                  fontSize="$3"
                  fontWeight="600"
                  color={C.muted}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t('debts.form.interestRate')}
                </Label>
                <XStack
                  bg={C.bg}
                  borderWidth={1}
                  borderColor={C.border}
                  rounded="$4"
                  items="center"
                  px="$4"
                  height={52}
                >
                  <Input
                    id="debt-interest"
                    flex={1}
                    unstyled
                    fontSize="$5"
                    color={C.text}
                    placeholderTextColor={C.muted}
                    placeholder={t('onboarding.debts.interestRatePlaceholder')}
                    keyboardType="decimal-pad"
                    value={form.interestRate}
                    onChangeText={(v) => updateField('interestRate', sanitiseDecimal(v))}
                    {...(Platform.OS === 'ios' ? { inputAccessoryViewID: 'debts-empty' } : {})}
                    onSubmitEditing={handleSave}
                    accessibilityLabel={t('debts.form.interestRate')}
                  />
                  <Text fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
                    %
                  </Text>
                </XStack>
              </YStack>

              {/* Form validation error */}
              {formError && (
                <Paragraph fontSize="$3" color={C.error}>
                  {formError}
                </Paragraph>
              )}

              {/* Form actions */}
              <XStack gap="$3">
                <Button
                  flex={1}
                  size="$4"
                  bg="transparent"
                  color={C.muted}
                  borderWidth={1}
                  borderColor={C.border}
                  pressStyle={{ bg: C.border }}
                  onPress={() => {
                    setShowForm(false);
                    setForm(EMPTY_FORM);
                    setFormError(null);
                  }}
                  fontWeight="600"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  flex={1}
                  size="$4"
                  bg={C.accent}
                  color={C.bg}
                  pressStyle={{ bg: C.accentPress }}
                  onPress={handleSave}
                  fontWeight="700"
                >
                  {t('common.save')}
                </Button>
              </XStack>
            </YStack>
          )}

        </YStack>
      </ScrollView>

      {/* Sticky bottom navigation — hidden while form is open */}
      {!showForm && (
        <YStack px="$5" pb={insets.bottom + 16} pt="$3" bg={C.bg}>
          {hasDebts ? (
            <Button
              size="$5"
              bg={C.accent}
              color={C.bg}
              pressStyle={{ bg: C.accentPress }}
              onPress={handleContinue}
              fontWeight="700"
              accessibilityRole="button"
            >
              {t('common.continue')}
            </Button>
          ) : (
            <Button
              size="$5"
              bg="transparent"
              color={C.muted}
              pressStyle={{ opacity: 0.7 }}
              onPress={handleContinue}
              fontWeight="600"
              accessibilityRole="button"
            >
              {t('onboarding.debts.skip')}
            </Button>
          )}
        </YStack>
      )}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID="debts-empty">
          <View />
        </InputAccessoryView>
      )}
    </KeyboardAvoidingView>
  );
}
