import { useState } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  Pressable,
  Alert,
  TextInput } from 'react-native';
import { YStack, XStack, Text, H2, Button, Paragraph } from 'tamagui';
import { useAppStore } from '@/store';
import { parseAmount, formatAmountForInput, sanitiseDecimal } from '@/lib/format';
import type { DebtType } from '@/types/models';


const DEBT_TYPES: DebtType[] = [
  'payday_loan',
  'credit',
  'credit_card',
  'installment',
  'other',
];

interface FormState {
  label: string;
  type: DebtType;
  remainingAmount: string;
  minimumPayment: string;
  interestRate: string;
  paymentDay: string;
}

export default function DebtDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const debts = useAppStore((s) => s.debts);
  const updateDebt = useAppStore((s) => s.updateDebt);
  const addDeferredPayment = useAppStore((s) => s.addDeferredPayment);

  const debt = debts.find((d) => d.id === id);

  const [form, setForm] = useState<FormState>(() => {
    if (!debt) {
      return {
        label: '',
        type: 'credit',
        remainingAmount: '',
        minimumPayment: '',
        interestRate: '',
        paymentDay: '' };
    }
    return {
      label: debt.label,
      type: debt.type,
      remainingAmount: formatAmountForInput(debt.remainingAmount),
      minimumPayment: formatAmountForInput(debt.minimumPayment),
      interestRate: debt.interestRate > 0 ? formatAmountForInput(debt.interestRate) : '',
      paymentDay: debt.paymentDay ? debt.paymentDay.toString() : '' };
  });
  const [showOverdue, setShowOverdue] = useState(false);
  const [overdueAmount, setOverdueAmount] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  const isClosed = debt?.closedAt != null;

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError(null);
  }

  function handleSave() {
    if (!debt) return;

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

    updateDebt(debt.id, {
      label,
      type: form.type,
      remainingAmount: remaining,
      minimumPayment: parseAmount(form.minimumPayment),
      interestRate: parseAmount(form.interestRate),
      paymentDay: form.paymentDay ? parseInt(form.paymentDay, 10) : null });

    router.back();
  }

  function handleMarkClosed() {
    if (!debt) return;

    Alert.alert(
      t('debts.form.markClosed'),
      t('debts.edit.closeConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel' },
        {
          text: t('debts.form.markClosed'),
          style: 'destructive',
          onPress: () => {
            updateDebt(debt.id, { closedAt: new Date().toISOString() });
            router.back();
          } },
      ]
    );
  }

  // Debt not found state
  if (!debt) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: t('debts.edit.title'),
            headerStyle: { },
            headerShadowVisible: false }}
        />
        <YStack flex={1} justify="center" items="center" px="$6" gap="$4">
          <Paragraph style={{ textAlign: 'center' }}>
            {t('debts.edit.notFound')}
          </Paragraph>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text>
              {t('common.back')}
            </Text>
          </Pressable>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: t('debts.edit.title'),
          headerStyle: { },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              hitSlop={8}
              style={{ paddingRight: 16 }}
            >
              <Text>
                {t('common.back')}
              </Text>
            </Pressable>
          ) }}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        <YStack px="$5" pt="$4" gap="$5">

          {/* Title row with optional closed badge */}
          <XStack items="center" gap="$3">
            <H2 flex={1} numberOfLines={2}>
              {debt.label}
            </H2>
            {isClosed && (
              <YStack
                rounded="$3"
                px="$3"
                py="$1"
                accessibilityLabel={t('debts.edit.closedBadgeLabel')}
              >
                <Text textTransform="uppercase" letterSpacing={0.5}>
                  {t('debts.edit.closed')}
                </Text>
              </YStack>
            )}
          </XStack>

          {/* Closed notice */}
          {isClosed && (
            <YStack
              borderWidth={1}
              rounded="$4"
              p="$4"
            >
              <Paragraph>
                {t('debts.edit.closedBadgeLabel')}
              </Paragraph>
            </YStack>
          )}

          {/* Label field */}
          <YStack gap="$2">
            <Text
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {t('debts.form.label')}
            </Text>
            <YStack
              borderWidth={1}
              rounded="$4"
              height={52}
              px="$4"
              justify="center"
              opacity={isClosed ? 0.5 : 1}
            >
              <TextInput
                style={{ paddingVertical: 8 }}
                value={form.label}
                onChangeText={(v) => updateField('label', v)}
                editable={!isClosed}
                accessibilityLabel={t('debts.form.label')}
              />
            </YStack>
          </YStack>

          {/* Type chips */}
          <YStack gap="$2">
            <Text
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {t('debts.form.type')}
            </Text>
            <XStack flexWrap="wrap" gap="$2" opacity={isClosed ? 0.5 : 1}>
              {DEBT_TYPES.map((type) => {
                const selected = form.type === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => {
                      if (!isClosed) {
                        setForm((prev) => ({ ...prev, type }));
                      }
                    }}
                    disabled={isClosed}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: isClosed }}
                  >
                    <YStack
                      borderWidth={1}
                      rounded="$3"
                      px="$3"
                      py="$2"
                    >
                      <Text
                      >
                        {t(`onboarding.debts.types.${type}`)}
                      </Text>
                    </YStack>
                  </Pressable>
                );
              })}
            </XStack>
            <Paragraph>
              {t(`onboarding.debts.typeHints.${form.type}`)}
            </Paragraph>
          </YStack>

          {/* Remaining amount */}
          <YStack gap="$2">
            <Text
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {t('debts.form.remainingAmount')}
            </Text>
            <Paragraph mt={-4} mb="$1">
              {t('debts.form.remainingAmountHint')}
            </Paragraph>
            <XStack
              borderWidth={1}
              rounded="$4"
              items="center"
              px="$4"
              height={52}
              opacity={isClosed ? 0.5 : 1}
            >
              <TextInput
                style={{ flex: 1, paddingVertical: 8 }}
                keyboardType="decimal-pad"
                value={form.remainingAmount}
                onChangeText={(v) => updateField('remainingAmount', sanitiseDecimal(v))}
                editable={!isClosed}
                accessibilityLabel={t('debts.form.remainingAmount')}
              />
              <Text ml="$2">
                {t('common.currency')}
              </Text>
            </XStack>
          </YStack>

          {/* Minimum payment */}
          <YStack gap="$2">
            <Text
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {t('debts.form.minimumPayment')}
            </Text>
            <Paragraph mt={-4} mb="$1">
              {t('debts.form.minimumPaymentHint')}
            </Paragraph>
            <XStack
              borderWidth={1}
              rounded="$4"
              items="center"
              px="$4"
              height={52}
              opacity={isClosed ? 0.5 : 1}
            >
              <TextInput
                style={{ flex: 1, paddingVertical: 8 }}
                keyboardType="decimal-pad"
                value={form.minimumPayment}
                onChangeText={(v) => updateField('minimumPayment', sanitiseDecimal(v))}
                editable={!isClosed}
                accessibilityLabel={t('debts.form.minimumPayment')}
              />
              <Text ml="$2">
                {t('common.currency')}
              </Text>
            </XStack>
          </YStack>

          {/* Interest rate (optional) */}
          <YStack gap="$2">
            <Text
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {t('debts.form.interestRate')}
            </Text>
            <Paragraph mt={-4}>
              {t('debts.form.interestRateHint')}
            </Paragraph>
            <XStack
              borderWidth={1}
              rounded="$4"
              items="center"
              px="$4"
              height={52}
              opacity={isClosed ? 0.5 : 1}
            >
              <TextInput
                style={{ flex: 1, paddingVertical: 8 }}
                keyboardType="decimal-pad"
                value={form.interestRate}
                onChangeText={(v) => updateField('interestRate', sanitiseDecimal(v))}
                editable={!isClosed}
                accessibilityLabel={t('debts.form.interestRate')}
              />
              <Text ml="$2">
                %
              </Text>
            </XStack>
          </YStack>

          {/* Payment day */}
          <YStack gap="$2">
            <Text
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {t('debts.form.paymentDay')}
            </Text>
            <Paragraph mt={-4}>
              {t('debts.form.paymentDayHint')}
            </Paragraph>
            <XStack
              borderWidth={1}
              rounded="$4"
              items="center"
              px="$4"
              height={52}
              opacity={isClosed ? 0.5 : 1}
            >
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 8 }}
                placeholder={t('debts.form.paymentDayPlaceholder')}
                keyboardType="number-pad"
                maxLength={2}
                value={form.paymentDay}
                onChangeText={(v) => {
                  const digits = v.replace(/[^0-9]/g, '');
                  const num = parseInt(digits, 10);
                  if (digits === '' || (num >= 1 && num <= 31)) {
                    updateField('paymentDay', digits);
                  }
                }}
                editable={!isClosed}
                accessibilityLabel={t('debts.form.paymentDay')}
              />
              <Text>
                {t('debts.form.paymentDaySuffix')}
              </Text>
            </XStack>
          </YStack>

          {/* Record missed payment */}
          {!isClosed && debt.minimumPayment > 0 && (
            <YStack gap="$3">
              {!showOverdue ? (
                <Button
                  size="$4"
                  bg="transparent"
                  borderWidth={1}
                  borderColor="#FBBF24"
                  pressStyle={{ opacity: 0.7 }}
                  onPress={() => {
                    setOverdueAmount(formatAmountForInput(debt.minimumPayment));
                    setShowOverdue(true);
                  }}
                  accessibilityRole="button"
                >
                  <Text color="#FBBF24">
                    {t('debts.form.recordMissedPayment')}
                  </Text>
                </Button>
              ) : (
                <YStack
                  borderWidth={1}
                  borderColor="#FBBF24"
                  rounded="$4"
                  p="$4"
                  gap="$3"
                >
                  <Text color="#FBBF24">
                    {t('debts.form.missedPaymentTitle')}
                  </Text>
                  <Paragraph>
                    {t('debts.form.missedPaymentHint')}
                  </Paragraph>
                  <XStack
                    borderWidth={1}
                    rounded="$4"
                    items="center"
                    px="$4"
                    height={52}
                  >
                    <TextInput
                      style={{ flex: 1, paddingVertical: 8 }}
                      keyboardType="decimal-pad"
                      value={overdueAmount}
                      onChangeText={(v) => setOverdueAmount(sanitiseDecimal(v))}
                      accessibilityLabel={t('debts.form.missedPaymentTitle')}
                    />
                    <Text ml="$2">
                      {t('common.currency')}
                    </Text>
                  </XStack>
                  <XStack gap="$3">
                    <Button
                      flex={1}
                      size="$4"
                      bg="transparent"
                      borderWidth={1}
                      onPress={() => {
                        setShowOverdue(false);
                        setOverdueAmount('');
                      }}
                    >
                      <Text>{t('common.cancel')}</Text>
                    </Button>
                    <Button
                      flex={1}
                      size="$4"
                      bg="#FBBF24"
                      pressStyle={{ opacity: 0.8 }}
                      onPress={() => {
                        const amount = parseAmount(overdueAmount);
                        if (amount <= 0 || !debt) return;
                        addDeferredPayment({
                          id: `${debt.id}-overdue-${Date.now()}`,
                          kind: 'minimum_payment',
                          debtId: debt.id,
                          amount,
                          deferredAt: new Date().toISOString(),
                          reason: 'postponing',
                          resolved: false });
                        setShowOverdue(false);
                        setOverdueAmount('');
                        Alert.alert(
                          t('debts.form.missedPaymentSavedTitle'),
                          t('debts.form.missedPaymentSavedMessage'),
                        );
                      }}
                    >
                      <Text>{t('debts.form.recordMissedPaymentConfirm')}</Text>
                    </Button>
                  </XStack>
                </YStack>
              )}
            </YStack>
          )}

          {/* Form validation error */}
          {formError && (
            <Paragraph>
              {formError}
            </Paragraph>
          )}

          {/* Action buttons — inside scroll so content is never cut */}
          {!isClosed && (
            <YStack gap="$3" pt="$2">
              <Button
                size="$5"
                onPress={handleSave}
                accessibilityRole="button"
              >
                <Text>{t('common.save')}</Text>
              </Button>

              <Button
                size="$4"
                bg="transparent"
                borderWidth={1}
                pressStyle={{ opacity: 0.7 }}
                onPress={handleMarkClosed}
                accessibilityRole="button"
              >
                <Text>{t('debts.form.markClosed')}</Text>
              </Button>
            </YStack>
          )}

        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
