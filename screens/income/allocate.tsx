import { useMemo } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import {
  YStack,
  XStack,
  H3,
  Text,
  Button,
  Paragraph,
  Separator,
  ScrollView,
  Theme } from 'tamagui';
import { useAppStore } from '@/store';
import { distributeIncome } from '@/lib/distribution';
import { getCurrentMonthlyCoverage, getOutstandingNeeds, getOutstandingMinimums, getActiveDebts } from '@/lib/distribution/helpers';
import type { Allocation, AppState } from '@/types/models';


// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPLN(amount: number): string {
  return amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 });
}

// ── Row component ─────────────────────────────────────────────────────────────

interface AllocationRowProps {
  label: string;
  amount: number;
  needed?: number;
  sublabel?: string;
  highlight?: boolean;
  currency: string;
}

function AllocationRow({ label, amount, needed, sublabel, highlight, currency }: AllocationRowProps) {
  const { t } = useTranslation();
  const hasNeeded = needed !== undefined && needed > 0;
  const pct = hasNeeded ? Math.min(100, Math.round((amount / needed) * 100)) : 100;
  const isFull = hasNeeded && amount >= needed;



  return (
    <YStack py="$3" gap="$2">
      {/* Header: label + percentage */}
      <XStack items="center" justify="space-between">
        <YStack flex={1} gap="$0.5" pr="$3">
          <Text
          >
            {label}
          </Text>
          {sublabel ? (
            <Paragraph>
              {sublabel}
            </Paragraph>
          ) : null}
        </YStack>
        {hasNeeded && (
          <Text>
            {pct}%
          </Text>
        )}
      </XStack>

      {/* Progress bar */}
      {hasNeeded && (
        <YStack height={6} rounded="$10" overflow="hidden">
          <YStack
            height={6}
            width={`${pct}%` as any}
            rounded="$10"
          />
        </YStack>
      )}

      {/* Amounts: allocated / needed */}
      <XStack justify="space-between" items="center">
        <XStack gap="$1" items="baseline">
          <Text>
            {t('income.allocate.allocated')}
          </Text>
          <Text>
            {formatPLN(amount)} {currency}
          </Text>
        </XStack>
        {hasNeeded && (
          <XStack gap="$1" items="baseline">
            <Text>
              {t('income.allocate.needed')}
            </Text>
            <Text>
              {formatPLN(needed)} {currency}
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

  // Read state slices individually for performance
  const monthlyNeeds = useAppStore((s) => s.monthlyNeeds);
  const debts = useAppStore((s) => s.debts);
  const deferredPayments = useAppStore((s) => s.deferredPayments);
  const monthlyCoverage = useAppStore((s) => s.monthlyCoverage);
  const settings = useAppStore((s) => s.settings);

  const incomeAmount = parseFloat(params.amount ?? '0');
  const currency = t('common.currency');

  // Build a minimal AppState snapshot for the pure distributeIncome function
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
      settings }),
    [monthlyNeeds, debts, deferredPayments, monthlyCoverage, settings],
  );

  const allocation: Allocation = useMemo(
    () => distributeIncome(incomeAmount, stateSnapshot),
    [incomeAmount, stateSnapshot],
  );

  // Calculate what's needed per category (for "X out of Y" display)
  const outstanding = useMemo(() => {
    const coverage = getCurrentMonthlyCoverage(monthlyCoverage);
    const needs = getOutstandingNeeds(monthlyNeeds, coverage);
    const activeD = getActiveDebts(debts);
    const mins = getOutstandingMinimums(activeD, coverage);
    return { needs, mins };
  }, [monthlyNeeds, monthlyCoverage, debts]);

  // Coverage stats for the supportive summary card
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
    const pct = totalNeeds > 0 ? Math.round((covered / totalNeeds) * 100) : 100;
    const hasShortfall = covered < totalNeeds;

    // Build concrete tips based on what's not covered
    const tips: string[] = [];
    if (allocation.needs.food < monthlyNeeds.food && monthlyNeeds.food > 0) {
      tips.push('income.allocate.tips.food');
    }
    if (allocation.needs.transport === 0 && monthlyNeeds.transport > 0) {
      tips.push('income.allocate.tips.transport');
    }
    const unpaidDebts = Object.entries(outstanding.mins).filter(
      ([id]) => (allocation.minimumPayments[id] ?? 0) === 0,
    );
    if (unpaidDebts.length > 0) {
      tips.push('income.allocate.tips.contactCreditor');
    }
    if (tips.length === 0 && hasShortfall) {
      tips.push('income.allocate.tips.nextIncome');
    }

    return { pct, hasShortfall, tips };
  }, [allocation, monthlyNeeds, outstanding]);

  // Debt label lookup
  const debtById = useMemo(() => {
    return Object.fromEntries(debts.map((d) => [d.id, d]));
  }, [debts]);

  function handleConfirm() {
    router.push({
      pathname: '/income/confirm',
      params: {
        amount: params.amount,
        source: params.source ?? '',
        allocation: JSON.stringify(allocation) } });
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
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text>
                {t('common.back')}
              </Text>
            </Pressable>
          ) }}
      />

      <YStack flex={1}>
        <ScrollView>
          <YStack px="$5" pt="$4" pb="$6" gap="$4">

            {/* Received amount header */}
            <XStack items="center" gap="$2">
              <Text>
                {t('income.allocate.receivedLabel')}
              </Text>
              <Text>
                {formatPLN(incomeAmount)} {currency}
              </Text>
            </XStack>

            {/* Supportive coverage summary */}
            <YStack p="$4" rounded="$4" borderWidth={1} gap="$3">
              {/* Coverage bar */}
              <XStack items="center" justify="space-between">
                <Text>
                  {t('income.allocate.summary.coverageLabel')}
                </Text>
                <Text>
                  {coverageStats.pct}%
                </Text>
              </XStack>
              <YStack height={8} rounded="$10" overflow="hidden">
                <YStack
                  height={8}
                  width={`${Math.min(100, coverageStats.pct)}%` as any}
                  rounded="$10"
                />
              </YStack>

              {/* Concrete tips */}
              {coverageStats.tips.length > 0 && (
                <YStack gap="$2" pt="$1">
                  <Text>
                    {t('income.allocate.summary.tipsLabel')}
                  </Text>
                  {coverageStats.tips.map((tipKey) => (
                    <XStack key={tipKey} gap="$2" items="flex-start">
                      <Text>→</Text>
                      <Text flex={1}>
                        {t(tipKey)}
                      </Text>
                    </XStack>
                  ))}
                </YStack>
              )}
            </YStack>

            {/* Allocation breakdown card */}
            <YStack p="$4" rounded="$5" borderWidth={1}>
              <YStack gap="$0">

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
                    <Separator />
                  </>
                )}

                {/* Housing — always visible */}
                {outstanding.needs.housing > 0 && (
                  <>
                    <AllocationRow
                      label={t('income.allocate.rows.housing')}
                      amount={allocation.needs.housing}
                      needed={outstanding.needs.housing}
                      currency={currency}
                    />
                    <Separator />
                  </>
                )}

                {/* Food — always visible */}
                {outstanding.needs.food > 0 && (
                  <>
                    <AllocationRow
                      label={t('income.allocate.rows.food')}
                      amount={allocation.needs.food}
                      needed={outstanding.needs.food}
                      currency={currency}
                    />
                    <Separator />
                  </>
                )}

                {/* Minimum payments per debt — all active debts */}
                {activeDebtsList.map((debt) => {
                  const needed = outstanding.mins[debt.id] ?? 0;
                  if (needed <= 0) return null;
                  const amt = allocation.minimumPayments[debt.id] ?? 0;
                  return (
                    <YStack key={debt.id}>
                      <AllocationRow
                        label={t('income.allocate.rows.minimumPayment', {
                          label: debt.label })}
                        amount={amt}
                        needed={needed}
                        sublabel={t('income.allocate.rows.minimumPaymentSublabel')}
                        currency={currency}
                      />
                      <Separator />
                    </YStack>
                  );
                })}

                {/* Transport — always visible */}
                {outstanding.needs.transport > 0 && (
                  <>
                    <AllocationRow
                      label={t('income.allocate.rows.transport')}
                      amount={allocation.needs.transport}
                      needed={outstanding.needs.transport}
                      currency={currency}
                    />
                    <Separator />
                  </>
                )}

                {/* Other needs — always visible */}
                {outstanding.needs.other > 0 && (
                  <>
                    <AllocationRow
                      label={t('income.allocate.rows.other')}
                      amount={allocation.needs.other}
                      needed={outstanding.needs.other}
                      currency={currency}
                    />
                    <Separator />
                  </>
                )}

                {/* Extra snowball payment — highlighted as a win */}
                {hasExtra && allocation.extraDebtPayment && (
                  <>
                    <AllocationRow
                      label={t('income.allocate.rows.extraPayment', {
                        label:
                          debtById[allocation.extraDebtPayment.debtId]?.label ??
                          t('income.allocate.rows.extraPaymentFallback') })}
                      amount={allocation.extraDebtPayment.amount}
                      sublabel={t('income.allocate.rows.extraPaymentSublabel')}
                      highlight
                      currency={currency}
                    />
                    <Separator />
                  </>
                )}

                {/* Unallocated surplus */}
                {allocation.unallocated > 0 && (
                  <AllocationRow
                    label={t('income.allocate.rows.unallocated')}
                    amount={allocation.unallocated}
                    sublabel={t('income.allocate.rows.unallocatedSublabel')}
                    currency={currency}
                  />
                )}
              </YStack>
            </YStack>

            {/* Default bias note */}
            <Paragraph style={{ textAlign: 'center' }}>
              {t('income.allocate.defaultBiasNote')}
            </Paragraph>
          </YStack>
        </ScrollView>

        {/* Sticky confirm button — default bias: prominent one-tap confirm */}
        <YStack
          px="$5"
          pt="$3"
          pb={insets.bottom + 12}
          borderTopWidth={1}
        >
          <Button
            size="$5"
            onPress={handleConfirm}
            accessibilityRole="button"
          >
            <Text>{t('income.allocate.confirm')}</Text>
          </Button>
        </YStack>
      </YStack>
    </>
  );
}
