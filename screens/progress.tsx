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
  Separator } from 'tamagui';
import { TrendingDown, Trophy, Target, CheckCircle2 } from '@tamagui/lucide-icons-2';

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

function HeroCard({ totalRemaining, totalPaid }: { totalRemaining: number; totalPaid: number }) {
  const { t } = useTranslation();
  return (
    <YStack borderWidth={1} rounded="$6" overflow="hidden">
      <YStack p="$4" gap="$1">
        <XStack items="center" gap="$2" mb="$1">
          <TrendingDown size={16} />
          <Text letterSpacing={1}>
            {t('progress.totalDebt').toUpperCase()}
          </Text>
        </XStack>
        <Text lineHeight={48}>
          {fmt(totalRemaining)} zł
        </Text>
      </YStack>
      <Separator />
      <YStack p="$4" gap="$1">
        <Text letterSpacing={1}>
          {t('progress.totalPaid').toUpperCase()}
        </Text>
        <Text>
          {fmt(totalPaid)} zł
        </Text>
      </YStack>
    </YStack>
  );
}

function MilestoneCard({ debt }: { debt: Debt }) {
  const { t } = useTranslation();
  return (
    <YStack borderWidth={1} rounded="$6" p="$4" gap="$2">
      <XStack items="center" gap="$2">
        <Target size={16} />
        <Text letterSpacing={1}>
          {t('progress.nextMilestoneLabel').toUpperCase()}
        </Text>
      </XStack>
      <Paragraph lineHeight={22}>
        {t('progress.nextMilestone', { amount: fmt(debt.remainingAmount), debt: debt.label })}
      </Paragraph>
    </YStack>
  );
}

function MonthlyComparisonCard({ thisMonth, lastMonth }: { thisMonth: number; lastMonth: number }) {
  const { t } = useTranslation();
  return (
    <YStack borderWidth={1} rounded="$6" overflow="hidden">
      <YStack px="$4" pt="$4" pb="$3">
        <Text letterSpacing={1}>
          {t('progress.monthlyComparison').toUpperCase()}
        </Text>
      </YStack>
      <Separator />
      <XStack>
        <YStack flex={1} p="$4" gap="$1">
          <Text>
            {t('progress.thisMonth')}
          </Text>
          <Text>
            {fmt(thisMonth)} zł
          </Text>
        </YStack>
        <YStack width={1} />
        <YStack flex={1} p="$4" gap="$1">
          <Text>
            {t('progress.lastMonth')}
          </Text>
          <Text>
            {fmt(lastMonth)} zł
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );
}

function DebtProgressCard({ debt }: { debt: Debt }) {
  const { t } = useTranslation();
  const paid = debt.originalAmount - debt.remainingAmount;
  const pct = debt.originalAmount > 0 ? Math.min(100, Math.max(0, (paid / debt.originalAmount) * 100)) : 0;
  const milestone25 = pct >= 25;
  const milestone50 = pct >= 50;
  const milestone75 = pct >= 75;

  return (
    <YStack borderWidth={1} rounded="$6" overflow="hidden">
      <YStack p="$4" pb="$3" gap="$2">
        <XStack items="center" justify="space-between">
          <H3 numberOfLines={1} flex={1} mr="$2">
            {debt.label}
          </H3>
          <YStack rounded="$3" px="$2" py="$1">
            <Text>
              {t(`onboarding.debts.types.${debt.type}`)}
            </Text>
          </YStack>
        </XStack>
        <Progress value={pct} size="$2">
          <Progress.Indicator />
        </Progress>
        <XStack gap="$3" items="center">
          {[
            { reached: milestone25, label: t('progress.milestone25') },
            { reached: milestone50, label: t('progress.milestone50') },
            { reached: milestone75, label: t('progress.milestone75') },
          ].map(({ reached, label }) => (
            <XStack key={label} items="center" gap="$1">
              <YStack
                width={6}
                height={6}
                rounded="$10"
              />
              <Text>
                {label}
              </Text>
            </XStack>
          ))}
          <Text ml="auto">
            {Math.round(pct)}%
          </Text>
        </XStack>
      </YStack>
      <Separator />
      <XStack px="$4" py="$3" justify="space-between" items="center">
        <YStack gap="$0.5">
          <Text>{t('progress.paidSoFar')}</Text>
          <Text>{fmt(paid)} zł</Text>
        </YStack>
        <YStack gap="$0.5" items="flex-end">
          <Text>{t('progress.remaining')}</Text>
          <Text>{fmt(debt.remainingAmount)} zł</Text>
        </YStack>
      </XStack>
    </YStack>
  );
}

function ClosedDebtsRow({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <YStack borderWidth={1} rounded="$6" p="$4">
      <XStack items="center" gap="$3">
        <Trophy size={20} />
        <Text>
          {t('progress.closedDebts', { count })}
        </Text>
      </XStack>
    </YStack>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <YStack flex={1} items="center" justify="center" gap="$4" py="$12">
      <CheckCircle2 size={56} />
      <Paragraph style={{ textAlign: 'center' }}>
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

  const activeDebts = debts.filter((d) => d.closedAt === null).sort((a, b) => a.remainingAmount - b.remainingAmount);
  const closedDebts = debts.filter((d) => d.closedAt !== null);
  const totalRemaining = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);
  const totalPaid = debts.reduce((s, d) => s + (d.originalAmount - d.remainingAmount), 0);
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
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <YStack px="$4" pt="$4" gap="$4">
            <H2>
              {t('progress.title')}
            </H2>
            {debts.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <HeroCard totalRemaining={totalRemaining} totalPaid={totalPaid} />
                {snowballTarget ? <MilestoneCard debt={snowballTarget} /> : null}
                <MonthlyComparisonCard thisMonth={thisMonthPayments} lastMonth={lastMonthPayments} />
                {activeDebts.length > 0 ? (
                  <YStack gap="$3">
                    <Text letterSpacing={1}>
                      {t('progress.debtsSection').toUpperCase()}
                    </Text>
                    {activeDebts.map((debt) => (
                      <DebtProgressCard key={debt.id} debt={debt} />
                    ))}
                  </YStack>
                ) : null}
                {closedDebts.length > 0 ? <ClosedDebtsRow count={closedDebts.length} /> : null}
              </>
            )}
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
