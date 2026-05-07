import {
  AlertTriangle,
  Calendar,
  CalendarRange,
  CheckCircle2,
  Crosshair,
  Plus,
  TrendingDown,
  Trophy,
  Wallet,
} from '@tamagui/lucide-icons-2';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';
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

import { AmountRow } from '@/components/amount-row';
import { Badge } from '@/components/badge';
import { SnowballTargetPicker } from '@/components/snowball-target-picker';
import { forecastDebtClosureDate } from '@/lib/debt-forecast';
import { summarizeAllocation } from '@/lib/allocation-summary';
import { getActiveDebts, getEffectiveSnowballTarget, getMonthKey } from '@/lib/distribution';
import type { SnowballTargetSource } from '@/lib/distribution';
import { formatAmount } from '@/lib/format';
import {
  getDebtCelebration,
  getFreshStartTrigger,
  getRealityCheckTrigger,
} from '@/lib/triggers';
import { useAppStore } from '@/store';
import type { Debt, Income, MonthlyNeeds, RealityCheckResponse } from '@/types/models';

const SOURCE_KEY: Record<SnowballTargetSource, string> = {
  manual: 'home.snowball.targetSourceManual',
  'auto-smallest': 'home.snowball.targetSourceAutoSmallest',
  'auto-no-cc': 'home.snowball.targetSourceAutoNoCc',
  'auto-fallback-cc': 'home.snowball.targetSourceAutoFallbackCc',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const NEED_CATEGORIES: Array<keyof MonthlyNeeds> = ['housing', 'food', 'transport', 'other'];

function sumNeeds(needs: MonthlyNeeds): number {
  return NEED_CATEGORIES.reduce((sum, category) => sum + needs[category], 0);
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

function DebtCelebrationCard({
  debtLabel,
  debtType,
  onDismiss,
}: {
  debtLabel: string;
  debtType: string;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const messageKey =
    debtType === 'credit_card'
      ? 'triggers.celebration.creditCardClosed'
      : 'triggers.celebration.message';
  return (
    <YStack theme="success" bg="$color2" borderWidth={1} borderLeftWidth={3} borderColor="$color5" borderLeftColor="$color9" rounded="$6" p="$4" gap="$3">
      <Text color="$color9" fontSize="$1" letterSpacing={1}>{t('triggers.celebration.title').toUpperCase()}</Text>
      <Paragraph>{t(messageKey, { label: debtLabel })}</Paragraph>
      <Button chromeless size="$3" self="flex-start" onPress={onDismiss}>{t('triggers.celebration.dismiss')}</Button>
    </YStack>
  );
}

// ── Content cards ────────────────────────────────────────────────────────────

function DeferredBanner({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <YStack theme="warning" bg="$color1" borderWidth={1} borderColor="$color5" rounded="$10" px="$3" py="$2">
      <XStack items="center" gap="$2">
        <AlertTriangle size={14} color="$color9" />
        <Paragraph color="$color11" flex={1} fontSize="$2" lineHeight={18} fontWeight="500">{t('home.deferred.pending', { count })}</Paragraph>
      </XStack>
    </YStack>
  );
}

function HeroCard({ totalRemaining, totalPaid }: { totalRemaining: number; totalPaid: number }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const total = totalRemaining + totalPaid;
  const paidPct = total > 0 ? Math.round((totalPaid / total) * 100) : 0;

  return (
    <YStack bg="$color2" borderWidth={1} borderColor="$color4" rounded="$6" p="$4" gap="$3">
      <XStack items="center" justify="space-between" gap="$3">
        <XStack items="center" gap="$2">
          <TrendingDown size={14} color="$color11" />
          <Text color="$color11" fontSize="$1" fontWeight="600" letterSpacing={1}>{t('progress.totalDebt').toUpperCase()}</Text>
        </XStack>
        <Badge label={`${paidPct}%`} variant={paidPct > 0 ? 'accent' : 'muted'} />
      </XStack>

      <YStack gap="$1">
        <Text color="$color12" fontSize="$7" fontWeight="700">{formatAmount(totalRemaining)} {currency}</Text>
        <Text color="$color11" fontSize="$3">
          {t('home.debtSummary.paid', {
            amount: `${formatAmount(totalPaid)} ${currency}`,
          })}
        </Text>
      </YStack>

      <Progress value={paidPct} size="$2">
        <Progress.Indicator bg={paidPct > 0 ? '$accent9' : '$color7'} />
      </Progress>
    </YStack>
  );
}

function SnowballCard({ debt, incomes }: { debt: Debt; incomes: Income[] }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const paid = debt.originalAmount - debt.remainingAmount;
  const progressValue = debt.originalAmount > 0 ? Math.min(100, Math.max(0, (paid / debt.originalAmount) * 100)) : 0;
  const forecast = forecastDebtClosureDate(debt, incomes);
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
            <Crosshair size={14} color="$accent10" />
            <Text color="$accent10" fontSize="$1" fontWeight="600" letterSpacing={1}>{t('home.snowball.target').toUpperCase()}</Text>
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
          <Text color="$color11" fontSize="$3">
            {t('home.snowball.of', { amount: `${formatAmount(debt.originalAmount)} ${currency}` })}
          </Text>
        </XStack>
      </YStack>
      {forecastText ? (
        <>
          <Separator borderColor="$color4" />
          <XStack p="$4" items="center" gap="$2">
            <Calendar size={14} color="$color11" />
            <Text color="$color11" fontSize="$3" fontWeight="500">{forecastText}</Text>
          </XStack>
        </>
      ) : null}
    </YStack>
  );
}

function MonthlyComparisonCard({ thisMonth, lastMonth }: { thisMonth: number; lastMonth: number }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const maxAmount = Math.max(thisMonth, lastMonth, 1);
  const lastMonthPct = (lastMonth / maxAmount) * 100;
  const thisMonthPct = (thisMonth / maxAmount) * 100;

  return (
    <YStack bg="$color2" borderWidth={1} borderColor="$color4" rounded="$6" p="$4" gap="$3">
      <XStack items="center" gap="$2">
        <CalendarRange size={14} color="$color11" />
        <Text color="$color11" fontSize="$1" fontWeight="600" letterSpacing={1}>{t('progress.monthlyComparison').toUpperCase()}</Text>
      </XStack>

      <YStack gap="$3">
        <YStack gap="$1.5">
          <XStack justify="space-between" items="center">
            <Text color="$color11" fontSize="$3">{t('progress.lastMonth')}</Text>
            <Text color="$color11" fontSize="$3" fontWeight="600">{formatAmount(lastMonth)} {currency}</Text>
          </XStack>
          <Progress value={lastMonthPct} size="$1.5">
            <Progress.Indicator bg="$color6" />
          </Progress>
        </YStack>

        <YStack gap="$1.5">
          <XStack justify="space-between" items="center">
            <Text color="$color11" fontSize="$3">{t('progress.thisMonth')}</Text>
            <Text color="$color11" fontSize="$4" fontWeight="700">{formatAmount(thisMonth)} {currency}</Text>
          </XStack>
          <Progress value={thisMonthPct} size="$1.5">
            <Progress.Indicator bg="$accent9" />
          </Progress>
        </YStack>
      </YStack>
    </YStack>
  );
}

function NeedsCoverageCard({
  monthlyNeeds,
  coveredNeeds,
}: {
  monthlyNeeds: MonthlyNeeds;
  coveredNeeds: MonthlyNeeds;
}) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const totalNeeded = sumNeeds(monthlyNeeds);
  const totalCovered = Math.min(sumNeeds(coveredNeeds), totalNeeded);
  const remaining = Math.max(0, totalNeeded - totalCovered);
  const progressValue = totalNeeded > 0 ? Math.min(100, (totalCovered / totalNeeded) * 100) : 0;

  if (totalNeeded <= 0) return null;

  return (
    <YStack bg="$color2" borderWidth={1} borderColor="$color4" rounded="$6" overflow="hidden">
      <YStack p="$4" gap="$3">
        <XStack items="center" justify="space-between" gap="$3">
          <YStack flex={1} gap="$1">
            <Text color="$color11" fontSize="$1" fontWeight="600" letterSpacing={1}>
              {t('home.needsCoverage.title').toUpperCase()}
            </Text>
            <Text color="$color11" fontSize="$6" fontWeight="700">
              {formatAmount(totalCovered)} {currency}
            </Text>
            <Text color="$color11" fontSize="$3">
              {t('home.needsCoverage.coveredOf', {
                total: `${formatAmount(totalNeeded)} ${currency}`,
              })}
            </Text>
          </YStack>
          <Badge label={`${Math.round(progressValue)}%`} variant={progressValue >= 100 ? 'accent' : 'muted'} />
        </XStack>

        <Progress value={progressValue} size="$2">
          <Progress.Indicator bg={progressValue >= 100 ? '$accent9' : '$color9'} />
        </Progress>

        <XStack justify="space-between" items="center">
          <Text color="$color11" fontSize="$3">{t('home.needsCoverage.remaining')}</Text>
          <Text color={remaining > 0 ? '$color11' : '$accent11'} fontSize="$3" fontWeight="600">
            {formatAmount(remaining)} {currency}
          </Text>
        </XStack>
      </YStack>

      <Separator borderColor="$color3" />

      <YStack px="$4" py="$3" gap="$2.5">
        {NEED_CATEGORIES.map((category) => {
          const needed = monthlyNeeds[category];
          const covered = Math.min(coveredNeeds[category], needed);

          if (needed <= 0) return null;

          return (
            <XStack key={category} justify="space-between" items="center" gap="$3">
              <Text color="$color11" fontSize="$3">
                {t(`income.allocate.rows.${category}`)}
              </Text>
              <Text color="$color11" fontSize="$3" fontWeight="500">
                {formatAmount(covered)} / {formatAmount(needed)} {currency}
              </Text>
            </XStack>
          );
        })}
      </YStack>
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
          <Text color="$color11" fontSize="$2">{t('progress.paidSoFar')}</Text>
          <Text color="$color11" fontSize="$4" fontWeight="600">{formatAmount(paid)} {currency}</Text>
        </YStack>
        <YStack gap="$0.5" items="flex-end">
          <Text color="$color11" fontSize="$2">{t('progress.remaining')}</Text>
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
  const summary = summarizeAllocation(income.allocation);
  const dateStr = new Date(income.date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });

  return (
    <YStack bg="$color2" borderWidth={1} borderColor="$color4" rounded="$6" overflow="hidden">
      <YStack p="$4" pb="$3">
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <Wallet size={14} color="$color11" />
            <Text color="$color11" fontSize="$1" fontWeight="600" letterSpacing={1}>{t('home.lastDistribution.title').toUpperCase()}</Text>
          </XStack>
          <Text color="$color11" fontSize="$2" fontWeight="500">{dateStr}</Text>
        </XStack>
        <Text color="$color12" fontSize="$6" fontWeight="700" mt="$1">{formatAmount(income.amount)} {currency}</Text>
      </YStack>
      <Separator borderColor="$color3" />
      <YStack px="$4" py="$3" gap="$2">
        {summary.needs > 0 && (
          <AmountRow
            label={t('home.lastDistribution.needs')}
            amount={summary.needs}
            currency={currency}
            compact
            labelMuted
          />
        )}
        {summary.minimums > 0 && (
          <AmountRow
            label={t('home.lastDistribution.minimums')}
            amount={summary.minimums}
            currency={currency}
            compact
            labelMuted
          />
        )}
        {summary.extra > 0 && (
          <AmountRow
            label={t('home.lastDistribution.extra')}
            amount={summary.extra}
            currency={currency}
            accent
            compact
            labelMuted
            amountPrefix="+"
          />
        )}
        {summary.unallocated > 0 && (
          <AmountRow
            label={t('home.lastDistribution.unallocated')}
            amount={summary.unallocated}
            currency={currency}
            compact
            labelMuted
          />
        )}
      </YStack>
    </YStack>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { t } = useTranslation();

  const router = useRouter();
  const debts = useAppStore((s) => s.debts);
  const incomes = useAppStore((s) => s.incomes);
  const monthlyNeeds = useAppStore((s) => s.monthlyNeeds);
  const monthlyCoverage = useAppStore((s) => s.monthlyCoverage);
  const deferredPayments = useAppStore((s) => s.deferredPayments);
  const installationDate = useAppStore((s) => s.installationDate);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const lastRealityCheckAt = settings.lastRealityCheckAt;
  const lastCelebrationDebtId = useAppStore((s) => s.settings.lastCelebrationDebtId);

  const [dismissedRC, setDismissedRC] = useState(false);
  const [dismissedFS, setDismissedFS] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeDebts = getActiveDebts(debts).sort((a, b) => a.remainingAmount - b.remainingAmount);
  const closedDebts = debts.filter((d) => d.closedAt !== null);
  const { debt: snowballTarget, source: targetSource } = getEffectiveSnowballTarget(activeDebts, settings);
  const recentIncome = getRecentIncome(incomes);
  const pendingDeferred = deferredPayments.filter((p) => !p.resolved);

  const totalRemaining = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);
  const totalPaid = debts.reduce((s, d) => s + (d.originalAmount - d.remainingAmount), 0);

  const now = new Date();
  const thisMonthKey = getMonthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = getMonthKey(lastMonthDate);
  const thisMonthCoverage = monthlyCoverage.find((coverage) => coverage.month === thisMonthKey);
  const coveredNeeds = thisMonthCoverage?.needs ?? { housing: 0, food: 0, transport: 0, other: 0 };
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
    () => getDebtCelebration(debts.map((d) => ({ label: d.label, type: d.type, closedAt: d.closedAt })), lastCelebrationDebtId),
    [debts, lastCelebrationDebtId],
  );

  useEffect(() => {
    if (!debtCelebration?.shouldShow) return;
    useAppStore.getState().updateSettings({
      lastCelebrationDebtId: debtCelebration.debtLabel,
    });
    router.push({
      pathname: '/celebration',
      params: { debtLabel: debtCelebration.debtLabel, debtType: debtCelebration.debtType },
    });
  }, [debtCelebration?.shouldShow, debtCelebration?.debtLabel, debtCelebration?.debtType, router]);

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

  function handleNewIncome() {
    router.push('/income/new');
  }

  const showRealityCheck = realityCheckTrigger.shouldShow && !dismissedRC;
  const showFreshStart = freshStartTrigger.shouldShow && !dismissedFS;
  const hasDebts = debts.length > 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <YStack px="$4" pt="$4" gap="$4">
            {/* Greeting */}
            <XStack items="center" justify="space-between" gap="$3">
              <H2 flex={1} fontSize="$8" lineHeight={40}>{t('home.greeting')}</H2>
              <Button
                circular
                size="$4"
                theme="accent"
                icon={<Plus size={20} />}
                accessibilityLabel={t('home.cta.receivedMoney')}
                onPress={handleNewIncome}
              />
            </XStack>

            {/* Deferred warning */}
            {pendingDeferred.length > 0 && <DeferredBanner count={pendingDeferred.length} />}

            {/* Trigger cards */}
            {showFreshStart && <FreshStartCard messageKey={freshStartTrigger.messageKey} onDismiss={() => setDismissedFS(true)} />}
            {showRealityCheck && <RealityCheckCard questionKey={realityCheckTrigger.questionKey} onAnswer={handleRealityCheckAnswer} />}

            {/* Needs coverage */}
            <NeedsCoverageCard monthlyNeeds={monthlyNeeds} coveredNeeds={coveredNeeds} />

            {/* Hero donut — total debt overview */}
            {hasDebts && <HeroCard totalRemaining={totalRemaining} totalPaid={totalPaid} />}

            {/* Snowball target */}
            {snowballTarget ? (
              <YStack gap="$2">
                <SnowballCard debt={snowballTarget} incomes={incomes} />
                <YStack px="$1" gap="$1">
                  <Text color="$color11" fontSize="$2" lineHeight={18}>
                    {t(SOURCE_KEY[targetSource])}
                  </Text>
                  <Pressable onPress={() => setPickerOpen(true)} hitSlop={8}>
                    <Text color="$accent11" fontSize="$2" fontWeight="600">
                      {t('debts.targetPicker.pickAnother')}
                    </Text>
                  </Pressable>
                </YStack>
              </YStack>
            ) : (
              <YStack bg="$color2" rounded="$6" p="$5" items="center" gap="$3">
                <CheckCircle2 size={40} color="$accent9" />
                <Text color="$color9">{t('home.snowball.noDebts')}</Text>
              </YStack>
            )}

            <SnowballTargetPicker
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              debts={activeDebts}
              currentOverride={settings.snowballTargetOverride}
              effectiveTargetId={snowballTarget?.id ?? null}
              onSelect={(debtId) => {
                updateSettings({ snowballTargetOverride: debtId });
                setPickerOpen(false);
              }}
            />

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
      </SafeAreaView>
    </>
  );
}
