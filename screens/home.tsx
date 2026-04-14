import {
  AlertTriangle,
  Calendar,
  CalendarRange,
  CheckCircle2,
  Crosshair,
  TrendingDown,
  Trophy,
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
  useTheme,
} from 'tamagui';
import { Pie, PolarChart, CartesianChart, Bar } from 'victory-native';

import { Badge } from '@/components/badge';
import { IncomeFab } from '@/components/income-fab';
import { getActiveDebts, getMonthKey } from '@/lib/distribution/helpers';
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

function sumIncomeForMonth(incomes: Income[], monthKey: string): number {
  let total = 0;
  for (const income of incomes) {
    if (getMonthKey(new Date(income.date)) !== monthKey) continue;
    total += income.amount;
  }
  return total;
}

// ── Trigger cards ────────────────────────────────────────────────────────────

function RealityCheckCard({
  questionKey,
  onAnswer,
}: {
  questionKey: string;
  onAnswer: (answer: 'yes' | 'barely' | 'no') => void;
}) {
  const { t } = useTranslation();
  return (
    <YStack bg="$color2" borderWidth={1} borderLeftWidth={3} borderColor="$color5" borderLeftColor="$accent7" rounded="$6" p="$4" gap="$3">
      <Text color="$color9" fontSize="$1" letterSpacing={1}>{t('triggers.realityCheck.title').toUpperCase()}</Text>
      <Paragraph>{t(questionKey)}</Paragraph>
      <XStack gap="$2">
        <Button variant="outlined" size="$3" flex={1} onPress={() => onAnswer('yes')}>{t('triggers.realityCheck.yes')}</Button>
        <Button variant="outlined" size="$3" flex={1} onPress={() => onAnswer('barely')}>{t('triggers.realityCheck.barely')}</Button>
        <Button variant="outlined" size="$3" flex={1} onPress={() => onAnswer('no')}>{t('triggers.realityCheck.no')}</Button>
      </XStack>
    </YStack>
  );
}

function FreshStartCard({ messageKey, onDismiss }: { messageKey: string; onDismiss: () => void }) {
  const { t } = useTranslation();
  return (
    <YStack bg="$color2" borderWidth={1} borderLeftWidth={3} borderColor="$accent5" borderLeftColor="$accent9" rounded="$6" p="$4" gap="$3">
      <Text color="$accent9" fontSize="$1" letterSpacing={1}>{t('triggers.freshStart.title').toUpperCase()}</Text>
      <Paragraph>{t(messageKey)}</Paragraph>
      <Button chromeless size="$3" self="flex-start" onPress={onDismiss}>{t('triggers.freshStart.dismiss')}</Button>
    </YStack>
  );
}

function DebtCelebrationCard({ debtLabel, onDismiss }: { debtLabel: string; onDismiss: () => void }) {
  const { t } = useTranslation();
  return (
    <YStack theme="success" bg="$color2" borderWidth={1} borderLeftWidth={3} borderColor="$color5" borderLeftColor="$color9" rounded="$6" p="$4" gap="$3">
      <Text color="$color9" fontSize="$1" letterSpacing={1}>{t('triggers.celebration.title').toUpperCase()}</Text>
      <Paragraph>{t('triggers.celebration.message', { label: debtLabel })}</Paragraph>
      <Button chromeless size="$3" self="flex-start" onPress={onDismiss}>{t('triggers.celebration.dismiss')}</Button>
    </YStack>
  );
}

// ── Content cards ────────────────────────────────────────────────────────────

function DeferredBanner({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <YStack theme="warning" bg="$color3" borderWidth={1} borderLeftWidth={3} borderColor="$color7" borderLeftColor="$color9" rounded="$6" p="$3">
      <XStack items="center" gap="$2">
        <AlertTriangle size={16} color="$color9" />
        <Paragraph color="$color11" flex={1} fontSize="$3">{t('home.deferred.pending', { count })}</Paragraph>
      </XStack>
    </YStack>
  );
}

function HeroCard({ totalRemaining, totalPaid }: { totalRemaining: number; totalPaid: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const currency = t('common.currency');
  const total = totalRemaining + totalPaid;
  const paidPct = total > 0 ? Math.round((totalPaid / total) * 100) : 0;

  const chartData =
    total > 0
      ? [
          { label: t('progress.totalPaid'), value: totalPaid, color: theme.accent9.val },
          { label: t('progress.totalDebt'), value: totalRemaining, color: theme.color5.val },
        ]
      : [{ label: '-', value: 1, color: theme.color5.val }];

  return (
    <YStack bg="$color3" borderWidth={1} borderColor="$color4" rounded="$6" p="$4" gap="$3">
      <XStack items="center" gap="$2">
        <TrendingDown size={14} color="$accent11" />
        <Text color="$accent11" fontSize="$1" letterSpacing={1}>{t('progress.totalDebt').toUpperCase()}</Text>
      </XStack>
      <XStack items="center" gap="$4">
        <YStack width={120} height={120}>
          <PolarChart data={chartData} labelKey="label" valueKey="value" colorKey="color">
            <Pie.Chart innerRadius="60%">{() => <Pie.Slice />}</Pie.Chart>
          </PolarChart>
        </YStack>
        <YStack flex={1} gap="$3">
          <YStack gap="$0.5">
            <Text color="$color9" fontSize="$2">{t('progress.totalDebt').toUpperCase()}</Text>
            <Text fontSize="$6" fontWeight="700">{formatAmount(totalRemaining)} {currency}</Text>
          </YStack>
          <YStack gap="$0.5">
            <Text color="$color9" fontSize="$2">{t('progress.totalPaid').toUpperCase()}</Text>
            <Text fontSize="$4" fontWeight="600" color="$accent9">{formatAmount(totalPaid)} {currency} ({paidPct}%)</Text>
          </YStack>
        </YStack>
      </XStack>
    </YStack>
  );
}

function SnowballCard({ debt, incomes }: { debt: Debt; incomes: Income[] }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const paid = debt.originalAmount - debt.remainingAmount;
  const progressValue = debt.originalAmount > 0 ? Math.min(100, Math.max(0, (paid / debt.originalAmount) * 100)) : 0;
  const forecast = forecastClosureDate(debt, incomes);
  let forecastText: string | null = null;
  if (forecast) {
    const dateStr = formatMonthYear(forecast.date);
    forecastText = forecast.approximate
      ? t('home.snowball.forecastApprox', { date: dateStr })
      : t('home.snowball.forecast', { date: dateStr });
  }

  return (
    <YStack bg="$color3" borderWidth={1} borderLeftWidth={3} borderColor="$color4" borderLeftColor="$accent9" rounded="$6" overflow="hidden">
      <YStack p="$4" gap="$2">
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <Crosshair size={14} color="$accent11" />
            <Text color="$accent11" fontSize="$1" letterSpacing={1}>{t('home.snowball.target').toUpperCase()}</Text>
          </XStack>
          <Badge label={`${Math.round(progressValue)}%`} variant={progressValue > 0 ? 'accent' : 'muted'} />
        </XStack>
        <H3 numberOfLines={1}>{debt.label}</H3>
      </YStack>
      <Separator borderColor="$color4" />
      <YStack p="$4" gap="$3">
        <Progress value={progressValue} size="$2"><Progress.Indicator bg="$accent9" /></Progress>
        <XStack justify="space-between" items="center">
          <Text color="$color11" fontSize="$5" fontWeight="600">
            {t('home.snowball.remaining', { amount: `${formatAmount(debt.remainingAmount)} ${currency}` })}
          </Text>
          <Text color="$color9" fontSize="$3">
            {t('home.snowball.of', { amount: `${formatAmount(debt.originalAmount)} ${currency}` })}
          </Text>
        </XStack>
      </YStack>
      {forecastText ? (
        <>
          <Separator borderColor="$color4" />
          <XStack p="$4" items="center" gap="$2">
            <Calendar size={14} color="$accent11" />
            <Text color="$accent11" fontSize="$3">{forecastText}</Text>
          </XStack>
        </>
      ) : null}
    </YStack>
  );
}

function MonthlyComparisonCard({ thisMonth, lastMonth }: { thisMonth: number; lastMonth: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const currency = t('common.currency');
  const barData = [
    { month: t('progress.lastMonth'), amount: lastMonth },
    { month: t('progress.thisMonth'), amount: thisMonth },
  ];
  const hasData = thisMonth > 0 || lastMonth > 0;

  return (
    <YStack bg="$color2" borderWidth={1} borderColor="$color4" rounded="$6" overflow="hidden">
      <XStack px="$4" pt="$4" pb="$3" items="center" gap="$2">
        <CalendarRange size={14} color="$color9" />
        <Text color="$color9" fontSize="$1" letterSpacing={1}>{t('progress.monthlyComparison').toUpperCase()}</Text>
      </XStack>
      <Separator borderColor="$color3" />
      {hasData ? (
        <YStack px="$4" pt="$3" pb="$2" height={160}>
          <CartesianChart data={barData} xKey="month" yKeys={['amount']} domainPadding={{ left: 40, right: 40 }} axisOptions={{ tickCount: { x: 2, y: 4 }, formatXLabel: (v) => String(v), formatYLabel: (v) => `${v}`, labelColor: theme.color8.val, lineColor: theme.color4.val }}>
            {({ points, chartBounds }) => (
              <Bar points={points.amount} chartBounds={chartBounds} color={theme.accent9.val} roundedCorners={{ topLeft: 6, topRight: 6 }} innerPadding={0.4} animate={{ type: 'spring' }} />
            )}
          </CartesianChart>
        </YStack>
      ) : (
        <XStack p="$4" justify="center">
          <Text color="$color8" fontSize="$3">{formatAmount(0)} {currency}</Text>
        </XStack>
      )}
      <Separator borderColor="$color3" />
      <XStack>
        <YStack flex={1} p="$3" gap="$0.5" items="center">
          <Text color="$color9" fontSize="$1">{t('progress.lastMonth')}</Text>
          <Text color="$color11" fontSize="$4" fontWeight="600">{formatAmount(lastMonth)} {currency}</Text>
        </YStack>
        <Separator vertical borderColor="$color3" />
        <YStack flex={1} p="$3" gap="$0.5" items="center">
          <Text color="$color9" fontSize="$1">{t('progress.thisMonth')}</Text>
          <Text color="$color11" fontSize="$4" fontWeight="600">{formatAmount(thisMonth)} {currency}</Text>
        </YStack>
      </XStack>
    </YStack>
  );
}

function DebtProgressCard({ debt }: { debt: Debt }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const paid = debt.originalAmount - debt.remainingAmount;
  const pct = debt.originalAmount > 0 ? Math.min(100, Math.max(0, (paid / debt.originalAmount) * 100)) : 0;

  return (
    <YStack bg="$color2" borderWidth={1} borderColor="$color4" rounded="$6" overflow="hidden">
      <YStack p="$4" pb="$3" gap="$2">
        <XStack items="center" justify="space-between">
          <H3 numberOfLines={1} flex={1} mr="$2">{debt.label}</H3>
          <Badge label={t(`onboarding.debts.types.${debt.type}`)} />
        </XStack>
        <Progress value={pct} size="$2"><Progress.Indicator /></Progress>
        <XStack gap="$3" items="center">
          {[25, 50, 75].map((milestone) => {
            const reached = pct >= milestone;
            return (
              <XStack key={milestone} items="center" gap="$1">
                <YStack width={6} height={6} rounded="$10" bg={reached ? '$accent9' : '$color5'} />
                <Text color={reached ? '$color11' : '$color8'} fontSize="$1">{milestone}%</Text>
              </XStack>
            );
          })}
          <Text ml="auto" color="$color11" fontWeight="600">{Math.round(pct)}%</Text>
        </XStack>
      </YStack>
      <Separator borderColor="$color3" />
      <XStack px="$4" py="$3" justify="space-between" items="center">
        <YStack gap="$0.5">
          <Text color="$color9" fontSize="$2">{t('progress.paidSoFar')}</Text>
          <Text color="$color11" fontSize="$4" fontWeight="600">{formatAmount(paid)} {currency}</Text>
        </YStack>
        <YStack gap="$0.5" items="flex-end">
          <Text color="$color9" fontSize="$2">{t('progress.remaining')}</Text>
          <Text color="$color11" fontSize="$4">{formatAmount(debt.remainingAmount)} {currency}</Text>
        </YStack>
      </XStack>
    </YStack>
  );
}

function ClosedDebtsRow({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <YStack bg="$color2" borderWidth={1} borderColor="$color4" rounded="$6" p="$4">
      <XStack items="center" gap="$3">
        <Trophy size={20} color="$accent9" />
        <Text color="$color11">{t('progress.closedDebts', { count })}</Text>
      </XStack>
    </YStack>
  );
}

function LastDistributionCard({ income }: { income: Income }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const alloc = income.allocation;
  const totalNeeds = Object.values(alloc.needs).reduce((s, v) => s + v, 0);
  const totalMinimums = Object.values(alloc.minimumPayments).reduce((s, v) => s + v, 0);
  const extra = alloc.extraDebtPayment?.amount ?? 0;
  const dateStr = new Date(income.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });

  return (
    <YStack bg="$color2" borderWidth={1} borderColor="$color4" rounded="$6" overflow="hidden">
      <YStack p="$4" pb="$3">
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <Wallet size={14} color="$color9" />
            <Text color="$color9" fontSize="$1" letterSpacing={1}>{t('home.lastDistribution.title').toUpperCase()}</Text>
          </XStack>
          <Text color="$color9" fontSize="$2">{dateStr}</Text>
        </XStack>
        <Text fontSize="$6" fontWeight="600" mt="$1">{formatAmount(income.amount)} {currency}</Text>
      </YStack>
      <Separator borderColor="$color3" />
      <YStack px="$4" py="$3" gap="$2">
        {totalNeeds > 0 && <XStack justify="space-between"><Text color="$color9">{t('home.lastDistribution.needs')}</Text><Text color="$color11">{formatAmount(totalNeeds)} {currency}</Text></XStack>}
        {totalMinimums > 0 && <XStack justify="space-between"><Text color="$color9">{t('home.lastDistribution.minimums')}</Text><Text color="$color11">{formatAmount(totalMinimums)} {currency}</Text></XStack>}
        {extra > 0 && <XStack justify="space-between"><Text color="$color9">{t('home.lastDistribution.extra')}</Text><Text color="$accent9">+{formatAmount(extra)} {currency}</Text></XStack>}
        {alloc.unallocated > 0 && <XStack justify="space-between"><Text color="$color9">{t('home.lastDistribution.shortfall')}</Text><Text theme="error" color="$color9">-{formatAmount(alloc.unallocated)} {currency}</Text></XStack>}
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

  const activeDebts = getActiveDebts(debts).sort((a, b) => a.remainingAmount - b.remainingAmount);
  const closedDebts = debts.filter((d) => d.closedAt !== null);
  const snowballTarget = activeDebts[0] ?? null;
  const recentIncome = getRecentIncome(incomes);
  const pendingDeferred = deferredPayments.filter((p) => !p.resolved);

  const totalRemaining = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);
  const totalPaid = debts.reduce((s, d) => s + (d.originalAmount - d.remainingAmount), 0);

  const now = new Date();
  const thisMonthKey = getMonthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = getMonthKey(lastMonthDate);
  const thisMonthPayments = sumIncomeForMonth(incomes, thisMonthKey);
  const lastMonthPayments = sumIncomeForMonth(incomes, lastMonthKey);

  const realityCheckTrigger = useMemo(
    () => getRealityCheckTrigger(lastRealityCheckAt, installationDate),
    [lastRealityCheckAt, installationDate]
  );
  const freshStartTrigger = useMemo(
    () => getFreshStartTrigger(installationDate, null),
    [installationDate]
  );
  const debtCelebration = useMemo(
    () => getDebtCelebration(debts.map((d) => ({ label: d.label, closedAt: d.closedAt })), null),
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
      settings: { ...s.settings, lastRealityCheckAt: new Date().toISOString() },
    }));
    setDismissedRC(true);
  }

  const showRealityCheck = realityCheckTrigger.shouldShow && !dismissedRC;
  const showFreshStart = freshStartTrigger.shouldShow && !dismissedFS;
  const showCelebration = debtCelebration !== null && debtCelebration.shouldShow && !dismissedCelebration;
  const hasDebts = debts.length > 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          <YStack px="$4" pt="$4" gap="$4">
            {/* Greeting */}
            <H2>{t('home.greeting')}</H2>

            {/* Deferred warning */}
            {pendingDeferred.length > 0 && <DeferredBanner count={pendingDeferred.length} />}

            {/* Trigger cards */}
            {showCelebration && debtCelebration && (
              <DebtCelebrationCard debtLabel={debtCelebration.debtLabel} onDismiss={() => setDismissedCelebration(true)} />
            )}
            {showFreshStart && <FreshStartCard messageKey={freshStartTrigger.messageKey} onDismiss={() => setDismissedFS(true)} />}
            {showRealityCheck && <RealityCheckCard questionKey={realityCheckTrigger.questionKey} onAnswer={handleRealityCheckAnswer} />}

            {/* Hero donut — total debt overview */}
            {hasDebts && <HeroCard totalRemaining={totalRemaining} totalPaid={totalPaid} />}

            {/* Snowball target */}
            {snowballTarget ? (
              <SnowballCard debt={snowballTarget} incomes={incomes} />
            ) : (
              <YStack bg="$color2" rounded="$6" p="$5" items="center" gap="$3">
                <CheckCircle2 size={40} color="$accent9" />
                <Text color="$color9">{t('home.snowball.noDebts')}</Text>
              </YStack>
            )}

            {/* Monthly comparison */}
            {hasDebts && (
              <MonthlyComparisonCard thisMonth={thisMonthPayments} lastMonth={lastMonthPayments} />
            )}

            {/* Per-debt progress */}
            {activeDebts.length > 1 && (
              <YStack gap="$3">
                <Text color="$color9" fontSize="$1" letterSpacing={1}>
                  {t('progress.debtsSection').toUpperCase()}
                </Text>
                {activeDebts.map((debt) => (
                  <DebtProgressCard key={debt.id} debt={debt} />
                ))}
              </YStack>
            )}

            {/* Closed debts */}
            {closedDebts.length > 0 && <ClosedDebtsRow count={closedDebts.length} />}

            {/* Last distribution */}
            {recentIncome && <LastDistributionCard income={recentIncome} />}
          </YStack>
        </ScrollView>
        <IncomeFab />
      </SafeAreaView>
    </>
  );
}
