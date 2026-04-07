import { useMemo, useCallback } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Button,
  Paragraph,
  Separator,
  ScrollView,
} from 'tamagui';
import { useAppStore } from '@/store';
import type { Allocation, Income } from '@/types/models';

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatPLN(amount: number): string {
  return amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Summary row ───────────────────────────────────────────────────────────────

interface SummaryRowProps {
  label: string;
  amount: number;
  currency: string;
  muted?: boolean;
  bold?: boolean;
}

function SummaryRow({ label, amount, currency, muted, bold }: SummaryRowProps) {
  return (
    <XStack py="$3" items="center" justify="space-between">
      <Text
        fontFamily="$body"
        fontSize="$4"
        color={muted ? C.muted : C.textSec}
        fontWeight={bold ? '700' : '400'}
        flex={1}
        pr="$3"
      >
        {label}
      </Text>
      <Text
        fontFamily="$body"
        fontSize="$4"
        fontWeight={bold ? '700' : '500'}
        color={muted ? C.muted : C.text}
        style={{ textAlign: 'right' }}
        minW={80}
      >
        {formatPLN(amount)} {currency}
      </Text>
    </XStack>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ConfirmScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    amount: string;
    source?: string;
    allocation: string;
  }>();

  const addIncome = useAppStore((s) => s.addIncome);
  const debts = useAppStore((s) => s.debts);

  const incomeAmount = parseFloat(params.amount ?? '0');
  const source = params.source ?? '';
  const currency = t('common.currency');

  const allocation: Allocation = useMemo(() => {
    try {
      return JSON.parse(params.allocation ?? '{}') as Allocation;
    } catch {
      return {
        deferredPayments: 0,
        needs: { housing: 0, food: 0, transport: 0, other: 0 },
        minimumPayments: {},
        extraDebtPayment: null,
        unallocated: 0,
        wasAdjustedByUser: false,
      };
    }
  }, [params.allocation]);

  const debtById = useMemo(
    () => Object.fromEntries(debts.map((d) => [d.id, d])),
    [debts],
  );

  const totalAllocated = useMemo(() => {
    const needsSum =
      allocation.needs.housing +
      allocation.needs.food +
      allocation.needs.transport +
      allocation.needs.other;
    const minimumsSum = Object.values(allocation.minimumPayments).reduce(
      (s, v) => s + v,
      0,
    );
    const extra = allocation.extraDebtPayment?.amount ?? 0;
    return needsSum + minimumsSum + extra + allocation.deferredPayments + allocation.unallocated;
  }, [allocation]);

  const handleSave = useCallback(() => {
    const income: Income = {
      id: generateId(),
      amount: incomeAmount,
      source: source.length > 0 ? source : undefined,
      date: new Date().toISOString(),
      allocation,
    };
    addIncome(income);
    router.dismissAll();
    router.replace('/(tabs)');
  }, [incomeAmount, source, allocation, addIncome, router]);

  const hasMinimums = Object.keys(allocation.minimumPayments).length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: t('income.confirm.title'),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text fontFamily="$body" color={C.accent} fontSize="$4">
                {t('common.back')}
              </Text>
            </Pressable>
          ),
        }}
      />

      <YStack flex={1}>
        <ScrollView>
          <YStack px="$5" pt="$4" pb="$6" gap="$4">
            <Paragraph fontFamily="$body" color={C.muted} fontSize="$4">
              {t('income.confirm.subtitle')}
            </Paragraph>

            {/* Income summary card */}
            <YStack p="$4" rounded="$5" bg={C.card} borderWidth={1} borderColor={C.border}>
              <YStack gap="$2">
                <Text fontFamily="$body" fontSize="$3" fontWeight="700" color={C.muted}>
                  {t('income.confirm.incomeSection').toUpperCase()}
                </Text>
                <XStack items="center" justify="space-between">
                  <Text fontFamily="$body" fontSize="$4" color={C.textSec}>
                    {t('income.confirm.amountLabel')}
                  </Text>
                  <Text fontFamily="$body" fontSize="$6" fontWeight="700" color={C.text}>
                    {formatPLN(incomeAmount)} {currency}
                  </Text>
                </XStack>
                {source.length > 0 && (
                  <XStack items="center" justify="space-between">
                    <Text fontFamily="$body" fontSize="$4" color={C.textSec}>
                      {t('income.confirm.sourceLabel')}
                    </Text>
                    <Text fontFamily="$body" fontSize="$4" color={C.muted}>
                      {source}
                    </Text>
                  </XStack>
                )}
              </YStack>
            </YStack>

            {/* Allocation breakdown card */}
            <YStack p="$4" rounded="$5" bg={C.card} borderWidth={1} borderColor={C.border}>
              <YStack gap="$0">
                <Text fontFamily="$body" fontSize="$3" fontWeight="700" color={C.muted} mb="$2">
                  {t('income.confirm.allocationSection').toUpperCase()}
                </Text>

                {allocation.deferredPayments > 0 && (
                  <>
                    <SummaryRow
                      label={t('income.confirm.rows.deferred')}
                      amount={allocation.deferredPayments}
                      currency={currency}
                      bold
                    />
                    <Separator borderColor={C.border} />
                  </>
                )}

                {allocation.needs.housing > 0 && (
                  <>
                    <SummaryRow
                      label={t('income.confirm.rows.housing')}
                      amount={allocation.needs.housing}
                      currency={currency}
                    />
                    <Separator borderColor={C.border} />
                  </>
                )}

                {allocation.needs.food > 0 && (
                  <>
                    <SummaryRow
                      label={t('income.confirm.rows.food')}
                      amount={allocation.needs.food}
                      currency={currency}
                    />
                    <Separator borderColor={C.border} />
                  </>
                )}

                {allocation.needs.transport > 0 && (
                  <>
                    <SummaryRow
                      label={t('income.confirm.rows.transport')}
                      amount={allocation.needs.transport}
                      currency={currency}
                    />
                    <Separator borderColor={C.border} />
                  </>
                )}

                {allocation.needs.other > 0 && (
                  <>
                    <SummaryRow
                      label={t('income.confirm.rows.other')}
                      amount={allocation.needs.other}
                      currency={currency}
                    />
                    <Separator borderColor={C.border} />
                  </>
                )}

                {hasMinimums &&
                  Object.entries(allocation.minimumPayments).map(([debtId, amt]) => {
                    const debt = debtById[debtId];
                    return (
                      <YStack key={debtId}>
                        <SummaryRow
                          label={t('income.confirm.rows.minimumPayment', {
                            label: debt?.label ?? debtId,
                          })}
                          amount={amt}
                          currency={currency}
                        />
                        <Separator borderColor={C.border} />
                      </YStack>
                    );
                  })}

                {allocation.extraDebtPayment && (
                  <>
                    <SummaryRow
                      label={t('income.confirm.rows.extraPayment', {
                        label:
                          debtById[allocation.extraDebtPayment.debtId]?.label ??
                          t('income.confirm.rows.extraPaymentFallback'),
                      })}
                      amount={allocation.extraDebtPayment.amount}
                      currency={currency}
                      bold
                    />
                    <Separator borderColor={C.border} />
                  </>
                )}

                {allocation.unallocated > 0 && (
                  <SummaryRow
                    label={t('income.confirm.rows.unallocated')}
                    amount={allocation.unallocated}
                    currency={currency}
                    muted
                  />
                )}

                {/* Total row */}
                <Separator borderColor={C.border} mb="$2" />
                <XStack items="center" justify="space-between" pt="$1">
                  <Text fontFamily="$body" fontSize="$4" fontWeight="700" color={C.text}>
                    {t('income.confirm.total')}
                  </Text>
                  <Text fontFamily="$body" fontSize="$5" fontWeight="700" color={C.text}>
                    {formatPLN(totalAllocated)} {currency}
                  </Text>
                </XStack>
              </YStack>
            </YStack>

            <Paragraph fontFamily="$body" fontSize="$3" color={C.muted} style={{ textAlign: 'center' }}>
              {t('income.confirm.saveNote')}
            </Paragraph>
          </YStack>
        </ScrollView>

        {/* Sticky save button */}
        <YStack
          px="$5"
          pt="$3"
          pb={insets.bottom + 12}
          bg={C.bg}
          borderTopWidth={1}
          borderColor={C.border}
        >
          <Button
            size="$5"
            bg={C.accent}
            pressStyle={{ bg: C.accentPress }}
            onPress={handleSave}
            accessibilityRole="button"
          >
            <Text fontFamily="$body" color={C.bg} fontWeight="700">{t('income.confirm.save')}</Text>
          </Button>
        </YStack>
      </YStack>
    </>
  );
}
