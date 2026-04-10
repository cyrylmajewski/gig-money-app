import { Badge } from '@/components/badge';
import { DebtForm } from '@/components/debt-form';
import type { DebtFormValues } from '@/components/debt-form';
import {
  formatAmountForInput,
  parseAmount,
  sanitiseDecimal,
} from '@/lib/format';
import { useAppStore } from '@/store';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Paragraph,
  Text,
  Theme,
  XStack,
  YStack,
  useTheme,
} from 'tamagui';

export default function DebtDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const debts = useAppStore((s) => s.debts);
  const updateDebt = useAppStore((s) => s.updateDebt);
  const addDeferredPayment = useAppStore((s) => s.addDeferredPayment);

  const debt = debts.find((d) => d.id === id);
  const isClosed = debt?.closedAt != null;

  const [showOverdue, setShowOverdue] = useState(false);
  const [overdueAmount, setOverdueAmount] = useState('');

  // Debt not found state
  if (!debt) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: t('debts.edit.title'),
            headerShadowVisible: false,
          }}
        />
        <YStack flex={1} justify="center" items="center" px="$6" gap="$4">
          <Paragraph color="$color9" style={{ textAlign: 'center' }}>
            {t('debts.edit.notFound')}
          </Paragraph>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text color="$color11">{t('common.back')}</Text>
          </Pressable>
        </YStack>
      </SafeAreaView>
    );
  }

  const handleSubmit = (value: DebtFormValues) => {
    updateDebt(debt.id, {
      label: value.label.trim(),
      type: value.type,
      remainingAmount: parseAmount(value.remainingAmount),
      minimumPayment: parseAmount(value.minimumPayment),
      interestRate: parseAmount(value.interestRate),
      paymentDay: value.paymentDay ? parseInt(value.paymentDay, 10) : null,
    });
    router.back();
  };

  const handleMarkClosed = () => {
    Alert.alert(t('debts.form.markClosed'), t('debts.edit.closeConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('debts.form.markClosed'),
        style: 'destructive',
        onPress: () => {
          updateDebt(debt.id, { closedAt: new Date().toISOString() });
          router.back();
        },
      },
    ]);
  };

  const handleRecordMissedPayment = () => {
    const amount = parseAmount(overdueAmount);
    if (amount <= 0) return;
    addDeferredPayment({
      id: `${debt.id}-overdue-${Date.now()}`,
      kind: 'minimum_payment',
      debtId: debt.id,
      amount,
      deferredAt: new Date().toISOString(),
      reason: 'postponing',
      resolved: false,
    });
    setShowOverdue(false);
    setOverdueAmount('');
    Alert.alert(
      t('debts.form.missedPaymentSavedTitle'),
      t('debts.form.missedPaymentSavedMessage'),
    );
  };

  const inputStyle = {
    flex: 1 as const,
    color: theme.color12.val,
    fontSize: 16,
    paddingVertical: 8,
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: t('debts.edit.title'),
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              hitSlop={8}
            >
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
        {/* Closed notice */}
        {isClosed && (
          <XStack items="center" gap="$2" mb="$5">
            <Badge label={t('debts.edit.closed')} variant="muted" />
            <Paragraph color="$color9" fontSize="$2" flex={1}>
              {t('debts.edit.closedBadgeLabel')}
            </Paragraph>
          </XStack>
        )}

        <DebtForm
          defaultValues={{
            label: debt.label,
            type: debt.type,
            remainingAmount: formatAmountForInput(debt.remainingAmount),
            minimumPayment: formatAmountForInput(debt.minimumPayment),
            interestRate: debt.interestRate > 0 ? formatAmountForInput(debt.interestRate) : '',
            paymentDay: debt.paymentDay ? debt.paymentDay.toString() : '',
          }}
          onSubmit={handleSubmit}
          disabled={isClosed}
        >
          {/* Record missed payment — detail only */}
          {!isClosed && debt.minimumPayment > 0 && (
            <Theme name="warning">
              <YStack gap="$3" mb="$5">
                {!showOverdue ? (
                  <Button
                    size="$4"
                    bg="transparent"
                    borderWidth={1}
                    borderColor="$color9"
                    pressStyle={{ opacity: 0.7 }}
                    onPress={() => {
                      setOverdueAmount(formatAmountForInput(debt.minimumPayment));
                      setShowOverdue(true);
                    }}
                  >
                    <Text color="$color9">
                      {t('debts.form.recordMissedPayment')}
                    </Text>
                  </Button>
                ) : (
                  <YStack
                    borderWidth={1}
                    borderColor="$color9"
                    rounded="$4"
                    p="$4"
                    gap="$3"
                  >
                    <Text color="$color9" fontWeight="600">
                      {t('debts.form.missedPaymentTitle')}
                    </Text>
                    <Paragraph color="$color11" fontSize="$2">
                      {t('debts.form.missedPaymentHint')}
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
                        keyboardType="decimal-pad"
                        value={overdueAmount}
                        onChangeText={(v) => setOverdueAmount(sanitiseDecimal(v))}
                        accessibilityLabel={t('debts.form.missedPaymentTitle')}
                      />
                      <Text color="$color9" fontSize="$3">
                        {t('common.currency')}
                      </Text>
                    </XStack>
                    <XStack gap="$3">
                      <Button
                        flex={1}
                        size="$4"
                        bg="transparent"
                        borderWidth={1}
                        borderColor="$color5"
                        onPress={() => {
                          setShowOverdue(false);
                          setOverdueAmount('');
                        }}
                      >
                        <Text color="$color11">{t('common.cancel')}</Text>
                      </Button>
                      <Button
                        flex={1}
                        size="$4"
                        bg="$color9"
                        pressStyle={{ opacity: 0.8 }}
                        onPress={handleRecordMissedPayment}
                      >
                        <Text color="$color1">
                          {t('debts.form.recordMissedPaymentConfirm')}
                        </Text>
                      </Button>
                    </XStack>
                  </YStack>
                )}
              </YStack>
            </Theme>
          )}

          {/* Mark closed button — detail only */}
          {!isClosed && (
            <Button
              size="$4"
              bg="transparent"
              borderWidth={1}
              borderColor="$color5"
              rounded="$4"
              pressStyle={{ opacity: 0.7 }}
              onPress={handleMarkClosed}
              mt="$3"
            >
              <Text color="$color11">{t('debts.form.markClosed')}</Text>
            </Button>
          )}
        </DebtForm>
      </ScrollView>
    </SafeAreaView>
  );
}
