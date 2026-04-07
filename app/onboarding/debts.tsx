import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Pressable, TextInput } from 'react-native';
import { YStack, XStack, Text, H2, Button, Paragraph } from 'tamagui';
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
  overdueAmount: string;
}

const EMPTY_FORM: FormState = {
  label: '',
  type: 'credit',
  remainingAmount: '',
  minimumPayment: '',
  interestRate: '',
  overdueAmount: '',
};

export default function OnboardingDebtsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const debts = useAppStore((s) => s.debts);
  const addDebt = useAppStore((s) => s.addDebt);
  const removeDebt = useAppStore((s) => s.removeDebt);
  const addDeferredPayment = useAppStore((s) => s.addDeferredPayment);

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
    const minPayment = parseAmount(form.minimumPayment);

    addDebt({
      id,
      label,
      type: form.type,
      creditorKind: 'other',
      originalAmount: remaining,
      remainingAmount: remaining,
      minimumPayment: minPayment,
      interestRate: parseAmount(form.interestRate),
      createdAt: new Date().toISOString(),
      closedAt: null,
    });

    // Create deferred payment for overdue amount
    const overdue = parseAmount(form.overdueAmount);
    if (overdue > 0) {
      addDeferredPayment({
        id: `${id}-overdue`,
        kind: 'minimum_payment',
        debtId: id,
        amount: overdue,
        deferredAt: new Date().toISOString(),
        reason: 'postponing',
        resolved: false,
      });
    }

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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
          <YStack
            bg={C.bg}
            px="$5"
            pt="$4"
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
              <Paragraph fontFamily="$body" fontSize="$3" color={C.muted} style={{ textAlign: 'center' }} py="$4">
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
                      <Text fontFamily="$body" fontSize="$5" fontWeight="700" color={C.text}>
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
                        <Text fontFamily="$body" fontSize="$2" color={C.muted} fontWeight="600">
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
                      <Text fontFamily="$body" fontSize="$2" color={C.muted} fontWeight="600">
                        {t('debts.form.remainingAmount')}
                      </Text>
                      <XStack items="baseline" gap="$1">
                        <Text fontFamily="$body" fontSize="$4" fontWeight="700" color={C.text}>
                          {formatAmount(debt.remainingAmount)}
                        </Text>
                        <Text fontFamily="$body" fontSize="$3" color={C.textSec}>
                          {t('common.currency')}
                        </Text>
                      </XStack>
                    </YStack>
                    {debt.minimumPayment > 0 && (
                      <YStack gap="$1">
                        <Text fontFamily="$body" fontSize="$2" color={C.muted} fontWeight="600">
                          {t('debts.form.minimumPayment')}
                        </Text>
                        <XStack items="baseline" gap="$1">
                          <Text fontFamily="$body" fontSize="$4" fontWeight="700" color={C.text}>
                            {formatAmount(debt.minimumPayment)}
                          </Text>
                          <Text fontFamily="$body" fontSize="$3" color={C.textSec}>
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
              borderWidth={1}
              borderColor={C.accent}
              pressStyle={{ bg: C.border }}
              onPress={() => setShowForm(true)}
            >
              <Text fontFamily="$body" color={C.accent} fontWeight="700">{t('onboarding.debts.addDebt')}</Text>
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
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  fontWeight="600"
                  color={C.textSec}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t('debts.form.label')}
                </Text>
                <YStack
                  bg={C.bg}
                  borderWidth={1}
                  borderColor={C.border}
                  rounded="$4"
                  height={52}
                  px="$4"
                  justify="center"
                >
                  <TextInput
                    style={{ fontSize: 18, color: C.text, fontFamily: 'Jersey25_400Regular' }}
                    placeholderTextColor={C.muted}
                    placeholder={t('onboarding.debts.labelPlaceholder')}
                    value={form.label}
                    onChangeText={(v) => updateField('label', v)}
                    accessibilityLabel={t('debts.form.label')}
                  />
                </YStack>
              </YStack>

              {/* Type chips */}
              <YStack gap="$2">
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  fontWeight="600"
                  color={C.textSec}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t('debts.form.type')}
                </Text>
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
                            fontFamily="$body"
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
                <Paragraph fontFamily="$body" fontSize="$2" color={C.muted}>
                  {t(`onboarding.debts.typeHints.${form.type}`)}
                </Paragraph>
              </YStack>

              {/* Remaining amount */}
              <YStack gap="$2">
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  fontWeight="600"
                  color={C.textSec}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t('debts.form.remainingAmount')}
                </Text>
                <Paragraph fontFamily="$body" fontSize="$2" color={C.muted} mt={-4}>
                  {t('debts.form.remainingAmountHint')}
                </Paragraph>
                <XStack
                  bg={C.bg}
                  borderWidth={1}
                  borderColor={C.border}
                  rounded="$4"
                  items="center"
                  px="$4"
                  height={52}
                >
                  <TextInput
                    style={{ flex: 1, fontSize: 18, color: C.text, fontFamily: 'Jersey25_400Regular', paddingVertical: 8 }}
                    placeholderTextColor={C.muted}
                    placeholder={t('onboarding.debts.remainingAmountPlaceholder')}
                    keyboardType="decimal-pad"
                    value={form.remainingAmount}
                    onChangeText={(v) => updateField('remainingAmount', sanitiseDecimal(v))}
                    accessibilityLabel={t('debts.form.remainingAmount')}
                  />
                  <Text fontFamily="$body" fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
                    {t('common.currency')}
                  </Text>
                </XStack>
              </YStack>

              {/* Minimum payment */}
              <YStack gap="$2">
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  fontWeight="600"
                  color={C.textSec}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t('debts.form.minimumPayment')}
                </Text>
                <Paragraph fontFamily="$body" fontSize="$2" color={C.muted} mt={-4}>
                  {t('debts.form.minimumPaymentHint')}
                </Paragraph>
                <XStack
                  bg={C.bg}
                  borderWidth={1}
                  borderColor={C.border}
                  rounded="$4"
                  items="center"
                  px="$4"
                  height={52}
                >
                  <TextInput
                    style={{ flex: 1, fontSize: 18, color: C.text, fontFamily: 'Jersey25_400Regular', paddingVertical: 8 }}
                    placeholderTextColor={C.muted}
                    placeholder={t('onboarding.debts.minimumPaymentPlaceholder')}
                    keyboardType="decimal-pad"
                    value={form.minimumPayment}
                    onChangeText={(v) => updateField('minimumPayment', sanitiseDecimal(v))}
                    accessibilityLabel={t('debts.form.minimumPayment')}
                  />
                  <Text fontFamily="$body" fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
                    {t('common.currency')}
                  </Text>
                </XStack>
              </YStack>

              {/* Interest rate (optional) */}
              <YStack gap="$2">
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  fontWeight="600"
                  color={C.textSec}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t('debts.form.interestRate')}
                </Text>
                <Paragraph fontFamily="$body" fontSize="$2" color={C.muted} mt={-4}>
                  {t('debts.form.interestRateHint')}
                </Paragraph>
                <XStack
                  bg={C.bg}
                  borderWidth={1}
                  borderColor={C.border}
                  rounded="$4"
                  items="center"
                  px="$4"
                  height={52}
                >
                  <TextInput
                    style={{ flex: 1, fontSize: 18, color: C.text, fontFamily: 'Jersey25_400Regular', paddingVertical: 8 }}
                    placeholderTextColor={C.muted}
                    placeholder={t('onboarding.debts.interestRatePlaceholder')}
                    keyboardType="decimal-pad"
                    value={form.interestRate}
                    onChangeText={(v) => updateField('interestRate', sanitiseDecimal(v))}
                    onSubmitEditing={handleSave}
                    accessibilityLabel={t('debts.form.interestRate')}
                  />
                  <Text fontFamily="$body" fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
                    %
                  </Text>
                </XStack>
              </YStack>

              {/* Overdue amount */}
              <YStack gap="$2">
                <Text
                  fontFamily="$body"
                  fontSize="$3"
                  fontWeight="600"
                  color={C.textSec}
                  textTransform="uppercase"
                  letterSpacing={0.5}
                >
                  {t('debts.form.overdueAmount')}
                </Text>
                <Paragraph fontFamily="$body" fontSize="$2" color={C.muted} mt={-4}>
                  {t('debts.form.overdueAmountHint')}
                </Paragraph>
                <XStack
                  bg={C.bg}
                  borderWidth={1}
                  borderColor={C.border}
                  rounded="$4"
                  items="center"
                  px="$4"
                  height={52}
                >
                  <TextInput
                    style={{ flex: 1, fontSize: 18, color: C.text, fontFamily: 'Jersey25_400Regular', paddingVertical: 8 }}
                    placeholderTextColor={C.muted}
                    placeholder={t('onboarding.debts.overdueAmountPlaceholder')}
                    keyboardType="decimal-pad"
                    value={form.overdueAmount}
                    onChangeText={(v) => updateField('overdueAmount', sanitiseDecimal(v))}
                    onSubmitEditing={handleSave}
                    accessibilityLabel={t('debts.form.overdueAmount')}
                  />
                  <Text fontFamily="$body" fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
                    {t('common.currency')}
                  </Text>
                </XStack>
              </YStack>

              {/* Form validation error */}
              {formError && (
                <Paragraph fontFamily="$body" fontSize="$3" color={C.error}>
                  {formError}
                </Paragraph>
              )}

              {/* Form actions */}
              <XStack gap="$3">
                <Button
                  flex={1}
                  size="$4"
                  bg="transparent"
                  borderWidth={1}
                  borderColor={C.border}
                  pressStyle={{ bg: C.border }}
                  onPress={() => {
                    setShowForm(false);
                    setForm(EMPTY_FORM);
                    setFormError(null);
                  }}
                >
                  <Text fontFamily="$body" color={C.muted} fontWeight="600">{t('common.cancel')}</Text>
                </Button>
                <Button
                  flex={1}
                  size="$4"
                  bg={C.accent}
                  pressStyle={{ bg: C.accentPress }}
                  onPress={handleSave}
                >
                  <Text fontFamily="$body" color={C.bg} fontWeight="700">{t('common.save')}</Text>
                </Button>
              </XStack>
            </YStack>
          )}

          {/* Bottom navigation — hidden while form is open */}
          {!showForm && (
            <YStack px="$5" pb="$3" pt="$3">
              {hasDebts ? (
                <Button
                  size="$5"
                  bg={C.accent}
                  pressStyle={{ bg: C.accentPress }}
                  onPress={handleContinue}
                  accessibilityRole="button"
                >
                  <Text fontFamily="$body" color={C.bg} fontWeight="700">{t('common.continue')}</Text>
                </Button>
              ) : (
                <Button
                  size="$5"
                  bg="transparent"
                  pressStyle={{ opacity: 0.7 }}
                  onPress={handleContinue}
                  accessibilityRole="button"
                >
                  <Text fontFamily="$body" color={C.muted} fontWeight="600">{t('onboarding.debts.skip')}</Text>
                </Button>
              )}
            </YStack>
          )}

          </YStack>
        </ScrollView>
    </SafeAreaView>
  );
}
