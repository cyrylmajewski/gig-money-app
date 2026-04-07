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
} from 'tamagui';
import { TrendingDown, Trophy, Target, CheckCircle2 } from 'lucide-react-native';

import { useAppStore } from '@/store';
import type { Debt, Income } from '@/types/models';

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
  gold: '#FBBF24',
} as const;

function fmt(amount: number): string {
  return amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function sumDebtPaymentsForMonth(incomes: Income[], monthKey: string): number {
  let total = 0;
  for (const income of incomes) {
    if (getMonthKey(new Date(income.date)) !== monthKey) continue;
    const mins = Object.values(income.allocation.minimumPayments).reduce((s, v) => s + v, 0);
    const extra = income.allocation.extraDebtPayment?.amount ?? 0;
    total += mins + extra;
  }
  return total;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HeroCard({ totalRemaining, totalPaid }: { totalRemaining: number; totalPaid: number }) {
  const { t } = useTranslation();
  return (
    <YStack bg={C.card} borderWidth={1} borderColor={C.border} rounded="$6" overflow="hidden">
      <YStack p="$4" gap="$1">
        <XStack items="center" gap="$2" mb="$1">
          <TrendingDown size={16} color={C.muted} />
          <Text fontFamily="$body" fontSize="$2" color={C.muted} fontWeight="600" letterSpacing={1}>
            {t('progress.totalDebt').toUpperCase()}
          </Text>
        </XStack>
        <Text fontFamily="$body" fontSize="$9" fontWeight="800" color={C.text} lineHeight={48}>
          {fmt(totalRemaining)} zł
        </Text>
      </YStack>
      <Separator borderColor={C.border} />
      <YStack p="$4" gap="$1">
        <Text fontFamily="$body" fontSize="$2" color={C.muted} fontWeight="600" letterSpacing={1}>
          {t('progress.totalPaid').toUpperCase()}
        </Text>
        <Text fontFamily="$body" fontSize="$5" fontWeight="700" color={C.accent}>
          {fmt(totalPaid)} zł
        </Text>
      </YStack>
    </YStack>
  );
}

function MilestoneCard({ debt }: { debt: Debt }) {
  const { t } = useTranslation();
  return (
    <YStack bg={C.card} borderWidth={1} borderColor={C.border} rounded="$6" p="$4" gap="$2">
      <XStack items="center" gap="$2">
        <Target size={16} color={C.gold} />
        <Text fontFamily="$body" fontSize="$2" color={C.gold} fontWeight="600" letterSpacing={1}>
          {t('progress.nextMilestoneLabel').toUpperCase()}
        </Text>
      </XStack>
      <Paragraph fontFamily="$body" fontSize="$4" color={C.text} fontWeight="600" lineHeight={22}>
        {t('progress.nextMilestone', { amount: fmt(debt.remainingAmount), debt: debt.label })}
      </Paragraph>
    </YStack>
  );
}

function MonthlyComparisonCard({ thisMonth, lastMonth }: { thisMonth: number; lastMonth: number }) {
  const { t } = useTranslation();
  const improved = thisMonth >= lastMonth;
  return (
    <YStack bg={C.card} borderWidth={1} borderColor={C.border} rounded="$6" overflow="hidden">
      <YStack px="$4" pt="$4" pb="$3">
        <Text fontFamily="$body" fontSize="$2" color={C.muted} fontWeight="600" letterSpacing={1}>
          {t('progress.monthlyComparison').toUpperCase()}
        </Text>
      </YStack>
      <Separator borderColor={C.border} />
      <XStack>
        <YStack flex={1} p="$4" gap="$1">
          <Text fontFamily="$body" fontSize="$2" color={C.muted}>
            {t('progress.thisMonth')}
          </Text>
          <Text fontFamily="$body" fontSize="$5" fontWeight="700" color={improved && thisMonth > 0 ? C.accent : C.text}>
            {fmt(thisMonth)} zł
          </Text>
        </YStack>
        <YStack width={1} bg={C.border} />
        <YStack flex={1} p="$4" gap="$1">
          <Text fontFamily="$body" fontSize="$2" color={C.muted}>
            {t('progress.lastMonth')}
          </Text>
          <Text fontFamily="$body" fontSize="$5" fontWeight="700" color={C.textSec}>
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
    <YStack bg={C.card} borderWidth={1} borderColor={C.border} rounded="$6" overflow="hidden">
      <YStack p="$4" pb="$3" gap="$2">
        <XStack items="center" justify="space-between">
          <H3 fontFamily="$body" fontWeight="700" color={C.text} numberOfLines={1} flex={1} mr="$2">
            {debt.label}
          </H3>
          <YStack bg={C.border} rounded="$3" px="$2" py="$1">
            <Text fontFamily="$body" fontSize="$1" color={C.muted} fontWeight="600">
              {t(`onboarding.debts.types.${debt.type}`)}
            </Text>
          </YStack>
        </XStack>
        <Progress value={pct} size="$2" bg={C.border}>
          <Progress.Indicator bg={C.accent} />
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
                bg={reached ? C.accent : C.border}
              />
              <Text fontFamily="$body" fontSize="$1" color={reached ? C.accent : C.muted}>
                {label}
              </Text>
            </XStack>
          ))}
          <Text fontFamily="$body" fontSize="$1" color={C.muted} ml="auto">
            {Math.round(pct)}%
          </Text>
        </XStack>
      </YStack>
      <Separator borderColor={C.border} />
      <XStack px="$4" py="$3" justify="space-between" items="center">
        <YStack gap="$0.5">
          <Text fontFamily="$body" fontSize="$1" color={C.muted}>{t('progress.paidSoFar')}</Text>
          <Text fontFamily="$body" fontSize="$3" fontWeight="700" color={C.accent}>{fmt(paid)} zł</Text>
        </YStack>
        <YStack gap="$0.5" items="flex-end">
          <Text fontFamily="$body" fontSize="$1" color={C.muted}>{t('progress.remaining')}</Text>
          <Text fontFamily="$body" fontSize="$3" fontWeight="700" color={C.text}>{fmt(debt.remainingAmount)} zł</Text>
        </YStack>
      </XStack>
    </YStack>
  );
}

function ClosedDebtsRow({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <YStack bg={C.card} borderWidth={1} borderColor={C.border} rounded="$6" p="$4">
      <XStack items="center" gap="$3">
        <Trophy size={20} color={C.gold} />
        <Text fontFamily="$body" fontSize="$4" fontWeight="600" color={C.text}>
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
      <CheckCircle2 size={56} color={C.accent} />
      <Paragraph fontFamily="$body" fontSize="$5" fontWeight="700" color={C.text} style={{ textAlign: 'center' }}>
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
  const thisMonthPayments = sumDebtPaymentsForMonth(incomes, thisMonthKey);
  const lastMonthPayments = sumDebtPaymentsForMonth(incomes, lastMonthKey);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <YStack px="$4" pt="$4" gap="$4">
            <H2 fontFamily="$body" fontWeight="800" color={C.text}>
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
                    <Text fontFamily="$body" fontSize="$2" color={C.muted} fontWeight="600" letterSpacing={1}>
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
