import {
  AlertTriangle,
  Calendar,
  Crosshair,
  Wallet,
} from '@tamagui/lucide-icons-2';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  H2,
  H3,
  Paragraph,
  Progress,
  Separator,
  Text,
  XStack,
  YStack,
} from 'tamagui';

import { Badge } from '@/components/badge';
import { IncomeFab } from '@/components/income-fab';
import { getActiveDebts } from '@/lib/distribution/helpers';
import { formatAmount } from '@/lib/format';
import {
  getDebtCelebration,
  getFreshStartTrigger,
  getRealityCheckTrigger,
} from '@/lib/triggers';
import { useAppStore } from '@/store';
import type { Debt, Income, RealityCheckResponse } from '@/types/models';

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  onAnswer,
}: {
  questionKey: string;
  onAnswer: (answer: 'yes' | 'barely' | 'no') => void;
}) {
  const { t } = useTranslation();

  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderLeftWidth={3}
      borderColor="$color5"
      borderLeftColor="$accent7"
      rounded="$6"
      p="$4"
      gap="$3"
    >
      <Text color="$color9" fontSize="$1" letterSpacing={1}>
        {t('triggers.realityCheck.title').toUpperCase()}
      </Text>
      <Paragraph>{t(questionKey)}</Paragraph>
      <XStack gap="$2">
        <Button variant="outlined" size="$3" flex={1} onPress={() => onAnswer('yes')}>
          {t('triggers.realityCheck.yes')}
        </Button>
        <Button variant="outlined" size="$3" flex={1} onPress={() => onAnswer('barely')}>
          {t('triggers.realityCheck.barely')}
        </Button>
        <Button variant="outlined" size="$3" flex={1} onPress={() => onAnswer('no')}>
          {t('triggers.realityCheck.no')}
        </Button>
      </XStack>
    </YStack>
  );
}

function FreshStartCard({
  messageKey,
  onDismiss,
}: {
  messageKey: string;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderLeftWidth={3}
      borderColor="$accent5"
      borderLeftColor="$accent9"
      rounded="$6"
      p="$4"
      gap="$3"
    >
      <Text color="$accent9" fontSize="$1" letterSpacing={1}>
        {t('triggers.freshStart.title').toUpperCase()}
      </Text>
      <Paragraph>{t(messageKey)}</Paragraph>
      <Button chromeless size="$3" self="flex-start" onPress={onDismiss}>
        {t('triggers.freshStart.dismiss')}
      </Button>
    </YStack>
  );
}

function DebtCelebrationCard({
  debtLabel,
  onDismiss,
}: {
  debtLabel: string;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  return (
    <YStack
      theme="success"
      bg="$color2"
      borderWidth={1}
      borderLeftWidth={3}
      borderColor="$color5"
      borderLeftColor="$color9"
      rounded="$6"
      p="$4"
      gap="$3"
    >
      <Text color="$color9" fontSize="$1" letterSpacing={1}>
        {t('triggers.celebration.title').toUpperCase()}
      </Text>
      <Paragraph>
        {t('triggers.celebration.message', { label: debtLabel })}
      </Paragraph>
      <Button chromeless size="$3" self="flex-start" onPress={onDismiss}>
        {t('triggers.celebration.dismiss')}
      </Button>
    </YStack>
  );
}

// ── Content cards ────────────────────────────────────────────────────────────

function SnowballCard({ debt, incomes }: { debt: Debt; incomes: Income[] }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
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
    <YStack
      bg="$color3"
      borderWidth={1}
      borderLeftWidth={3}
      borderColor="$color4"
      borderLeftColor="$accent9"
      rounded="$6"
      overflow="hidden"
    >
      <YStack p="$4" gap="$2">
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <Crosshair size={14} color="$accent11" />
            <Text color="$accent11" fontSize="$1" letterSpacing={1}>
              {t('home.snowball.target').toUpperCase()}
            </Text>
          </XStack>
          <Badge
            label={`${Math.round(progressValue)}%`}
            variant={progressValue > 0 ? 'accent' : 'muted'}
          />
        </XStack>
        <H3 numberOfLines={1}>{debt.label}</H3>
      </YStack>

      <Separator borderColor="$color4" />

      <YStack p="$4" gap="$3">
        <Progress value={progressValue} size="$2">
          <Progress.Indicator bg="$accent9" />
        </Progress>
        <XStack justify="space-between" items="center">
          <Text color="$color11" fontSize="$5" fontWeight="600">
            {t('home.snowball.remaining', {
              amount: `${formatAmount(debt.remainingAmount)} ${currency}`,
            })}
          </Text>
          <Text color="$color9" fontSize="$3">
            {t('home.snowball.of', {
              amount: `${formatAmount(debt.originalAmount)} ${currency}`,
            })}
          </Text>
        </XStack>
      </YStack>

      {forecastText ? (
        <>
          <Separator borderColor="$color4" />
          <XStack p="$4" items="center" gap="$2">
            <Calendar size={14} color="$accent11" />
            <Text color="$accent11" fontSize="$3">
              {forecastText}
            </Text>
          </XStack>
        </>
      ) : null}
    </YStack>
  );
}

function DeferredBanner({ count }: { count: number }) {
  const { t } = useTranslation();

  return (
    <YStack
      theme="warning"
      bg="$color3"
      borderWidth={1}
      borderLeftWidth={3}
      borderColor="$color7"
      borderLeftColor="$color9"
      rounded="$6"
      p="$3"
    >
      <XStack items="center" gap="$2">
        <AlertTriangle size={16} color="$color9" />
        <Paragraph color="$color11" flex={1} fontSize="$3">
          {t('home.deferred.pending', { count })}
        </Paragraph>
      </XStack>
    </YStack>
  );
}

function LastDistributionCard({ income }: { income: Income }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const alloc = income.allocation;
  const totalNeeds = Object.values(alloc.needs).reduce((s, v) => s + v, 0);
  const totalMinimums = Object.values(alloc.minimumPayments).reduce(
    (s, v) => s + v,
    0
  );
  const extra = alloc.extraDebtPayment?.amount ?? 0;
  const dateStr = new Date(income.date).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderColor="$color4"
      rounded="$6"
      overflow="hidden"
    >
      <YStack p="$4" pb="$3">
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <Wallet size={14} color="$color9" />
            <Text color="$color9" fontSize="$1" letterSpacing={1}>
              {t('home.lastDistribution.title').toUpperCase()}
            </Text>
          </XStack>
          <Text color="$color9" fontSize="$2">
            {dateStr}
          </Text>
        </XStack>
        <Text fontSize="$6" fontWeight="600" mt="$1">
          {formatAmount(income.amount)} {currency}
        </Text>
      </YStack>

      <Separator borderColor="$color3" />

      <YStack px="$4" py="$3" gap="$2">
        {totalNeeds > 0 ? (
          <XStack justify="space-between">
            <Text color="$color9">{t('home.lastDistribution.needs')}</Text>
            <Text color="$color11">
              {formatAmount(totalNeeds)} {currency}
            </Text>
          </XStack>
        ) : null}
        {totalMinimums > 0 ? (
          <XStack justify="space-between">
            <Text color="$color9">{t('home.lastDistribution.minimums')}</Text>
            <Text color="$color11">
              {formatAmount(totalMinimums)} {currency}
            </Text>
          </XStack>
        ) : null}
        {extra > 0 ? (
          <XStack justify="space-between">
            <Text color="$color9">{t('home.lastDistribution.extra')}</Text>
            <Text color="$accent9">
              +{formatAmount(extra)} {currency}
            </Text>
          </XStack>
        ) : null}
        {alloc.unallocated > 0 ? (
          <XStack justify="space-between">
            <Text color="$color9">{t('home.lastDistribution.shortfall')}</Text>
            <Text theme="error" color="$color9">
              -{formatAmount(alloc.unallocated)} {currency}
            </Text>
          </XStack>
        ) : null}
      </YStack>
    </YStack>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t } = useTranslation();

  const debts = useAppStore((s) => s.debts);
  const incomes = useAppStore((s) => s.incomes);
  const deferredPayments = useAppStore((s) => s.deferredPayments);
  const installationDate = useAppStore((s) => s.installationDate);
  const lastRealityCheckAt = useAppStore((s) => s.settings.lastRealityCheckAt);

  const [dismissedRC, setDismissedRC] = useState(false);
  const [dismissedFS, setDismissedFS] = useState(false);
  const [dismissedCelebration, setDismissedCelebration] = useState(false);

  const activeDebts = getActiveDebts(debts).sort(
    (a, b) => a.remainingAmount - b.remainingAmount
  );
  const snowballTarget = activeDebts[0] ?? null;
  const recentIncome = getRecentIncome(incomes);
  const pendingDeferred = deferredPayments.filter((p) => !p.resolved);

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
      answer,
    };
    useAppStore.setState((s) => ({
      realityChecks: [...s.realityChecks, response],
      settings: {
        ...s.settings,
        lastRealityCheckAt: new Date().toISOString(),
      },
    }));
    setDismissedRC(true);
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
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <YStack px="$4" pt="$4" gap="$4">
            {/* Greeting */}
            <H2>{t('home.greeting')}</H2>

            {/* Deferred payments warning */}
            {pendingDeferred.length > 0 ? (
              <DeferredBanner count={pendingDeferred.length} />
            ) : null}

            {/* Trigger cards */}
            {showCelebration && debtCelebration ? (
              <DebtCelebrationCard
                debtLabel={debtCelebration.debtLabel}
                onDismiss={() => setDismissedCelebration(true)}
              />
            ) : null}

            {showFreshStart ? (
              <FreshStartCard
                messageKey={freshStartTrigger.messageKey}
                onDismiss={() => setDismissedFS(true)}
              />
            ) : null}

            {showRealityCheck ? (
              <RealityCheckCard
                questionKey={realityCheckTrigger.questionKey}
                onAnswer={handleRealityCheckAnswer}
              />
            ) : null}

            {/* Snowball target */}
            {snowballTarget ? (
              <SnowballCard debt={snowballTarget} incomes={incomes} />
            ) : (
              <YStack bg="$color2" rounded="$6" p="$5" items="center" gap="$3">
                <Text color="$color9">{t('home.snowball.noDebts')}</Text>
              </YStack>
            )}

            {/* Last distribution */}
            {recentIncome ? (
              <LastDistributionCard income={recentIncome} />
            ) : null}

          </YStack>
        </ScrollView>
        <IncomeFab />
      </SafeAreaView>
    </>
  );
}
