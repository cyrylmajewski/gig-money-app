import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import {
  YStack,
  XStack,
  Text,
  H2,
  H3,
  Paragraph,
  Progress,
  Separator,
  useTheme,
} from 'tamagui';
import {
  TrendingDown,
  Trophy,
  Target,
  CheckCircle2,
  CalendarRange,
} from '@tamagui/lucide-icons-2';
import { Pie, PolarChart, CartesianChart, Bar } from 'victory-native';

import { Badge } from '@/components/badge';
import { IncomeFab } from '@/components/income-fab';
import { useAppStore } from '@/store';
import { formatAmount as fmt } from '@/lib/format';
import { getMonthKey } from '@/lib/distribution/helpers';
import type { Debt, Income } from '@/types/models';

function sumIncomeForMonth(incomes: Income[], monthKey: string): number {
  let total = 0;
  for (const income of incomes) {
    if (getMonthKey(new Date(income.date)) !== monthKey) continue;
    total += income.amount;
  }
  return total;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HeroCard({
  totalRemaining,
  totalPaid,
}: {
  totalRemaining: number;
  totalPaid: number;
}) {
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
    <YStack
      bg="$color3"
      borderWidth={1}
      borderColor="$color4"
      rounded="$6"
      overflow="hidden"
      p="$4"
      gap="$3"
    >
      <XStack items="center" gap="$2">
        <TrendingDown size={14} color="$accent11" />
        <Text color="$accent11" fontSize="$1" letterSpacing={1}>
          {t('progress.totalDebt').toUpperCase()}
        </Text>
      </XStack>

      <XStack items="center" gap="$4">
        {/* Donut chart */}
        <YStack width={120} height={120}>
          <PolarChart
            data={chartData}
            labelKey="label"
            valueKey="value"
            colorKey="color"
          >
            <Pie.Chart innerRadius="60%">
              {() => <Pie.Slice />}
            </Pie.Chart>
          </PolarChart>
        </YStack>

        {/* Stats */}
        <YStack flex={1} gap="$3">
          <YStack gap="$0.5">
            <Text color="$color9" fontSize="$2">
              {t('progress.totalDebt').toUpperCase()}
            </Text>
            <Text fontSize="$6" fontWeight="700">
              {fmt(totalRemaining)} {currency}
            </Text>
          </YStack>
          <YStack gap="$0.5">
            <Text color="$color9" fontSize="$2">
              {t('progress.totalPaid').toUpperCase()}
            </Text>
            <Text fontSize="$4" fontWeight="600" color="$accent9">
              {fmt(totalPaid)} {currency} ({paidPct}%)
            </Text>
          </YStack>
        </YStack>
      </XStack>
    </YStack>
  );
}

function MilestoneCard({ debt }: { debt: Debt }) {
  const { t } = useTranslation();
  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderLeftWidth={3}
      borderColor="$color4"
      borderLeftColor="$accent7"
      rounded="$6"
      p="$4"
      gap="$2"
    >
      <XStack items="center" gap="$2">
        <Target size={14} color="$accent9" />
        <Text color="$color9" fontSize="$1" letterSpacing={1}>
          {t('progress.nextMilestoneLabel').toUpperCase()}
        </Text>
      </XStack>
      <Paragraph color="$color11">
        {t('progress.nextMilestone', {
          amount: fmt(debt.remainingAmount),
          debt: debt.label,
        })}
      </Paragraph>
    </YStack>
  );
}

function MonthlyComparisonCard({
  thisMonth,
  lastMonth,
}: {
  thisMonth: number;
  lastMonth: number;
}) {
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
        <Text color="$color9" fontSize="$1" letterSpacing={1}>
          {t('progress.monthlyComparison').toUpperCase()}
        </Text>
      </XStack>
      <Separator borderColor="$color3" />

      {hasData ? (
        <YStack px="$4" pt="$3" pb="$2" height={160}>
          <CartesianChart
            data={barData}
            xKey="month"
            yKeys={['amount']}
            domainPadding={{ left: 40, right: 40 }}
            axisOptions={{
              tickCount: { x: 2, y: 4 },
              formatXLabel: (v) => String(v),
              formatYLabel: (v) => `${v}`,
              labelColor: theme.color8.val,
              lineColor: theme.color4.val,
            }}
          >
            {({ points, chartBounds }) => (
              <Bar
                points={points.amount}
                chartBounds={chartBounds}
                color={theme.accent9.val}
                roundedCorners={{ topLeft: 6, topRight: 6 }}
                innerPadding={0.4}
                animate={{ type: 'spring' }}
              />
            )}
          </CartesianChart>
        </YStack>
      ) : (
        <XStack p="$4" justify="center">
          <Text color="$color8" fontSize="$3">
            {fmt(0)} {currency}
          </Text>
        </XStack>
      )}

      {/* Amount labels below chart */}
      <Separator borderColor="$color3" />
      <XStack>
        <YStack flex={1} p="$3" gap="$0.5" items="center">
          <Text color="$color9" fontSize="$1">
            {t('progress.lastMonth')}
          </Text>
          <Text color="$color11" fontSize="$4" fontWeight="600">
            {fmt(lastMonth)} {currency}
          </Text>
        </YStack>
        <Separator vertical borderColor="$color3" />
        <YStack flex={1} p="$3" gap="$0.5" items="center">
          <Text color="$color9" fontSize="$1">
            {t('progress.thisMonth')}
          </Text>
          <Text color="$color11" fontSize="$4" fontWeight="600">
            {fmt(thisMonth)} {currency}
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );
}

function DebtProgressCard({ debt }: { debt: Debt }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const paid = debt.originalAmount - debt.remainingAmount;
  const pct =
    debt.originalAmount > 0
      ? Math.min(100, Math.max(0, (paid / debt.originalAmount) * 100))
      : 0;

  return (
    <YStack bg="$color2" borderWidth={1} borderColor="$color4" rounded="$6" overflow="hidden">
      <YStack p="$4" pb="$3" gap="$2">
        <XStack items="center" justify="space-between">
          <H3 numberOfLines={1} flex={1} mr="$2">
            {debt.label}
          </H3>
          <Badge label={t(`onboarding.debts.types.${debt.type}`)} />
        </XStack>
        <Progress value={pct} size="$2">
          <Progress.Indicator />
        </Progress>
        <XStack gap="$3" items="center">
          {[25, 50, 75].map((milestone) => {
            const reached = pct >= milestone;
            return (
              <XStack key={milestone} items="center" gap="$1">
                <YStack
                  width={6}
                  height={6}
                  rounded="$10"
                  bg={reached ? '$accent9' : '$color5'}
                />
                <Text color={reached ? '$color11' : '$color8'} fontSize="$1">
                  {milestone}%
                </Text>
              </XStack>
            );
          })}
          <Text ml="auto" color="$color11" fontWeight="600">
            {Math.round(pct)}%
          </Text>
        </XStack>
      </YStack>
      <Separator borderColor="$color3" />
      <XStack px="$4" py="$3" justify="space-between" items="center">
        <YStack gap="$0.5">
          <Text color="$color9" fontSize="$2">
            {t('progress.paidSoFar')}
          </Text>
          <Text color="$color11" fontSize="$4" fontWeight="600">
            {fmt(paid)} {currency}
          </Text>
        </YStack>
        <YStack gap="$0.5" items="flex-end">
          <Text color="$color9" fontSize="$2">
            {t('progress.remaining')}
          </Text>
          <Text color="$color11" fontSize="$4">
            {fmt(debt.remainingAmount)} {currency}
          </Text>
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

function EmptyState() {
  const { t } = useTranslation();
  return (
    <YStack flex={1} items="center" justify="center" gap="$4" py="$12">
      <CheckCircle2 size={56} color="$accent9" />
      <Paragraph color="$color9" style={{ textAlign: 'center' }}>
        {t('progress.noDebts')}
      </Paragraph>
    </YStack>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const { t } = useTranslation();
  const debts = useAppStore((s) => s.debts);
  const incomes = useAppStore((s) => s.incomes);

  const activeDebts = debts
    .filter((d) => d.closedAt === null)
    .sort((a, b) => a.remainingAmount - b.remainingAmount);
  const closedDebts = debts.filter((d) => d.closedAt !== null);
  const totalRemaining = activeDebts.reduce(
    (s, d) => s + d.remainingAmount,
    0
  );
  const totalPaid = debts.reduce(
    (s, d) => s + (d.originalAmount - d.remainingAmount),
    0
  );
  const snowballTarget: Debt | null = activeDebts[0] ?? null;

  const now = new Date();
  const thisMonthKey = getMonthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = getMonthKey(lastMonthDate);
  const thisMonthPayments = sumIncomeForMonth(incomes, thisMonthKey);
  const lastMonthPayments = sumIncomeForMonth(incomes, lastMonthKey);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <YStack px="$4" pt="$4" gap="$4">
            <H2>{t('progress.title')}</H2>
            {debts.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <HeroCard
                  totalRemaining={totalRemaining}
                  totalPaid={totalPaid}
                />
                {snowballTarget ? (
                  <MilestoneCard debt={snowballTarget} />
                ) : null}
                <MonthlyComparisonCard
                  thisMonth={thisMonthPayments}
                  lastMonth={lastMonthPayments}
                />
                {activeDebts.length > 0 ? (
                  <YStack gap="$3">
                    <Text
                      color="$color9"
                      fontSize="$1"
                      letterSpacing={1}
                    >
                      {t('progress.debtsSection').toUpperCase()}
                    </Text>
                    {activeDebts.map((debt) => (
                      <DebtProgressCard key={debt.id} debt={debt} />
                    ))}
                  </YStack>
                ) : null}
                {closedDebts.length > 0 ? (
                  <ClosedDebtsRow count={closedDebts.length} />
                ) : null}
              </>
            )}
          </YStack>
        </ScrollView>
        <IncomeFab />
      </SafeAreaView>
    </>
  );
}
