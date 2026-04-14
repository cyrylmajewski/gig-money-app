import { parseAmount, sanitiseDecimal } from '@/lib/format';
import { getCreditorsByDebtType, getCreditorLabelKey, type Creditor } from '@/lib/creditors';
import type { CreditorKind, DebtType } from '@/types/models';
import { useForm } from '@tanstack/react-form';
import { type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput } from 'react-native';
import { Button, Paragraph, ScrollView, Text, XStack, YStack, useTheme } from 'tamagui';

const DEBT_TYPES: DebtType[] = [
  'payday_loan',
  'credit',
  'credit_card',
  'installment',
  'other',
];

interface DebtFormValues {
  label: string;
  type: DebtType;
  creditorKind: CreditorKind;
  creditorId: string;
  remainingAmount: string;
  minimumPayment: string;
  interestRate: string;
  paymentDay: string;
  overdueAmount: string;
}

interface DebtFormProps {
  defaultValues?: Partial<DebtFormValues>;
  onSubmit: (values: DebtFormValues) => void;
  disabled?: boolean;
  submitLabel?: string;
  showOverdueField?: boolean;
  children?: ReactNode;
}

function CreditorPicker({
  field,
  creditors,
  labelKey,
  disabled,
}: {
  field: { state: { value: string }; handleChange: (v: string) => void };
  creditors: Creditor[];
  labelKey: string;
  disabled: boolean;
}) {
  const { t } = useTranslation();

  // Reset selection when the creditor list changes and current value is invalid
  useEffect(() => {
    if (field.state.value && !creditors.some((c) => c.id === field.state.value)) {
      field.handleChange('');
    }
  }, [creditors]);

  return (
    <YStack gap="$2" mb="$5">
      <Text color="$color11" fontSize="$2" textTransform="uppercase" letterSpacing={0.6}>
        {t(labelKey)}
      </Text>
      <Paragraph color="$color9" fontSize="$2" mt={-4}>
        {t('debts.form.creditorHint')}
      </Paragraph>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap="$2" opacity={disabled ? 0.5 : 1}>
          {creditors.map((creditor) => {
            const selected = field.state.value === creditor.id;
            return (
              <Pressable
                key={creditor.id}
                onPress={() => {
                  if (!disabled) {
                    field.handleChange(selected ? '' : creditor.id);
                  }
                }}
                disabled={disabled}
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
                    fontSize="$2"
                    numberOfLines={1}
                  >
                    {creditor.name}
                  </Text>
                </YStack>
              </Pressable>
            );
          })}
        </XStack>
      </ScrollView>
    </YStack>
  );
}

const DebtForm = ({
  defaultValues,
  onSubmit,
  disabled = false,
  submitLabel,
  showOverdueField = false,
  children,
}: DebtFormProps) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const inputStyle = {
    flex: 1 as const,
    color: theme.color12.val,
    fontSize: 16,
    paddingVertical: 8,
  };

  const form = useForm({
    defaultValues: {
      label: defaultValues?.label ?? '',
      type: (defaultValues?.type ?? 'credit') as DebtType,
      creditorKind: (defaultValues?.creditorKind ?? 'bank') as CreditorKind,
      creditorId: defaultValues?.creditorId ?? '',
      remainingAmount: defaultValues?.remainingAmount ?? '',
      minimumPayment: defaultValues?.minimumPayment ?? '',
      interestRate: defaultValues?.interestRate ?? '',
      paymentDay: defaultValues?.paymentDay ?? '',
      overdueAmount: defaultValues?.overdueAmount ?? '',
    },
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <YStack>
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
            <XStack
              borderWidth={1}
              borderColor="$color5"
              rounded="$4"
              items="center"
              px="$3"
              height={48}
              opacity={disabled ? 0.5 : 1}
            >
              <TextInput
                style={inputStyle}
                placeholder={t('onboarding.debts.labelPlaceholder')}
                placeholderTextColor={theme.color8.val}
                value={field.state.value}
                onChangeText={field.handleChange}
                editable={!disabled}
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
            <XStack flexWrap="wrap" gap="$2" opacity={disabled ? 0.5 : 1}>
              {DEBT_TYPES.map((type) => {
                const selected = field.state.value === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => {
                      if (!disabled) field.handleChange(type);
                    }}
                    disabled={disabled}
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

      {/* Creditor picker — filtered by debt type */}
      <form.Subscribe selector={(s) => s.values.type}>
        {(currentType) => {
          const creditors = getCreditorsByDebtType(currentType);
          const labelKey = getCreditorLabelKey(currentType);
          if (creditors.length === 0 || !labelKey) return null;

          return (
            <form.Field name="creditorId">
              {(field) => (
                  <CreditorPicker
                    field={field}
                    creditors={creditors}
                    labelKey={labelKey}
                    disabled={disabled}
                  />
              )}
            </form.Field>
          );
        }}
      </form.Subscribe>

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
            <XStack
              borderWidth={1}
              borderColor="$color5"
              rounded="$4"
              items="center"
              px="$3"
              height={48}
              opacity={disabled ? 0.5 : 1}
            >
              <TextInput
                style={inputStyle}
                placeholder={t('onboarding.debts.remainingAmountPlaceholder')}
                placeholderTextColor={theme.color8.val}
                keyboardType="decimal-pad"
                value={field.state.value}
                onChangeText={(v) => field.handleChange(sanitiseDecimal(v))}
                editable={!disabled}
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
            <XStack
              borderWidth={1}
              borderColor="$color5"
              rounded="$4"
              items="center"
              px="$3"
              height={48}
              opacity={disabled ? 0.5 : 1}
            >
              <TextInput
                style={inputStyle}
                placeholder={t('onboarding.debts.minimumPaymentPlaceholder')}
                placeholderTextColor={theme.color8.val}
                keyboardType="decimal-pad"
                value={field.state.value}
                onChangeText={(v) => field.handleChange(sanitiseDecimal(v))}
                editable={!disabled}
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
            <XStack
              borderWidth={1}
              borderColor="$color5"
              rounded="$4"
              items="center"
              px="$3"
              height={48}
              opacity={disabled ? 0.5 : 1}
            >
              <TextInput
                style={inputStyle}
                placeholder={t('onboarding.debts.interestRatePlaceholder')}
                placeholderTextColor={theme.color8.val}
                keyboardType="decimal-pad"
                value={field.state.value}
                onChangeText={(v) => field.handleChange(sanitiseDecimal(v))}
                editable={!disabled}
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
            <XStack
              borderWidth={1}
              borderColor="$color5"
              rounded="$4"
              items="center"
              px="$3"
              height={48}
              opacity={disabled ? 0.5 : 1}
            >
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
                editable={!disabled}
              />
              <Text color="$color9" fontSize="$3">{t('debts.form.paymentDaySuffix')}</Text>
            </XStack>
          </YStack>
        )}
      </form.Field>

      {/* Overdue amount (optional, only for new debt) */}
      {showOverdueField && (
        <form.Field name="overdueAmount">
          {(field) => (
            <YStack gap="$2" mb="$6">
              <Text color="$color11" fontSize="$2" textTransform="uppercase" letterSpacing={0.6}>
                {t('debts.form.overdueAmount')}
              </Text>
              <Paragraph color="$color9" fontSize="$2" mt={-4}>
                {t('debts.form.overdueAmountHint')}
              </Paragraph>
              <XStack
                borderWidth={1}
                borderColor="$color5"
                rounded="$4"
                items="center"
                px="$3"
                height={48}
              >
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
      )}

      {/* Extra content slot (missed payment, mark closed, etc.) */}
      {children}

      {/* Submit */}
      {!disabled && (
        <Button theme="accent" size="$5" rounded="$4" onPress={() => form.handleSubmit()}>
          {submitLabel ?? t('common.save')}
        </Button>
      )}
    </YStack>
  );
};

export { DebtForm };
export type { DebtFormProps, DebtFormValues };
