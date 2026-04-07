import { useState } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { YStack, XStack, Text, H2, Button, Paragraph } from 'tamagui';
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
  if (parts.length > 1) {
    final += ',' + (parts[1] ?? '').slice(0, 2);
  }
  return final;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const value = parseFloat(cleaned);
  return isNaN(value) || value < 0 ? 0 : value;
}

function formatAmountForInput(amount: number): string {
  if (amount === 0) return '';
  return amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

interface FormState {
  label: string;
  type: DebtType;
  remainingAmount: string;
  minimumPayment: string;
  interestRate: string;
}

export default function EditDebtScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const debts = useAppStore((s) => s.debts);
  const updateDebt = useAppStore((s) => s.updateDebt);

  const debt = debts.find((d) => d.id === id);

  const [form, setForm] = useState<FormState>(() => {
    if (!debt) {
      return {
        label: '',
        type: 'credit',
        remainingAmount: '',
        minimumPayment: '',
        interestRate: '',
      };
    }
    return {
      label: debt.label,
      type: debt.type,
      remainingAmount: formatAmountForInput(debt.remainingAmount),
      minimumPayment: formatAmountForInput(debt.minimumPayment),
      interestRate: debt.interestRate > 0 ? formatAmountForInput(debt.interestRate) : '',
    };
  });

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
    });

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
          style: 'cancel',
        },
        {
          text: t('debts.form.markClosed'),
          style: 'destructive',
          onPress: () => {
            updateDebt(debt.id, { closedAt: new Date().toISOString() });
            router.back();
          },
        },
      ]
    );
  }

  // Debt not found state
  if (!debt) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: t('debts.edit.title'),
            headerStyle: { backgroundColor: C.bg },
            headerTintColor: C.accent,
            headerShadowVisible: false,
          }}
        />
        <YStack flex={1} justify="center" items="center" px="$6" gap="$4">
          <Paragraph fontFamily="$body" fontSize="$4" color={C.muted} style={{ textAlign: 'center' }}>
            {t('debts.edit.notFound')}
          </Paragraph>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text fontFamily="$body" fontSize="$4" color={C.accent} fontWeight="600">
              {t('common.back')}
            </Text>
          </Pressable>
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: t('debts.edit.title'),
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.accent,
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              hitSlop={8}
              style={{ paddingRight: 16 }}
            >
              <Text fontFamily="$body" fontSize="$4" color={C.accent} fontWeight="600">
                {t('common.back')}
              </Text>
            </Pressable>
          ),
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
        <YStack bg={C.bg} px="$5" pt="$4" gap="$5">

          {/* Title row with optional closed badge */}
          <XStack items="center" gap="$3">
            <H2 fontFamily="$body" color={C.text} fontWeight="700" flex={1} numberOfLines={2}>
              {debt.label}
            </H2>
            {isClosed && (
              <YStack
                bg={C.border}
                rounded="$3"
                px="$3"
                py="$1"
                accessibilityLabel={t('debts.edit.closedBadgeLabel')}
              >
                <Text fontFamily="$body" fontSize="$2" color={C.muted} fontWeight="700" textTransform="uppercase" letterSpacing={0.5}>
                  {t('debts.edit.closed')}
                </Text>
              </YStack>
            )}
          </XStack>

          {/* Closed notice */}
          {isClosed && (
            <YStack
              bg={C.card}
              borderWidth={1}
              borderColor={C.border}
              rounded="$4"
              p="$4"
            >
              <Paragraph fontFamily="$body" fontSize="$3" color={C.muted}>
                {t('debts.edit.closedBadgeLabel')}
              </Paragraph>
            </YStack>
          )}

          {/* Label field */}
          <YStack gap="$2">
            <Text
              fontFamily="$body"
              fontSize="$3"
              fontWeight="600"
              color={C.muted}
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {t('debts.form.label')}
            </Text>
            <YStack
              bg={C.card}
              borderWidth={1}
              borderColor={C.border}
              rounded="$4"
              height={52}
              px="$4"
              justify="center"
              opacity={isClosed ? 0.5 : 1}
            >
              <TextInput
                style={{ fontSize: 18, color: C.text, fontFamily: 'Jersey25_400Regular', paddingVertical: 8 }}
                placeholderTextColor={C.muted}
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
              fontFamily="$body"
              fontSize="$3"
              fontWeight="600"
              color={C.muted}
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
              color={C.muted}
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {t('debts.form.remainingAmount')}
            </Text>
            <Paragraph fontFamily="$body" fontSize="$2" color={C.muted} mt={-4} mb="$1">
              {t('debts.form.remainingAmountHint')}
            </Paragraph>
            <XStack
              bg={C.card}
              borderWidth={1}
              borderColor={C.border}
              rounded="$4"
              items="center"
              px="$4"
              height={52}
              opacity={isClosed ? 0.5 : 1}
            >
              <TextInput
                style={{ flex: 1, fontSize: 18, color: C.text, fontFamily: 'Jersey25_400Regular', paddingVertical: 8 }}
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
                value={form.remainingAmount}
                onChangeText={(v) => updateField('remainingAmount', sanitiseDecimal(v))}
                editable={!isClosed}
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
              color={C.muted}
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {t('debts.form.minimumPayment')}
            </Text>
            <Paragraph fontFamily="$body" fontSize="$2" color={C.muted} mt={-4} mb="$1">
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
              opacity={isClosed ? 0.5 : 1}
            >
              <TextInput
                style={{ flex: 1, fontSize: 18, color: C.text, fontFamily: 'Jersey25_400Regular', paddingVertical: 8 }}
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
                value={form.minimumPayment}
                onChangeText={(v) => updateField('minimumPayment', sanitiseDecimal(v))}
                editable={!isClosed}
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
              color={C.muted}
              textTransform="uppercase"
              letterSpacing={0.5}
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
              opacity={isClosed ? 0.5 : 1}
            >
              <TextInput
                style={{ flex: 1, fontSize: 18, color: C.text, fontFamily: 'Jersey25_400Regular', paddingVertical: 8 }}
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
                value={form.interestRate}
                onChangeText={(v) => updateField('interestRate', sanitiseDecimal(v))}
                editable={!isClosed}
                accessibilityLabel={t('debts.form.interestRate')}
              />
              <Text fontFamily="$body" fontSize="$4" color={C.textSec} fontWeight="600" ml="$2">
                %
              </Text>
            </XStack>
          </YStack>

          {/* Form validation error */}
          {formError && (
            <Paragraph fontFamily="$body" fontSize="$3" color={C.error}>
              {formError}
            </Paragraph>
          )}

          {/* Action buttons — inside scroll so content is never cut */}
          {!isClosed && (
            <YStack gap="$3" pt="$2">
              <Button
                size="$5"
                bg={C.accent}
                pressStyle={{ bg: C.accentPress }}
                onPress={handleSave}
                accessibilityRole="button"
              >
                <Text fontFamily="$body" color={C.bg} fontWeight="700">{t('common.save')}</Text>
              </Button>

              <Button
                size="$4"
                bg="transparent"
                borderWidth={1}
                borderColor={C.error}
                pressStyle={{ opacity: 0.7 }}
                onPress={handleMarkClosed}
                accessibilityRole="button"
              >
                <Text fontFamily="$body" color={C.error} fontWeight="600">{t('debts.form.markClosed')}</Text>
              </Button>
            </YStack>
          )}

        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
