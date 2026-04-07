import { useTranslation } from 'react-i18next';
import { useRouter, Stack } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  YStack,
  XStack,
  Text,
  H2,
  H3,
  Paragraph,
  Button,
  Progress,
  Separator,
} from 'tamagui';

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

function getActiveDebts(debts: Debt[]): Debt[] {
  return debts
    .filter((d) => d.closedAt === null)
    .sort((a, b) => a.remainingAmount - b.remainingAmount);
}

function forecastClosureDate(
  debt: Debt,
  incomes: Income[],
): { date: Date; approximate: boolean } | null {
  if (debt.remainingAmount <= 0) return null;
  const extraPayments = incomes
    .filter(
      (i) =>
        i.allocation.extraDebtPayment?.debtId === debt.id &&
        (i.allocation.extraDebtPayment?.amount ?? 0) > 0,
    )
    .map((i) => i.allocation.extraDebtPayment!.amount);
  const minPayments = incomes
    .filter((i) => (i.allocation.minimumPayments[debt.id] ?? 0) > 0)
    .map((i) => i.allocation.minimumPayments[debt.id]!);
  const allPayments = [...extraPayments, ...minPayments];
  let monthlyPayment: number;
  const approximate = allPayments.length < 4;
  if (allPayments.length > 0) {
    monthlyPayment = allPayments.reduce((s, v) => s + v, 0) / allPayments.length;
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
      maximumFractionDigits: 0,
    }).format(amount) + ' zł'
  );
}

function getRecentIncome(incomes: Income[]): Income | null {
  if (incomes.length === 0) return null;
  const sorted = [...incomes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const latest = sorted[0]!;
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return new Date(latest.date).getTime() >= sevenDaysAgo ? latest : null;
}

// ── Sub-components ───────────────────────────────────────────────────────────

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
    <YStack bg={C.card} borderWidth={1} borderColor={C.border} rounded="$6" overflow="hidden">
      <YStack p="$4">
        <XStack items="center" justify="space-between" mb="$2">
          <Text fontFamily="$body" fontSize="$2" color={C.muted} fontWeight="600" letterSpacing={1}>
            {t('home.snowball.target').toUpperCase()}
          </Text>
          <Text fontFamily="$body" fontSize="$2" color={C.muted}>
            {Math.round(progressValue)}%
          </Text>
        </XStack>
        <H3 fontFamily="$body" fontWeight="700" color={C.text} numberOfLines={1}>
          {debt.label}
        </H3>
      </YStack>
      <YStack px="$4" pb="$2" gap="$3">
        <Progress value={progressValue} size="$2" bg={C.border}>
          <Progress.Indicator bg={C.accent} />
        </Progress>
        <XStack justify="space-between" items="center">
          <Text fontFamily="$body" fontSize="$3" color={C.textSec}>
            {t('home.snowball.remaining', { amount: formatPLN(debt.remainingAmount) })}
          </Text>
          <Text fontFamily="$body" fontSize="$3" color={C.muted}>
            {t('home.snowball.of', { amount: formatPLN(debt.originalAmount) })}
          </Text>
        </XStack>
      </YStack>
      {forecastText ? (
        <YStack p="$4" pt="$3">
          <Paragraph fontFamily="$body" fontSize="$2" color={C.muted}>
            {forecastText}
          </Paragraph>
        </YStack>
      ) : null}
    </YStack>
  );
}

function LastDistributionCard({ income }: { income: Income }) {
  const { t } = useTranslation();
  const alloc = income.allocation;
  const totalNeeds = Object.values(alloc.needs).reduce((s, v) => s + v, 0);
  const totalMinimums = Object.values(alloc.minimumPayments).reduce((s, v) => s + v, 0);
  const extra = alloc.extraDebtPayment?.amount ?? 0;
  const dateStr = new Date(income.date).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <YStack bg={C.card} borderWidth={1} borderColor={C.border} rounded="$6">
      <YStack p="$4" pb="$3">
        <XStack items="center" justify="space-between">
          <Text fontFamily="$body" fontSize="$2" color={C.muted} fontWeight="600" letterSpacing={1}>
            {t('home.lastDistribution.title').toUpperCase()}
          </Text>
          <Text fontFamily="$body" fontSize="$2" color={C.muted}>
            {dateStr}
          </Text>
        </XStack>
        <Text fontFamily="$body" fontSize="$5" fontWeight="700" color={C.text} mt="$1">
          {formatPLN(income.amount)}
        </Text>
      </YStack>
      <Separator borderColor={C.border} />
      <YStack px="$4" py="$3" gap="$2">
        {totalNeeds > 0 ? (
          <XStack justify="space-between">
            <Text fontFamily="$body" fontSize="$3" color={C.textSec}>{t('home.lastDistribution.needs')}</Text>
            <Text fontFamily="$body" fontSize="$3" fontWeight="600" color={C.text}>{formatPLN(totalNeeds)}</Text>
          </XStack>
        ) : null}
        {totalMinimums > 0 ? (
          <XStack justify="space-between">
            <Text fontFamily="$body" fontSize="$3" color={C.textSec}>{t('home.lastDistribution.minimums')}</Text>
            <Text fontFamily="$body" fontSize="$3" fontWeight="600" color={C.text}>{formatPLN(totalMinimums)}</Text>
          </XStack>
        ) : null}
        {extra > 0 ? (
          <XStack justify="space-between">
            <Text fontFamily="$body" fontSize="$3" color={C.textSec}>{t('home.lastDistribution.extra')}</Text>
            <Text fontFamily="$body" fontSize="$3" fontWeight="700" color={C.accent}>+{formatPLN(extra)}</Text>
          </XStack>
        ) : null}
        {alloc.unallocated > 0 ? (
          <XStack justify="space-between">
            <Text fontFamily="$body" fontSize="$3" color={C.textSec}>{t('home.lastDistribution.shortfall')}</Text>
            <Text fontFamily="$body" fontSize="$3" fontWeight="700" color={C.error}>-{formatPLN(alloc.unallocated)}</Text>
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

  const activeDebts = getActiveDebts(debts);
  const snowballTarget = activeDebts[0] ?? null;
  const recentIncome = getRecentIncome(incomes);
  const pendingDeferred = deferredPayments.filter((p) => !p.resolved);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack px="$4" pt={insets.top + 16} gap="$5">
          <YStack gap="$1">
            <H2 fontFamily="$body" fontWeight="800" color={C.text}>{t('home.greeting')}</H2>
            {pendingDeferred.length > 0 ? (
              <Paragraph fontFamily="$body" fontSize="$3" color={C.gold}>
                {t('home.deferred.pending', { count: pendingDeferred.length })}
              </Paragraph>
            ) : null}
          </YStack>

          {snowballTarget ? (
            <SnowballCard debt={snowballTarget} incomes={incomes} />
          ) : (
            <YStack bg={C.card} borderWidth={1} borderColor={C.border} rounded="$6" p="$4">
              <Paragraph fontFamily="$body" color={C.textSec}>{t('home.snowball.noDebts')}</Paragraph>
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
        bg={C.bg}
        borderTopWidth={1}
        borderTopColor={C.border}
      >
        <Button
          size="$5"
          bg={C.accent}
          pressStyle={{ bg: C.accentPress }}
          onPress={() => router.push('/income/new')}
        >
          <Text fontFamily="$body" color={C.bg} fontWeight="700">{t('home.cta.receivedMoney')}</Text>
        </Button>
      </YStack>
    </>
  );
}
