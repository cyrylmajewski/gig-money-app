import {
  Pressable,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { YStack, XStack, Text, Button, Paragraph } from 'tamagui';

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

function sanitiseDecimal(raw: string): string {
  const cleaned = raw.replace(/[^0-9.,]/g, '');
  const normalised = cleaned.replace(',', '.');
  const parts = normalised.split('.');
  let final = (parts[0] ?? '').slice(0, 8);
  if (parts.length > 1) final += ',' + (parts[1] ?? '').slice(0, 2);
  return final;
}

function parseAmount(raw: string): number {
  const normalised = raw.replace(',', '.');
  const parsed = parseFloat(normalised);
  return isNaN(parsed) ? 0 : parsed;
}

interface FormState {
  label: string;
  type: DebtType;
  remainingAmount: string;
  minimumPayment: string;
  interestRate: string;
  overdueAmount: string;
}

export default function NewDebtScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const addDebt = useAppStore((s) => s.addDebt);
  const addDeferredPayment = useAppStore((s) => s.addDeferredPayment);

  const [form, setForm] = useState<FormState>({
    label: '',
    type: 'credit',
    remainingAmount: '',
    minimumPayment: '',
    interestRate: '',
    overdueAmount: '',
  });

  const [errors, setErrors] = useState<{ label?: string; remainingAmount?: string }>({});

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'label' || key === 'remainingAmount') {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function handleSave() {
    const newErrors: typeof errors = {};

    if (!form.label.trim()) {
      newErrors.label = t('debts.validationLabel');
    }
    if (parseAmount(form.remainingAmount) <= 0) {
      newErrors.remainingAmount = t('debts.validationRemainingAmount');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const remaining = parseAmount(form.remainingAmount);
    const minPayment = parseAmount(form.minimumPayment);

    addDebt({
      id,
      label: form.label.trim(),
      type: form.type,
      creditorKind: 'other',
      originalAmount: remaining,
      remainingAmount: remaining,
      minimumPayment: minPayment,
      interestRate: parseAmount(form.interestRate),
      createdAt: new Date().toISOString(),
      closedAt: null,
    });

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

    router.back();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: t('debts.new.title'),
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.accent,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Text fontFamily="$body" color={C.accent} fontSize="$4">
                {t('common.back')}
              </Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        {/* Label */}
        <YStack mb="$5">
          <Text
            fontFamily="$body"
            fontSize="$3"
            fontWeight="600"
            color={C.muted}
            mb="$2"
            textTransform="uppercase"
            letterSpacing={0.6}
          >
            {t('debts.form.label')}
          </Text>
          <XStack
            bg={C.card}
            borderWidth={1}
            borderColor={errors.label ? C.error : C.border}
            rounded="$4"
            items="center"
            px="$4"
            height={52}
          >
            <TextInput
              style={{
                flex: 1,
                fontSize: 18,
                color: C.text,
                fontFamily: 'Jersey25_400Regular',
                paddingVertical: 8,
              }}
              placeholderTextColor={C.muted}
              placeholder={t('onboarding.debts.labelPlaceholder')}
              value={form.label}
              onChangeText={(v) => updateField('label', v)}
              returnKeyType="next"
            />
          </XStack>
          {errors.label && (
            <Paragraph fontFamily="$body" fontSize="$2" color={C.error} mt="$1">
              {errors.label}
            </Paragraph>
          )}
        </YStack>

        {/* Type chips */}
        <YStack mb="$5">
          <Text
            fontFamily="$body"
            fontSize="$3"
            fontWeight="600"
            color={C.muted}
            mb="$2"
            textTransform="uppercase"
            letterSpacing={0.6}
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
          <Paragraph fontFamily="$body" fontSize="$2" color={C.muted} mt="$2">
            {t(`onboarding.debts.typeHints.${form.type}`)}
          </Paragraph>
        </YStack>

        {/* Remaining amount */}
        <YStack mb="$5">
          <Text
            fontFamily="$body"
            fontSize="$3"
            fontWeight="600"
            color={C.muted}
            mb="$2"
            textTransform="uppercase"
            letterSpacing={0.6}
          >
            {t('debts.form.remainingAmount')}
          </Text>
          <Paragraph fontFamily="$body" fontSize="$2" color={C.muted} mt={-4} mb="$2">
            {t('debts.form.remainingAmountHint')}
          </Paragraph>
          <XStack
            bg={C.card}
            borderWidth={1}
            borderColor={errors.remainingAmount ? C.error : C.border}
            rounded="$4"
            items="center"
            px="$4"
            height={52}
          >
            <TextInput
              style={{
                flex: 1,
                fontSize: 18,
                color: C.text,
                fontFamily: 'Jersey25_400Regular',
                paddingVertical: 8,
              }}
              placeholderTextColor={C.muted}
              placeholder={t('onboarding.debts.remainingAmountPlaceholder')}
              keyboardType="decimal-pad"
              value={form.remainingAmount}
              onChangeText={(v) => updateField('remainingAmount', sanitiseDecimal(v))}
            />
            <Text fontFamily="$body" fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
              {t('common.currency')}
            </Text>
          </XStack>
          {errors.remainingAmount && (
            <Paragraph fontFamily="$body" fontSize="$2" color={C.error} mt="$1">
              {errors.remainingAmount}
            </Paragraph>
          )}
        </YStack>

        {/* Minimum payment */}
        <YStack mb="$5">
          <Text
            fontFamily="$body"
            fontSize="$3"
            fontWeight="600"
            color={C.muted}
            mb="$2"
            textTransform="uppercase"
            letterSpacing={0.6}
          >
            {t('debts.form.minimumPayment')}
          </Text>
          <Paragraph fontFamily="$body" fontSize="$2" color={C.muted} mt={-4} mb="$2">
            {t('debts.form.minimumPaymentHint')}
          </Paragraph>
          <XStack
            bg={C.card}
            borderWidth={1}
            borderColor={C.border}
            rounded="$4"
            items="center"
            px="$4"
            height={52}
          >
            <TextInput
              style={{
                flex: 1,
                fontSize: 18,
                color: C.text,
                fontFamily: 'Jersey25_400Regular',
                paddingVertical: 8,
              }}
              placeholderTextColor={C.muted}
              placeholder={t('onboarding.debts.minimumPaymentPlaceholder')}
              keyboardType="decimal-pad"
              value={form.minimumPayment}
              onChangeText={(v) => updateField('minimumPayment', sanitiseDecimal(v))}
            />
            <Text fontFamily="$body" fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
              {t('common.currency')}
            </Text>
          </XStack>
        </YStack>

        {/* Interest rate */}
        <YStack mb="$5">
          <Text
            fontFamily="$body"
            fontSize="$3"
            fontWeight="600"
            color={C.muted}
            mb="$2"
            textTransform="uppercase"
            letterSpacing={0.6}
          >
            {t('debts.form.interestRate')}
          </Text>
          <Paragraph fontFamily="$body" fontSize="$2" color={C.muted} mt={-4}>
            {t('debts.form.interestRateHint')}
          </Paragraph>
          <XStack
            bg={C.card}
            borderWidth={1}
            borderColor={C.border}
            rounded="$4"
            items="center"
            px="$4"
            height={52}
          >
            <TextInput
              style={{
                flex: 1,
                fontSize: 18,
                color: C.text,
                fontFamily: 'Jersey25_400Regular',
                paddingVertical: 8,
              }}
              placeholderTextColor={C.muted}
              placeholder={t('onboarding.debts.interestRatePlaceholder')}
              keyboardType="decimal-pad"
              value={form.interestRate}
              onChangeText={(v) => updateField('interestRate', sanitiseDecimal(v))}
            />
            <Text fontFamily="$body" fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
              %
            </Text>
          </XStack>
        </YStack>

        {/* Overdue amount */}
        <YStack mb="$6">
          <Text
            fontFamily="$body"
            fontSize="$3"
            fontWeight="600"
            color={C.muted}
            mb="$1"
            textTransform="uppercase"
            letterSpacing={0.6}
          >
            {t('debts.form.overdueAmount')}
          </Text>
          <Paragraph fontFamily="$body" fontSize="$2" color={C.muted} mb="$2">
            {t('debts.form.overdueAmountHint')}
          </Paragraph>
          <XStack
            bg={C.card}
            borderWidth={1}
            borderColor={C.border}
            rounded="$4"
            items="center"
            px="$4"
            height={52}
          >
            <TextInput
              style={{
                flex: 1,
                fontSize: 18,
                color: C.text,
                fontFamily: 'Jersey25_400Regular',
                paddingVertical: 8,
              }}
              placeholderTextColor={C.muted}
              placeholder={t('onboarding.debts.overdueAmountPlaceholder')}
              keyboardType="decimal-pad"
              value={form.overdueAmount}
              onChangeText={(v) => updateField('overdueAmount', sanitiseDecimal(v))}
            />
            <Text fontFamily="$body" fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
              {t('common.currency')}
            </Text>
          </XStack>
        </YStack>

        {/* Save button — inside scroll so it's never cut off */}
        <Button
          size="$5"
          rounded="$4"
          bg={C.accent}
          pressStyle={{ bg: C.accentPress }}
          onPress={handleSave}
        >
          <Text fontFamily="$body" fontSize="$4" fontWeight="700" color={C.bg}>
            {t('common.save')}
          </Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
