import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  H2,
  H3,
  Paragraph,
  Progress,
  Separator,
  Text,
  XStack,
  YStack } from 'tamagui';

import {
  getDebtCelebration,
  getFreshStartTrigger,
  getRealityCheckTrigger } from '@/lib/triggers';
import { useAppStore } from '@/store';
import { getActiveDebts } from '@/lib/distribution/helpers';
import type { Debt, Income, RealityCheckResponse } from '@/types/models';

function forecastClosureDate(
  debt: Debt,
  incomes: Income[]
): { date: Date; approximate: boolean } | null {
  if (debt.remainingAmount <= 0) return null;
  const extraPayments = incomes
    .filter(
      (i) =>
        i.allocation.extraDebtPayment?.debtId === debt.id &&
        (i.allocation.extraDebtPayment?.amount ?? 0) > 0
    )
    .map((i) => i.allocation.extraDebtPayment!.amount);
  const minPayments = incomes
    .filter((i) => (i.allocation.minimumPayments[debt.id] ?? 0) > 0)
    .map((i) => i.allocation.minimumPayments[debt.id]!);
  const allPayments = [...extraPayments, ...minPayments];
  let monthlyPayment: number;

  const approximate = allPayments.length < 4;

  if (allPayments.length > 0) {
    monthlyPayment =
      allPayments.reduce((s, v) => s + v, 0) / allPayments.length;
  } else if (debt.minimumPayment > 0) {
    monthlyPayment = debt.minimumPayment;
  } else {
    return null;
  }
  if (monthlyPayment <= 0) return null;
  const monthsLeft = Math.ceil(debt.remainingAmount / monthlyPayment);
  const target = new Date();
  target.setMonth(target.getMonth() + monthsLeft);
  return { date: target, approximate };
}

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' });
}

function formatPLN(amount: number): string {
  return (
    new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0 }).format(amount) + ' zł'
  );
}

function getRecentIncome(incomes: Income[]): Income | null {
  if (incomes.length === 0) return null;
  const sorted = [...incomes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const latest = sorted[0]!;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return new Date(latest.date).getTime() >= sevenDaysAgo ? latest : null;
}

// ── Trigger sub-components ───────────────────────────────────────────────────

function RealityCheckCard({
  questionKey,
  onAnswer }: {
  questionKey: string;
  onAnswer: (answer: 'yes' | 'barely' | 'no') => void;
}) {
  const { t } = useTranslation();

  return (
    <YStack borderWidth={1} rounded="$4" p="$4" gap="$3">
      <Text letterSpacing={1}>
        {t('triggers.realityCheck.title').toUpperCase()}
      </Text>
      <Text>{t(questionKey)}</Text>
      <XStack gap="$2">
        <Button
          flex={1}
          size="$3"
          borderWidth={1}
          onPress={() => onAnswer('yes')}
        >
          <Text>{t('triggers.realityCheck.yes')}</Text>
        </Button>
        <Button
          flex={1}
          size="$3"
          borderWidth={1}
          onPress={() => onAnswer('barely')}
        >
          <Text>{t('triggers.realityCheck.barely')}</Text>
        </Button>
        <Button
          flex={1}
          size="$3"
          borderWidth={1}
          onPress={() => onAnswer('no')}
        >
          <Text>{t('triggers.realityCheck.no')}</Text>
        </Button>
      </XStack>
    </YStack>
  );
}

function FreshStartCard({
  messageKey,
  onDismiss }: {
  messageKey: string;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  return (
    <YStack borderWidth={2} rounded="$4" p="$4" gap="$3">
      <Text letterSpacing={1}>
        {t('triggers.freshStart.title').toUpperCase()}
      </Text>
      <Text>{t(messageKey)}</Text>
      <Button
        size="$3"
        bg="transparent"
        borderWidth={1}
        self="flex-start"
        onPress={onDismiss}
      >
        <Text>{t('triggers.freshStart.dismiss')}</Text>
      </Button>
    </YStack>
  );
}

function DebtCelebrationCard({
  debtLabel,
  onDismiss }: {
  debtLabel: string;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  return (
    <YStack bg="#1A2919" borderWidth={2} rounded="$4" p="$4" gap="$3">
      <Text letterSpacing={1}>
        {t('triggers.celebration.title').toUpperCase()}
      </Text>
      <Text>{t('triggers.celebration.message', { label: debtLabel })}</Text>
      <Button size="$3" self="flex-start" onPress={onDismiss}>
        <Text>{t('triggers.celebration.dismiss')}</Text>
      </Button>
    </YStack>
  );
}

function SnowballCard({ debt, incomes }: { debt: Debt; incomes: Income[] }) {
  const { t } = useTranslation();
  const paid = debt.originalAmount - debt.remainingAmount;
  const progressValue =
    debt.originalAmount > 0
      ? Math.min(100, Math.max(0, (paid / debt.originalAmount) * 100))
      : 0;
  const forecast = forecastClosureDate(debt, incomes);
  let forecastText: string | null = null;
  if (forecast) {
    const dateStr = formatMonthYear(forecast.date);
    forecastText = forecast.approximate
      ? t('home.snowball.forecastApprox', { date: dateStr })
      : t('home.snowball.forecast', { date: dateStr });
  }

  return (
    <YStack borderWidth={1} rounded="$6" overflow="hidden">
      <YStack p="$4">
        <XStack items="center" justify="space-between" mb="$2">
          <Text letterSpacing={1}>
            {t('home.snowball.target').toUpperCase()}
          </Text>
          <Text>{Math.round(progressValue)}%</Text>
        </XStack>
        <H3 numberOfLines={1}>{debt.label}</H3>
      </YStack>
      <YStack px="$4" pb="$2" gap="$3">
        <Progress value={progressValue} size="$2">
          <Progress.Indicator />
        </Progress>
        <XStack justify="space-between" items="center">
          <Text>
            {t('home.snowball.remaining', {
              amount: formatPLN(debt.remainingAmount) })}
          </Text>
          <Text>
            {t('home.snowball.of', { amount: formatPLN(debt.originalAmount) })}
          </Text>
        </XStack>
      </YStack>
      {forecastText ? (
        <YStack p="$4" pt="$3">
          <Paragraph>{forecastText}</Paragraph>
        </YStack>
      ) : null}
    </YStack>
  );
}

function LastDistributionCard({ income }: { income: Income }) {
  const { t } = useTranslation();
  const alloc = income.allocation;
  const totalNeeds = Object.values(alloc.needs).reduce((s, v) => s + v, 0);
  const totalMinimums = Object.values(alloc.minimumPayments).reduce(
    (s, v) => s + v,
    0
  );
  const extra = alloc.extraDebtPayment?.amount ?? 0;
  const dateStr = new Date(income.date).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long' });

  return (
    <YStack borderWidth={1} rounded="$6">
      <YStack p="$4" pb="$3">
        <XStack items="center" justify="space-between">
          <Text letterSpacing={1}>
            {t('home.lastDistribution.title').toUpperCase()}
          </Text>
          <Text>{dateStr}</Text>
        </XStack>
        <Text mt="$1">{formatPLN(income.amount)}</Text>
      </YStack>
      <Separator />
      <YStack px="$4" py="$3" gap="$2">
        {totalNeeds > 0 ? (
          <XStack justify="space-between">
            <Text>{t('home.lastDistribution.needs')}</Text>
            <Text>{formatPLN(totalNeeds)}</Text>
          </XStack>
        ) : null}
        {totalMinimums > 0 ? (
          <XStack justify="space-between">
            <Text>{t('home.lastDistribution.minimums')}</Text>
            <Text>{formatPLN(totalMinimums)}</Text>
          </XStack>
        ) : null}
        {extra > 0 ? (
          <XStack justify="space-between">
            <Text>{t('home.lastDistribution.extra')}</Text>
            <Text>+{formatPLN(extra)}</Text>
          </XStack>
        ) : null}
        {alloc.unallocated > 0 ? (
          <XStack justify="space-between">
            <Text>{t('home.lastDistribution.shortfall')}</Text>
            <Text>-{formatPLN(alloc.unallocated)}</Text>
          </XStack>
        ) : null}
      </YStack>
    </YStack>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const debts = useAppStore((s) => s.debts);
  const incomes = useAppStore((s) => s.incomes);
  const deferredPayments = useAppStore((s) => s.deferredPayments);
  const installationDate = useAppStore((s) => s.installationDate);
  const lastRealityCheckAt = useAppStore((s) => s.settings.lastRealityCheckAt);

  // Local dismiss state for trigger cards
  const [dismissedRC, setDismissedRC] = useState(false);
  const [dismissedFS, setDismissedFS] = useState(false);
  const [dismissedCelebration, setDismissedCelebration] = useState(false);

  const activeDebts = getActiveDebts(debts).sort((a, b) => a.remainingAmount - b.remainingAmount);
  const snowballTarget = activeDebts[0] ?? null;
  const recentIncome = getRecentIncome(incomes);
  const pendingDeferred = deferredPayments.filter((p) => !p.resolved);

  // Compute triggers once per render via useMemo
  const realityCheckTrigger = useMemo(
    () => getRealityCheckTrigger(lastRealityCheckAt, installationDate),
    [lastRealityCheckAt, installationDate]
  );

  const freshStartTrigger = useMemo(
    () => getFreshStartTrigger(installationDate, null),
    [installationDate]
  );

  const debtCelebration = useMemo(
    () =>
      getDebtCelebration(
        debts.map((d) => ({ label: d.label, closedAt: d.closedAt })),
        null
      ),
    [debts]
  );

  function handleRealityCheckAnswer(answer: 'yes' | 'barely' | 'no') {
    if (!realityCheckTrigger.shouldShow) return;
    const response: RealityCheckResponse = {
      id: `rc-${Date.now()}`,
      date: new Date().toISOString(),
      question: realityCheckTrigger.questionKey,
      category: realityCheckTrigger.category,
      answer };
    useAppStore.setState((s) => ({
      realityChecks: [...s.realityChecks, response],
      settings: { ...s.settings, lastRealityCheckAt: new Date().toISOString() } }));
    setDismissedRC(true);
  }

  function handleFreshStartDismiss() {
    setDismissedFS(true);
  }

  function handleCelebrationDismiss() {
    setDismissedCelebration(true);
  }

  const showRealityCheck = realityCheckTrigger.shouldShow && !dismissedRC;
  const showFreshStart = freshStartTrigger.shouldShow && !dismissedFS;
  const showCelebration =
    debtCelebration !== null &&
    debtCelebration.shouldShow &&
    !dismissedCelebration;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack px="$4" pt={insets.top + 16} gap="$5">
          <YStack gap="$1">
            <H2>{t('home.greeting')}</H2>
            {pendingDeferred.length > 0 ? (
              <Paragraph>
                {t('home.deferred.pending', { count: pendingDeferred.length })}
              </Paragraph>
            ) : null}
          </YStack>

          {/* Trigger cards — shown above snowball and distribution content */}
          {showCelebration && debtCelebration ? (
            <DebtCelebrationCard
              debtLabel={debtCelebration.debtLabel}
              onDismiss={handleCelebrationDismiss}
            />
          ) : null}

          {showFreshStart ? (
            <FreshStartCard
              messageKey={freshStartTrigger.messageKey}
              onDismiss={handleFreshStartDismiss}
            />
          ) : null}

          {showRealityCheck ? (
            <RealityCheckCard
              questionKey={realityCheckTrigger.questionKey}
              onAnswer={handleRealityCheckAnswer}
            />
          ) : null}

          {snowballTarget ? (
            <SnowballCard debt={snowballTarget} incomes={incomes} />
          ) : (
            <YStack borderWidth={1} rounded="$6" p="$4">
              <Paragraph>{t('home.snowball.noDebts')}</Paragraph>
            </YStack>
          )}

          {recentIncome ? <LastDistributionCard income={recentIncome} /> : null}
        </YStack>
      </ScrollView>

      {/* Sticky CTA */}
      <YStack
        position="absolute"
        b={0}
        l={0}
        r={0}
        pb={insets.bottom > 0 ? insets.bottom : '$4'}
        pt="$3"
        px="$4"
        borderTopWidth={1}
      >
        <Button size="$5" onPress={() => router.push('/income/new')}>
          <Text>{t('home.cta.receivedMoney')}</Text>
        </Button>
      </YStack>
    </>
  );
}
