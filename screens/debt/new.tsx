import { DebtForm } from '@/components/debt-form';
import type { DebtFormValues } from '@/components/debt-form';
import { parseAmount } from '@/lib/format';
import { useAppStore } from '@/store';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'tamagui';

export default function NewDebtScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const addDebt = useAppStore((s) => s.addDebt);
  const addDeferredPayment = useAppStore((s) => s.addDeferredPayment);

  const handleSubmit = (value: DebtFormValues) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const remaining = parseAmount(value.remainingAmount);

    addDebt({
      id,
      label: value.label.trim(),
      type: value.type,
      creditorKind: value.creditorId ? 'bank' : value.creditorKind,
      creditorId: value.creditorId || null,
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
        <DebtForm onSubmit={handleSubmit} showOverdueField />
      </ScrollView>
    </SafeAreaView>
  );
}
