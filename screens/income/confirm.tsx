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
import { Check } from '@tamagui/lucide-icons-2';

import { useAppStore } from '@/store';
import { formatAmount } from '@/lib/format';
import type { Allocation, Income } from '@/types/models';

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Summary row ───────────────────────────────────────────────────────────────

interface SummaryRowProps {
  label: string;
  amount: number;
  currency: string;
  accent?: boolean;
  warning?: boolean;
  muted?: boolean;
  bold?: boolean;
}

function SummaryRow({ label, amount, currency, accent, warning, muted, bold }: SummaryRowProps) {
  const textColor = accent ? '$accent9' : warning ? '$yellow9' : muted ? '$color8' : '$color11';
  return (
    <XStack py="$2.5" items="center" justify="space-between">
      <Text
        color={textColor}
        fontWeight={bold ? '600' : '400'}
        flex={1}
        pr="$3"
        fontSize="$3"
      >
        {label}
      </Text>
      <Text
        color={textColor}
        fontWeight={bold ? '600' : '400'}
        fontSize="$3"
      >
        {formatAmount(amount)} {currency}
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

  const processIncome = useAppStore((s) => s.processIncome);
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
    [debts]
  );

  const totalNeeds =
    allocation.needs.housing +
    allocation.needs.food +
    allocation.needs.transport +
    allocation.needs.other;
  const totalDebts = Object.values(allocation.minimumPayments).reduce(
    (s, v) => s + v,
    0
  );
  const extra = allocation.extraDebtPayment?.amount ?? 0;

  const segments = [
    { key: 'needs', label: t('home.lastDistribution.needs'), amount: totalNeeds, color: '$accent9' as const },
    { key: 'debts', label: t('home.lastDistribution.minimums'), amount: totalDebts, color: '$yellow9' as const },
    { key: 'extra', label: t('home.lastDistribution.extra'), amount: extra, color: '$green9' as const },
    { key: 'unalloc', label: t('income.confirm.rows.unallocated'), amount: allocation.unallocated, color: '$color6' as const },
  ].filter((s) => s.amount > 0);

  const handleSave = useCallback(() => {
    const income: Income = {
      id: generateId(),
      amount: incomeAmount,
      source: source.length > 0 ? source : undefined,
      date: new Date().toISOString(),
      allocation,
    };
    processIncome(income);
    router.dismissAll();
    router.replace('/(tabs)');
  }, [incomeAmount, source, allocation, processIncome, router]);

  const hasMinimums = Object.keys(allocation.minimumPayments).length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: t('income.confirm.title'),
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Text color="$color11">{t('common.back')}</Text>
            </Pressable>
          ),
        }}
      />

      <YStack flex={1}>
        <ScrollView>
          <YStack px="$4" pt="$4" pb="$6" gap="$4">
            <Paragraph color="$color9">
              {t('income.confirm.subtitle')}
            </Paragraph>

            {/* Income hero card */}
            <YStack
              bg="$color3"
              borderWidth={1}
              borderLeftWidth={3}
              borderColor="$color4"
              borderLeftColor="$accent9"
              rounded="$6"
              p="$4"
              gap="$2"
            >
              <Text
                color="$color9"
                fontSize="$1"
                letterSpacing={1}
              >
                {t('income.confirm.incomeSection').toUpperCase()}
              </Text>
              <Text fontSize="$7" fontWeight="700">
                {formatAmount(incomeAmount)} {currency}
              </Text>
              {source.length > 0 && (
                <Text color="$color9" fontSize="$3">
                  {source}
                </Text>
              )}

              {/* Stacked bar */}
              <XStack height={10} rounded="$10" overflow="hidden" mt="$1">
                {segments.map((seg) => (
                  <YStack
                    key={seg.key}
                    flex={seg.amount}
                    bg={seg.color}
                    height={10}
                  />
                ))}
              </XStack>

              {/* Legend */}
              <XStack flexWrap="wrap" gap="$2" mt="$1">
                {segments.map((seg) => (
                  <XStack key={seg.key} items="center" gap="$1.5">
                    <YStack
                      width={8}
                      height={8}
                      rounded="$10"
                      bg={seg.color}
                    />
                    <Text color="$color9" fontSize="$1">
                      {seg.label}
                    </Text>
                  </XStack>
                ))}
              </XStack>
            </YStack>

            {/* Allocation breakdown card */}
            <YStack
              bg="$color2"
              borderWidth={1}
              borderColor="$color4"
              rounded="$6"
              px="$4"
            >
              <YStack py="$2">
                <Text
                  color="$color9"
                  fontSize="$1"
                  letterSpacing={1}
                  py="$2"
                >
                  {t('income.confirm.allocationSection').toUpperCase()}
                </Text>

                {allocation.deferredPayments > 0 && (
                  <>
                    <SummaryRow
                      label={t('income.confirm.rows.deferred')}
                      amount={allocation.deferredPayments}
                      currency={currency}
                      accent
                      bold
                    />
                    <Separator borderColor="$color3" />
                  </>
                )}

                {allocation.needs.housing > 0 && (
                  <>
                    <SummaryRow
                      label={t('income.confirm.rows.housing')}
                      amount={allocation.needs.housing}
                      currency={currency}
                    />
                    <Separator borderColor="$color3" />
                  </>
                )}

                {allocation.needs.food > 0 && (
                  <>
                    <SummaryRow
                      label={t('income.confirm.rows.food')}
                      amount={allocation.needs.food}
                      currency={currency}
                    />
                    <Separator borderColor="$color3" />
                  </>
                )}

                {allocation.needs.transport > 0 && (
                  <>
                    <SummaryRow
                      label={t('income.confirm.rows.transport')}
                      amount={allocation.needs.transport}
                      currency={currency}
                    />
                    <Separator borderColor="$color3" />
                  </>
                )}

                {allocation.needs.other > 0 && (
                  <>
                    <SummaryRow
                      label={t('income.confirm.rows.other')}
                      amount={allocation.needs.other}
                      currency={currency}
                    />
                    <Separator borderColor="$color3" />
                  </>
                )}

                {hasMinimums &&
                  Object.entries(allocation.minimumPayments).map(
                    ([debtId, amt]) => {
                      const debt = debtById[debtId];
                      return (
                        <YStack key={debtId}>
                          <SummaryRow
                            label={t('income.confirm.rows.minimumPayment', {
                              label: debt?.label ?? debtId,
                            })}
                            amount={amt}
                            currency={currency}
                            warning
                          />
                          <Separator borderColor="$color3" />
                        </YStack>
                      );
                    }
                  )}

                {allocation.extraDebtPayment && (
                  <>
                    <SummaryRow
                      label={t('income.confirm.rows.extraPayment', {
                        label:
                          debtById[allocation.extraDebtPayment.debtId]
                            ?.label ??
                          t('income.confirm.rows.extraPaymentFallback'),
                      })}
                      amount={allocation.extraDebtPayment.amount}
                      currency={currency}
                      accent
                      bold
                    />
                    <Separator borderColor="$color3" />
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
                <Separator borderColor="$color5" />
                <XStack items="center" justify="space-between" py="$3">
                  <Text fontWeight="700" fontSize="$4">
                    {t('income.confirm.total')}
                  </Text>
                  <Text fontWeight="700" fontSize="$4">
                    {formatAmount(incomeAmount)} {currency}
                  </Text>
                </XStack>
              </YStack>
            </YStack>

            <Paragraph color="$color8" fontSize="$2" style={{ textAlign: 'center' }}>
              {t('income.confirm.saveNote')}
            </Paragraph>
          </YStack>
        </ScrollView>

        {/* Sticky save button */}
        <YStack px="$4" pt="$3" pb={insets.bottom + 12}>
          <Button
            size="$5"
            bg="$accent9"
            pressStyle={{ bg: '$accent10' }}
            onPress={handleSave}
            iconAfter={<Check size={18} color="$color12" />}
            accessibilityRole="button"
          >
            <Button.Text color="$color12">
              {t('income.confirm.save')}
            </Button.Text>
          </Button>
        </YStack>
      </YStack>
    </>
  );
}
