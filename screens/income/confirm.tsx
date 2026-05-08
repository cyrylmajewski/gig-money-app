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

import { AllocationStack } from '@/components/allocation-stack';
import type { AllocationStackSegment } from '@/components/allocation-stack';
import { AmountRow } from '@/components/amount-row';
import { summarizeAllocation } from '@/lib/allocation-summary';
import { useAppStore } from '@/store';
import { formatAmount } from '@/lib/format';
import { computeDeferredWithReasons } from '@/lib/distribution';
import { parseJsonParam } from '@/lib/route-params';
import type {
  Allocation,
  AppState,
  DeferredPaymentReasons,
  Income,
} from '@/types/models';

function generateId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ConfirmScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    amount: string;
    source?: string;
    allocation: string;
    wasAdjustedByUser?: string;
    reasons?: string;
    note?: string;
  }>();

  const processIncome = useAppStore((s) => s.processIncome);
  const debts = useAppStore((s) => s.debts);
  const monthlyNeeds = useAppStore((s) => s.monthlyNeeds);
  const deferredPayments = useAppStore((s) => s.deferredPayments);
  const monthlyCoverage = useAppStore((s) => s.monthlyCoverage);
  const settings = useAppStore((s) => s.settings);

  const incomeAmount = parseFloat(params.amount ?? '0');
  const source = params.source ?? '';
  const currency = t('common.currency');
  const wasAdjustedByUser = params.wasAdjustedByUser === 'true';
  const note = params.note ?? undefined;

  const reasons = useMemo(() => {
    return parseJsonParam<DeferredPaymentReasons>(params.reasons, {});
  }, [params.reasons]);

  const allocation: Allocation = useMemo(() => {
    const parsed = parseJsonParam<Allocation | null>(params.allocation, null);

    if (parsed) return { ...parsed, wasAdjustedByUser };

    return {
      deferredPayments: 0,
      needs: { housing: 0, food: 0, transport: 0, other: 0 },
      minimumPayments: {},
      extraDebtPayment: null,
      unallocated: 0,
      wasAdjustedByUser,
    };
  }, [params.allocation, wasAdjustedByUser]);

  const stateSnapshot: AppState = useMemo(
    () => ({
      schemaVersion: 1,
      installationDate: '',
      onboardingCompleted: true,
      monthlyNeeds,
      debts,
      incomes: [],
      deferredPayments,
      monthlyCoverage,
      realityChecks: [],
      shortfallContacts: [],
      settings,
    }),
    [monthlyNeeds, debts, deferredPayments, monthlyCoverage, settings]
  );

  const debtById = useMemo(
    () => Object.fromEntries(debts.map((d) => [d.id, d])),
    [debts]
  );

  const summary = summarizeAllocation(allocation);
  const segments: AllocationStackSegment[] = summary.segments.map((segment) => ({
    ...segment,
    label:
      segment.key === 'needs'
        ? t('home.lastDistribution.needs')
        : segment.key === 'minimums'
          ? t('home.lastDistribution.minimums')
          : segment.key === 'extra'
            ? t('home.lastDistribution.extra')
            : t('income.confirm.rows.unallocated'),
  }));

  const handleSave = useCallback(() => {
    const newDeferred = computeDeferredWithReasons(allocation, stateSnapshot, reasons, note);
    const income: Income = {
      id: generateId(),
      amount: incomeAmount,
      source: source.length > 0 ? source : undefined,
      date: new Date().toISOString(),
      allocation,
    };
    processIncome(income, newDeferred);
    router.dismissAll();
    router.replace('/(tabs)');
  }, [incomeAmount, source, allocation, stateSnapshot, reasons, note, processIncome, router]);

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

              <AllocationStack
                segments={segments}
                currency={currency}
                barHeight={10}
                legend="labels"
              />
            </YStack>

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
                    <AmountRow
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
                    <AmountRow
                      label={t('income.confirm.rows.housing')}
                      amount={allocation.needs.housing}
                      currency={currency}
                    />
                    <Separator borderColor="$color3" />
                  </>
                )}

                {allocation.needs.food > 0 && (
                  <>
                    <AmountRow
                      label={t('income.confirm.rows.food')}
                      amount={allocation.needs.food}
                      currency={currency}
                    />
                    <Separator borderColor="$color3" />
                  </>
                )}

                {allocation.needs.transport > 0 && (
                  <>
                    <AmountRow
                      label={t('income.confirm.rows.transport')}
                      amount={allocation.needs.transport}
                      currency={currency}
                    />
                    <Separator borderColor="$color3" />
                  </>
                )}

                {allocation.needs.other > 0 && (
                  <>
                    <AmountRow
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
                          <AmountRow
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
                    <AmountRow
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
                  <AmountRow
                    label={t('income.confirm.rows.unallocated')}
                    amount={allocation.unallocated}
                    currency={currency}
                    muted
                  />
                )}

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
