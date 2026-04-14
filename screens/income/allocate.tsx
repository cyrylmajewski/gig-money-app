import { useMemo } from 'react';
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
  Progress,
  Separator,
  ScrollView,
} from 'tamagui';

import { useAppStore } from '@/store';
import { formatAmount } from '@/lib/format';
import { distributeIncome } from '@/lib/distribution';
import {
  getCurrentMonthlyCoverage,
  getOutstandingNeeds,
  getOutstandingMinimums,
  getActiveDebts,
} from '@/lib/distribution/helpers';
import type { Allocation, AppState } from '@/types/models';

// ── Row component ─────────────────────────────────────────────────────────────

interface AllocationRowProps {
  label: string;
  amount: number;
  needed?: number;
  sublabel?: string;
  highlight?: boolean;
  currency: string;
}

function AllocationRow({
  label,
  amount,
  needed,
  sublabel,
  highlight,
  currency,
}: AllocationRowProps) {
  const { t } = useTranslation();
  const hasNeeded = needed !== undefined && needed > 0;
  const pct = hasNeeded
    ? Math.min(100, Math.round((amount / needed) * 100))
    : 100;

  return (
    <YStack py="$3" gap="$2">
      {/* Header: label + percentage */}
      <XStack items="center" justify="space-between">
        <YStack flex={1} gap="$0.5" pr="$3">
          <Text color="$color11" fontWeight={highlight ? '600' : '400'}>
            {label}
          </Text>
          {sublabel ? (
            <Text color="$color8" fontSize="$2">
              {sublabel}
            </Text>
          ) : null}
        </YStack>
        {hasNeeded && (
          <Text
            color={pct >= 100 ? '$color11' : '$color9'}
            fontWeight="600"
          >
            {pct}%
          </Text>
        )}
      </XStack>

      {/* Progress bar */}
      {hasNeeded && (
        <Progress value={pct} size="$1">
          <Progress.Indicator
            bg={highlight ? '$accent9' : pct >= 100 ? '$accent9' : '$color8'}
          />
        </Progress>
      )}

      {/* Amounts: allocated / needed */}
      <XStack justify="space-between" items="center">
        <XStack gap="$1" items="baseline">
          <Text color="$color9" fontSize="$2">
            {t('income.allocate.allocated')}
          </Text>
          <Text color="$color11" fontSize="$3">
            {formatAmount(amount)} {currency}
          </Text>
        </XStack>
        {hasNeeded && (
          <XStack gap="$1" items="baseline">
            <Text color="$color9" fontSize="$2">
              {t('income.allocate.needed')}
            </Text>
            <Text color="$color11" fontSize="$3">
              {formatAmount(needed)} {currency}
            </Text>
          </XStack>
        )}
      </XStack>
    </YStack>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AllocateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ amount: string; source?: string }>();

  const monthlyNeeds = useAppStore((s) => s.monthlyNeeds);
  const debts = useAppStore((s) => s.debts);
  const deferredPayments = useAppStore((s) => s.deferredPayments);
  const monthlyCoverage = useAppStore((s) => s.monthlyCoverage);
  const settings = useAppStore((s) => s.settings);

  const incomeAmount = parseFloat(params.amount ?? '0');
  const currency = t('common.currency');

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
      settings,
    }),
    [monthlyNeeds, debts, deferredPayments, monthlyCoverage, settings]
  );

  const allocation: Allocation = useMemo(
    () => distributeIncome(incomeAmount, stateSnapshot),
    [incomeAmount, stateSnapshot]
  );

  const outstanding = useMemo(() => {
    const coverage = getCurrentMonthlyCoverage(monthlyCoverage);
    const needs = getOutstandingNeeds(monthlyNeeds, coverage);
    const activeD = getActiveDebts(debts);
    const mins = getOutstandingMinimums(activeD, coverage);
    return { needs, mins };
  }, [monthlyNeeds, monthlyCoverage, debts]);

  const coverageStats = useMemo(() => {
    const covered =
      allocation.needs.housing +
      allocation.needs.food +
      allocation.needs.transport +
      allocation.needs.other;
    const totalNeeds =
      monthlyNeeds.housing +
      monthlyNeeds.food +
      monthlyNeeds.transport +
      monthlyNeeds.other;
    const pct =
      totalNeeds > 0 ? Math.round((covered / totalNeeds) * 100) : 100;
    const hasShortfall = covered < totalNeeds;

    const tips: string[] = [];
    if (allocation.needs.food < monthlyNeeds.food && monthlyNeeds.food > 0) {
      tips.push('income.allocate.tips.food');
    }
    if (allocation.needs.transport === 0 && monthlyNeeds.transport > 0) {
      tips.push('income.allocate.tips.transport');
    }
    const unpaidDebts = Object.entries(outstanding.mins).filter(
      ([id]) => (allocation.minimumPayments[id] ?? 0) === 0
    );
    if (unpaidDebts.length > 0) {
      tips.push('income.allocate.tips.contactCreditor');
    }
    if (tips.length === 0 && hasShortfall) {
      tips.push('income.allocate.tips.nextIncome');
    }

    return { pct, hasShortfall, tips };
  }, [allocation, monthlyNeeds, outstanding]);

  const debtById = useMemo(() => {
    return Object.fromEntries(debts.map((d) => [d.id, d]));
  }, [debts]);

  function handleConfirm() {
    router.push({
      pathname: '/income/confirm',
      params: {
        amount: params.amount,
        source: params.source ?? '',
        allocation: JSON.stringify(allocation),
      },
    });
  }

  const hasDeferred = allocation.deferredPayments > 0;
  const hasExtra = allocation.extraDebtPayment !== null;
  const activeDebtsList = useMemo(() => getActiveDebts(debts), [debts]);

  return (
    <>
      <Stack.Screen
        options={{
          title: t('income.allocate.title'),
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
            {/* Received amount header */}
            <YStack
              bg="$color3"
              borderWidth={1}
              borderLeftWidth={3}
              borderColor="$color4"
              borderLeftColor="$accent9"
              rounded="$6"
              p="$4"
            >
              <Text color="$color9" fontSize="$2">
                {t('income.allocate.receivedLabel')}
              </Text>
              <Text fontSize="$7" fontWeight="700" mt="$1">
                {formatAmount(incomeAmount)} {currency}
              </Text>
            </YStack>

            {/* Coverage summary card */}
            <YStack
              bg="$color2"
              borderWidth={1}
              borderColor="$color4"
              rounded="$6"
              p="$4"
              gap="$3"
            >
              <XStack items="center" justify="space-between">
                <Text color="$color9" fontSize="$2" letterSpacing={0.5}>
                  {t('income.allocate.summary.coverageLabel').toUpperCase()}
                </Text>
                <Text
                  color={coverageStats.pct >= 100 ? '$color11' : '$color9'}
                  fontWeight="600"
                >
                  {coverageStats.pct}%
                </Text>
              </XStack>

              <Progress
                value={Math.min(100, coverageStats.pct)}
                size="$2"
              >
                <Progress.Indicator
                  bg={coverageStats.pct >= 100 ? '$accent9' : '$color8'}
                />
              </Progress>

              {/* Tips */}
              {coverageStats.tips.length > 0 && (
                <YStack gap="$2" pt="$1">
                  <Text color="$color9" fontSize="$2">
                    {t('income.allocate.summary.tipsLabel')}
                  </Text>
                  {coverageStats.tips.map((tipKey) => (
                    <XStack key={tipKey} gap="$2" items="flex-start">
                      <Text color="$accent9">→</Text>
                      <Text color="$color11" flex={1} fontSize="$3">
                        {t(tipKey)}
                      </Text>
                    </XStack>
                  ))}
                </YStack>
              )}
            </YStack>

            {/* Allocation breakdown */}
            <YStack
              bg="$color2"
              borderWidth={1}
              borderColor="$color4"
              rounded="$6"
              px="$4"
            >
              {/* Deferred payments */}
              {hasDeferred && (
                <>
                  <AllocationRow
                    label={t('income.allocate.rows.deferred')}
                    amount={allocation.deferredPayments}
                    sublabel={t('income.allocate.rows.deferredSublabel')}
                    highlight
                    currency={currency}
                  />
                  <Separator borderColor="$color3" />
                </>
              )}

              {/* Housing */}
              {outstanding.needs.housing > 0 && (
                <>
                  <AllocationRow
                    label={t('income.allocate.rows.housing')}
                    amount={allocation.needs.housing}
                    needed={outstanding.needs.housing}
                    currency={currency}
                  />
                  <Separator borderColor="$color3" />
                </>
              )}

              {/* Food */}
              {outstanding.needs.food > 0 && (
                <>
                  <AllocationRow
                    label={t('income.allocate.rows.food')}
                    amount={allocation.needs.food}
                    needed={outstanding.needs.food}
                    currency={currency}
                  />
                  <Separator borderColor="$color3" />
                </>
              )}

              {/* Minimum payments per debt */}
              {activeDebtsList.map((debt) => {
                const needed = outstanding.mins[debt.id] ?? 0;
                if (needed <= 0) return null;
                const amt = allocation.minimumPayments[debt.id] ?? 0;
                return (
                  <YStack key={debt.id}>
                    <AllocationRow
                      label={t('income.allocate.rows.minimumPayment', {
                        label: debt.label,
                      })}
                      amount={amt}
                      needed={needed}
                      sublabel={t(
                        'income.allocate.rows.minimumPaymentSublabel'
                      )}
                      currency={currency}
                    />
                    <Separator borderColor="$color3" />
                  </YStack>
                );
              })}

              {/* Transport */}
              {outstanding.needs.transport > 0 && (
                <>
                  <AllocationRow
                    label={t('income.allocate.rows.transport')}
                    amount={allocation.needs.transport}
                    needed={outstanding.needs.transport}
                    currency={currency}
                  />
                  <Separator borderColor="$color3" />
                </>
              )}

              {/* Other needs */}
              {outstanding.needs.other > 0 && (
                <>
                  <AllocationRow
                    label={t('income.allocate.rows.other')}
                    amount={allocation.needs.other}
                    needed={outstanding.needs.other}
                    currency={currency}
                  />
                  <Separator borderColor="$color3" />
                </>
              )}

              {/* Extra snowball payment */}
              {hasExtra && allocation.extraDebtPayment && (
                <>
                  <AllocationRow
                    label={t('income.allocate.rows.extraPayment', {
                      label:
                        debtById[allocation.extraDebtPayment.debtId]?.label ??
                        t('income.allocate.rows.extraPaymentFallback'),
                    })}
                    amount={allocation.extraDebtPayment.amount}
                    sublabel={t(
                      'income.allocate.rows.extraPaymentSublabel'
                    )}
                    highlight
                    currency={currency}
                  />
                  <Separator borderColor="$color3" />
                </>
              )}

              {/* Unallocated surplus */}
              {allocation.unallocated > 0 && (
                <AllocationRow
                  label={t('income.allocate.rows.unallocated')}
                  amount={allocation.unallocated}
                  sublabel={t(
                    'income.allocate.rows.unallocatedSublabel'
                  )}
                  currency={currency}
                />
              )}
            </YStack>

            {/* Default bias note */}
            <Paragraph color="$color8" fontSize="$2" style={{ textAlign: 'center' }}>
              {t('income.allocate.defaultBiasNote')}
            </Paragraph>
          </YStack>
        </ScrollView>

        {/* Sticky confirm button */}
        <YStack px="$4" pt="$3" pb={insets.bottom + 12}>
          <Button
            size="$5"
            bg="$accent9"
            pressStyle={{ bg: '$accent10' }}
            onPress={handleConfirm}
            accessibilityRole="button"
          >
            <Button.Text color="$color12">
              {t('income.allocate.confirm')}
            </Button.Text>
          </Button>
        </YStack>
      </YStack>
    </>
  );
}
