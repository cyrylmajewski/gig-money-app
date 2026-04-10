import { useForm } from '@tanstack/react-form';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Paragraph, Text, XStack, YStack, useTheme } from 'tamagui';

import { parseAmount, sanitiseDecimal } from '@/lib/format';
import { useAppStore } from '@/store';
import type { DebtType } from '@/types/models';

const DEBT_TYPES: DebtType[] = [
  'payday_loan',
  'credit',
  'credit_card',
  'installment',
  'other',
];

export default function NewDebtScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const addDebt = useAppStore((s) => s.addDebt);
  const addDeferredPayment = useAppStore((s) => s.addDeferredPayment);

  const form = useForm({
    defaultValues: {
      label: '',
      type: 'credit' as DebtType,
      remainingAmount: '',
      minimumPayment: '',
      interestRate: '',
      overdueAmount: '',
      paymentDay: '',
    },
    onSubmit: ({ value }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const remaining = parseAmount(value.remainingAmount);

      addDebt({
        id,
        label: value.label.trim(),
        type: value.type,
        creditorKind: 'other',
        originalAmount: remaining,
        remainingAmount: remaining,
        minimumPayment: parseAmount(value.minimumPayment),
        interestRate: parseAmount(value.interestRate),
        paymentDay: value.paymentDay ? parseInt(value.paymentDay, 10) : null,
        createdAt: new Date().toISOString(),
        closedAt: null,
      });

      const overdue = parseAmount(value.overdueAmount);
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

      router.back();
    },
  });

  const inputStyle = {
    flex: 1,
    color: theme.color12.val,
    fontSize: 16,
    paddingVertical: 8,
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: t('debts.new.title'),
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <Text color="$color11">{t('common.back')}</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        {/* Label */}
        <form.Field
          name="label"
          validators={{
            onSubmit: ({ value }) =>
              !value.trim() ? t('debts.validationLabel') : undefined,
          }}
        >
          {(field) => (
            <YStack gap="$2" mb="$5">
              <Text color="$color11" fontSize="$2" textTransform="uppercase" letterSpacing={0.6}>
                {t('debts.form.label')}
              </Text>
              <XStack borderWidth={1} borderColor="$color5" rounded="$4" items="center" px="$3" height={48}>
                <TextInput
                  style={inputStyle}
                  placeholder={t('onboarding.debts.labelPlaceholder')}
                  placeholderTextColor={theme.color8.val}
                  value={field.state.value}
                  onChangeText={field.handleChange}
                  returnKeyType="next"
                />
              </XStack>
              {field.state.meta.errors.length > 0 && (
                <Paragraph color="$red10" fontSize="$2">
                  {field.state.meta.errors.join(', ')}
                </Paragraph>
              )}
            </YStack>
          )}
        </form.Field>

        {/* Type chips */}
        <form.Field name="type">
          {(field) => (
            <YStack gap="$2" mb="$5">
              <Text color="$color11" fontSize="$2" textTransform="uppercase" letterSpacing={0.6}>
                {t('debts.form.type')}
              </Text>
              <XStack flexWrap="wrap" gap="$2">
                {DEBT_TYPES.map((type) => {
                  const selected = field.state.value === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => field.handleChange(type)}
                    >
                      <YStack
                        borderWidth={1}
                        borderColor={selected ? '$accent9' : '$color5'}
                        bg={selected ? '$accent3' : 'transparent'}
                        rounded="$3"
                        px="$3"
                        py="$2"
                      >
                        <Text
                          color={selected ? '$accent11' : '$color11'}
                          fontSize="$3"
                        >
                          {t(`onboarding.debts.types.${type}`)}
                        </Text>
                      </YStack>
                    </Pressable>
                  );
                })}
              </XStack>
              <Paragraph color="$color9" fontSize="$2">
                {t(`onboarding.debts.typeHints.${field.state.value}`)}
              </Paragraph>
            </YStack>
          )}
        </form.Field>

        {/* Remaining amount */}
        <form.Field
          name="remainingAmount"
          validators={{
            onSubmit: ({ value }) =>
              parseAmount(value) <= 0
                ? t('debts.validationRemainingAmount')
                : undefined,
          }}
        >
          {(field) => (
            <YStack gap="$2" mb="$5">
              <Text color="$color11" fontSize="$2" textTransform="uppercase" letterSpacing={0.6}>
                {t('debts.form.remainingAmount')}
              </Text>
              <Paragraph color="$color9" fontSize="$2" mt={-4}>
                {t('debts.form.remainingAmountHint')}
              </Paragraph>
              <XStack borderWidth={1} borderColor="$color5" rounded="$4" items="center" px="$3" height={48}>
                <TextInput
                  style={inputStyle}
                  placeholder={t('onboarding.debts.remainingAmountPlaceholder')}
                  placeholderTextColor={theme.color8.val}
                  keyboardType="decimal-pad"
                  value={field.state.value}
                  onChangeText={(v) => field.handleChange(sanitiseDecimal(v))}
                />
                <Text color="$color9" fontSize="$3">{t('common.currency')}</Text>
              </XStack>
              {field.state.meta.errors.length > 0 && (
                <Paragraph color="$red10" fontSize="$2">
                  {field.state.meta.errors.join(', ')}
                </Paragraph>
              )}
            </YStack>
          )}
        </form.Field>

        {/* Minimum payment */}
        <form.Field name="minimumPayment">
          {(field) => (
            <YStack gap="$2" mb="$5">
              <Text color="$color11" fontSize="$2" textTransform="uppercase" letterSpacing={0.6}>
                {t('debts.form.minimumPayment')}
              </Text>
              <Paragraph color="$color9" fontSize="$2" mt={-4}>
                {t('debts.form.minimumPaymentHint')}
              </Paragraph>
              <XStack borderWidth={1} borderColor="$color5" rounded="$4" items="center" px="$3" height={48}>
                <TextInput
                  style={inputStyle}
                  placeholder={t('onboarding.debts.minimumPaymentPlaceholder')}
                  placeholderTextColor={theme.color8.val}
                  keyboardType="decimal-pad"
                  value={field.state.value}
                  onChangeText={(v) => field.handleChange(sanitiseDecimal(v))}
                />
                <Text color="$color9" fontSize="$3">{t('common.currency')}</Text>
              </XStack>
            </YStack>
          )}
        </form.Field>

        {/* Interest rate */}
        <form.Field name="interestRate">
          {(field) => (
            <YStack gap="$2" mb="$5">
              <Text color="$color11" fontSize="$2" textTransform="uppercase" letterSpacing={0.6}>
                {t('debts.form.interestRate')}
              </Text>
              <Paragraph color="$color9" fontSize="$2" mt={-4}>
                {t('debts.form.interestRateHint')}
              </Paragraph>
              <XStack borderWidth={1} borderColor="$color5" rounded="$4" items="center" px="$3" height={48}>
                <TextInput
                  style={inputStyle}
                  placeholder={t('onboarding.debts.interestRatePlaceholder')}
                  placeholderTextColor={theme.color8.val}
                  keyboardType="decimal-pad"
                  value={field.state.value}
                  onChangeText={(v) => field.handleChange(sanitiseDecimal(v))}
                />
                <Text color="$color9" fontSize="$3">%</Text>
              </XStack>
            </YStack>
          )}
        </form.Field>

        {/* Payment day */}
        <form.Field name="paymentDay">
          {(field) => (
            <YStack gap="$2" mb="$5">
              <Text color="$color11" fontSize="$2" textTransform="uppercase" letterSpacing={0.6}>
                {t('debts.form.paymentDay')}
              </Text>
              <Paragraph color="$color9" fontSize="$2" mt={-4}>
                {t('debts.form.paymentDayHint')}
              </Paragraph>
              <XStack borderWidth={1} borderColor="$color5" rounded="$4" items="center" px="$3" height={48}>
                <TextInput
                  style={inputStyle}
                  placeholder={t('debts.form.paymentDayPlaceholder')}
                  placeholderTextColor={theme.color8.val}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={field.state.value}
                  onChangeText={(v) => {
                    const digits = v.replace(/[^0-9]/g, '');
                    const num = parseInt(digits, 10);
                    if (digits === '' || (num >= 1 && num <= 31)) {
                      field.handleChange(digits);
                    }
                  }}
                />
                <Text color="$color9" fontSize="$3">{t('debts.form.paymentDaySuffix')}</Text>
              </XStack>
            </YStack>
          )}
        </form.Field>

        {/* Overdue amount */}
        <form.Field name="overdueAmount">
          {(field) => (
            <YStack gap="$2" mb="$6">
              <Text color="$color11" fontSize="$2" textTransform="uppercase" letterSpacing={0.6}>
                {t('debts.form.overdueAmount')}
              </Text>
              <Paragraph color="$color9" fontSize="$2" mt={-4}>
                {t('debts.form.overdueAmountHint')}
              </Paragraph>
              <XStack borderWidth={1} borderColor="$color5" rounded="$4" items="center" px="$3" height={48}>
                <TextInput
                  style={inputStyle}
                  placeholder={t('onboarding.debts.overdueAmountPlaceholder')}
                  placeholderTextColor={theme.color8.val}
                  keyboardType="decimal-pad"
                  value={field.state.value}
                  onChangeText={(v) => field.handleChange(sanitiseDecimal(v))}
                />
                <Text color="$color9" fontSize="$3">{t('common.currency')}</Text>
              </XStack>
            </YStack>
          )}
        </form.Field>

        {/* Save */}
        <Button theme="accent" size="$5" rounded="$4" onPress={() => form.handleSubmit()}>
          {t('common.save')}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
