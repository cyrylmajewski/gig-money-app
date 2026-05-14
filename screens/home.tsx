import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Crosshair,
  Plus,
  Trophy,
  Wallet,
} from '@tamagui/lucide-icons-2';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';
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
  YStack,
} from 'tamagui';

import { AmountRow } from '@/components/amount-row';
import { SnowballTargetPicker } from '@/components/snowball-target-picker';
import { TopSafeAreaScrim } from '@/components/top-safe-area-scrim';
import { summarizeAllocation } from '@/lib/allocation-summary';
import { forecastDebtClosureDate } from '@/lib/debt-forecast';
import type { SnowballTargetSource } from '@/lib/distribution';
import { formatAmount } from '@/lib/format';
import { buildHomeSummary } from '@/lib/home-summary';
import {
  getDebtCelebration,
  getFreshStartTrigger,
  getRealityCheckTrigger,
} from '@/lib/triggers';
import { useAppStore } from '@/store';
import type {
  Debt,
  Income,
  MonthlyNeeds,
  RealityCheckResponse,
} from '@/types/models';

const SOURCE_KEY: Record<SnowballTargetSource, string> = {
  manual: 'home.snowball.targetSourceManual',
  'auto-smallest': 'home.snowball.targetSourceAutoSmallest',
  'auto-no-cc': 'home.snowball.targetSourceAutoNoCc',
  'auto-fallback-cc': 'home.snowball.targetSourceAutoFallbackCc',
};

function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' });
}

const NEED_CATEGORIES: Array<keyof MonthlyNeeds> = [
  'housing',
  'food',
  'transport',
  'other',
];

function sumNeeds(needs: MonthlyNeeds): number {
  return NEED_CATEGORIES.reduce((sum, category) => sum + needs[category], 0);
}

function sumCoveredNeeds(
  monthlyNeeds: MonthlyNeeds,
  coveredNeeds: MonthlyNeeds
): number {
  return NEED_CATEGORIES.reduce(
    (sum, category) =>
      sum + Math.min(coveredNeeds[category], monthlyNeeds[category]),
    0
  );
}

function getProgressPercent(current: number, total: number): number {
  if (total <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
}

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
        <Button
          variant="outlined"
          size="$3"
          flex={1}
          onPress={() => onAnswer('yes')}
        >
          {t('triggers.realityCheck.yes')}
        </Button>
        <Button
          variant="outlined"
          size="$3"
          flex={1}
          onPress={() => onAnswer('barely')}
        >
          {t('triggers.realityCheck.barely')}
        </Button>
        <Button
          variant="outlined"
          size="$3"
          flex={1}
          onPress={() => onAnswer('no')}
        >
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
      <Paragraph>{t(messageKey, { label: debtLabel })}</Paragraph>
      <Button chromeless size="$3" self="flex-start" onPress={onDismiss}>
        {t('triggers.celebration.dismiss')}
      </Button>
    </YStack>
  );
}

function DeferredBanner({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <YStack
      theme="warning"
      bg="$color1"
      borderWidth={1}
      borderColor="$color5"
      rounded="$10"
      px="$3"
      py="$2"
    >
      <XStack items="center" gap="$2">
        <AlertTriangle size={14} color="$color9" />
        <Paragraph
          color="$color11"
          flex={1}
          fontSize="$2"
          lineHeight={18}
          fontWeight="500"
        >
          {t('home.deferred.pending', { count })}
        </Paragraph>
      </XStack>
    </YStack>
  );
}

function ActionStatusCard({
  remainingNeeds,
  debt,
  onNewIncome,
}: {
  remainingNeeds: number;
  debt: Debt | null;
  onNewIncome: () => void;
}) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const needsFirst = remainingNeeds > 0;
  const done = !needsFirst && !debt;
  const title = needsFirst
    ? t('home.action.needsFirstTitle')
    : debt
      ? t('home.action.debtNextTitle')
      : t('home.action.doneTitle');
  const body = needsFirst
    ? t('home.action.needsFirstBody', {
        amount: `${formatAmount(remainingNeeds)} ${currency}`,
      })
    : debt
      ? t('home.action.debtNextBody', {
          debtLabel: debt.label,
          amount: `${formatAmount(debt.remainingAmount)} ${currency}`,
        })
      : t('home.action.doneBody');

  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderColor={done ? '$accent5' : '$color4'}
      borderLeftWidth={3}
      borderLeftColor={done ? '$accent9' : needsFirst ? '$yellow9' : '$accent9'}
      rounded="$6"
      p="$4"
      gap="$4"
    >
      <XStack items="center" gap="$2">
        {done ? (
          <CheckCircle2 size={16} color="$accent10" />
        ) : needsFirst ? (
          <AlertTriangle size={16} color="$yellow10" />
        ) : (
          <Crosshair size={16} color="$accent10" />
        )}
        <Text color="$color11" fontSize="$1" fontWeight="600" letterSpacing={1}>
          {t('home.action.eyebrow').toUpperCase()}
        </Text>
      </XStack>

      <YStack gap="$2">
        <H3 fontSize="$7" lineHeight={30}>
          {title}
        </H3>
        <Paragraph color="$color11" fontSize="$3" lineHeight={22}>
          {body}
        </Paragraph>
      </YStack>

      <Button
        theme="accent"
        size="$4"
        icon={<Plus size={18} />}
        onPress={onNewIncome}
      >
        {t('home.action.cta')}
      </Button>
    </YStack>
  );
}

function ProgressMetricCard({
  label,
  value,
  detail,
  progressValue,
}: {
  label: string;
  value: string;
  detail: string;
  progressValue?: number;
}) {
  return (
    <YStack
      flex={1}
      bg="$color2"
      borderWidth={1}
      borderColor="$color4"
      rounded="$6"
      p="$3"
      gap="$2"
      minH={116}
    >
      <Text color="$color9" fontSize="$1" fontWeight="600" letterSpacing={1}>
        {label.toUpperCase()}
      </Text>
      <Text color="$color12" fontSize="$6" fontWeight="700">
        {value}
      </Text>
      <Text color="$color11" fontSize="$2" lineHeight={18}>
        {detail}
      </Text>
      {progressValue !== undefined ? (
        <Progress value={progressValue} size="$1.5" mt="auto">
          <Progress.Indicator bg="$accent9" />
        </Progress>
      ) : null}
    </YStack>
  );
}

function ProgressOverviewCard({
  totalNeeded,
  totalCovered,
  needsPct,
  totalRemaining,
  totalPaid,
}: {
  totalNeeded: number;
  totalCovered: number;
  needsPct: number;
  totalRemaining: number;
  totalPaid: number;
}) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const debtTotal = totalRemaining + totalPaid;
  const debtPct = getProgressPercent(totalPaid, debtTotal);

  return (
    <XStack gap="$3">
      <ProgressMetricCard
        label={t('home.progress.needs')}
        value={`${needsPct}%`}
        detail={t('home.progress.needsDetail', {
          covered: `${formatAmount(totalCovered)} ${currency}`,
          total: `${formatAmount(totalNeeded)} ${currency}`,
        })}
        progressValue={needsPct}
      />
      <ProgressMetricCard
        label={t('home.progress.debt')}
        value={
          debtTotal > 0 ? `${debtPct}%` : `${formatAmount(0)} ${currency}`
        }
        detail={
          debtTotal > 0
            ? t('home.progress.debtDetail', {
                amount: `${formatAmount(totalRemaining)} ${currency}`,
              })
            : t('home.progress.noDebt')
        }
        progressValue={debtTotal > 0 ? debtPct : undefined}
      />
    </XStack>
  );
}

function FocusDebtCard({
  debt,
  incomes,
  source,
  onPickAnother,
}: {
  debt: Debt;
  incomes: Income[];
  source: SnowballTargetSource;
  onPickAnother: () => void;
}) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const forecast = forecastDebtClosureDate(debt, incomes);
  let forecastText: string | null = null;
  if (forecast) {
    const dateStr = formatMonthYear(forecast.date);
    forecastText = forecast.approximate
      ? t('home.snowball.forecastApprox', { date: dateStr })
      : t('home.snowball.forecast', { date: dateStr });
  }

  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderColor="$color4"
      rounded="$6"
      p="$3"
      gap="$2.5"
    >
      <XStack items="center" justify="space-between" gap="$3">
        <XStack items="center" gap="$2">
          <Crosshair size={13} color="$accent10" />
          <Text
            color="$accent10"
            fontSize="$1"
            fontWeight="600"
            letterSpacing={1}
          >
            {t('home.snowball.target').toUpperCase()}
          </Text>
        </XStack>
        <Pressable onPress={onPickAnother} hitSlop={8}>
          <Text color="$accent11" fontSize="$2" fontWeight="600">
            {t('debts.targetPicker.pickAnother')}
          </Text>
        </Pressable>
      </XStack>

      <XStack items="baseline" justify="space-between" gap="$3">
        <Text color="$color12" flex={1} fontSize="$5" fontWeight="700">
          {debt.label}
        </Text>
        <Text color="$color11" fontSize="$3" fontWeight="600">
          {t('home.snowball.remaining', {
            amount: `${formatAmount(debt.remainingAmount)} ${currency}`,
          })}
        </Text>
      </XStack>

      {forecastText ? (
        <XStack items="center" gap="$2">
          <Calendar size={13} color="$color9" />
          <Text color="$color11" fontSize="$2" lineHeight={18} flex={1}>
            {forecastText}
          </Text>
        </XStack>
      ) : null}

      <Text color="$color9" fontSize="$2" lineHeight={18}>
        {t(SOURCE_KEY[source])}
      </Text>
    </YStack>
  );
}

function ClosedDebtsRow({ count }: { count: number }) {
  const { t } = useTranslation();
  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderColor="$color4"
      rounded="$6"
      p="$4"
    >
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
            <Wallet size={14} color="$color11" />
            <Text
              color="$color11"
              fontSize="$1"
              fontWeight="600"
              letterSpacing={1}
            >
              {t('home.lastDistribution.title').toUpperCase()}
            </Text>
          </XStack>
          <Text color="$color11" fontSize="$2" fontWeight="500">
            {dateStr}
          </Text>
        </XStack>
        <Text color="$color12" fontSize="$6" fontWeight="700" mt="$1">
          {formatAmount(income.amount)} {currency}
        </Text>
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

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const { push, replace } = useRouter();
  const debts = useAppStore((s) => s.debts);
  const incomes = useAppStore((s) => s.incomes);
  const monthlyNeeds = useAppStore((s) => s.monthlyNeeds);
  const monthlyCoverage = useAppStore((s) => s.monthlyCoverage);
  const deferredPayments = useAppStore((s) => s.deferredPayments);
  const reconcileDeferredPayments = useAppStore(
    (s) => s.reconcileDeferredPayments
  );
  const installationDate = useAppStore((s) => s.installationDate);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const lastRealityCheckAt = settings.lastRealityCheckAt;
  const lastCelebrationDebtId = useAppStore(
    (s) => s.settings.lastCelebrationDebtId
  );

  const [dismissedRC, setDismissedRC] = useState(false);
  const [dismissedFS, setDismissedFS] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pendingCelebrationKeyRef = useRef<string | null>(null);

  const homeSummary = useMemo(
    () =>
      buildHomeSummary({
        debts,
        incomes,
        monthlyCoverage,
        deferredPayments,
        settings,
      }),
    [debts, incomes, monthlyCoverage, deferredPayments, settings]
  );

  const {
    activeDebts,
    closedDebts,
    snowballTarget,
    targetSource,
    recentIncome,
    coveredNeeds,
    pendingDeferredCount,
    totalRemaining,
    totalPaid,
  } = homeSummary;
  const totalNeeded = sumNeeds(monthlyNeeds);
  const totalCovered = sumCoveredNeeds(monthlyNeeds, coveredNeeds);
  const remainingNeeds = Math.max(0, totalNeeded - totalCovered);
  const needsPct = getProgressPercent(totalCovered, totalNeeded);

  useEffect(() => {
    reconcileDeferredPayments();
  }, [
    debts,
    deferredPayments,
    monthlyCoverage,
    monthlyNeeds,
    reconcileDeferredPayments,
  ]);

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
        debts.map((d) => ({
          label: d.label,
          type: d.type,
          closedAt: d.closedAt,
        })),
        lastCelebrationDebtId
      ),
    [debts, lastCelebrationDebtId]
  );

  useEffect(() => {
    if (!debtCelebration?.shouldShow) return;
    const celebrationKey = `${debtCelebration.debtLabel}:${debtCelebration.closedAt}`;
    if (pendingCelebrationKeyRef.current === celebrationKey) return;
    pendingCelebrationKeyRef.current = celebrationKey;

    useAppStore.getState().updateSettings({
      lastCelebrationDebtId: debtCelebration.debtLabel,
    });
    replace({
      pathname: '/celebration',
      params: {
        debtLabel: debtCelebration.debtLabel,
        debtType: debtCelebration.debtType,
      },
    });
  }, [
    debtCelebration?.shouldShow,
    debtCelebration?.debtLabel,
    debtCelebration?.debtType,
    debtCelebration?.closedAt,
    replace,
  ]);

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
    push('/income/new');
  }

  const showRealityCheck = realityCheckTrigger.shouldShow && !dismissedRC;
  const showFreshStart = freshStartTrigger.shouldShow && !dismissedFS;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        scrollIndicatorInsets={{
          top: insets.top,
          bottom: 120 + insets.bottom,
        }}
      >
        <YStack px="$4" pt={insets.top + 12} gap="$4">
          <XStack items="center" justify="space-between" gap="$3">
            <H2 flex={1} fontSize="$8" lineHeight={40}>
              {t('home.greeting')}
            </H2>
            <Button
              circular
              size="$4"
              theme="accent"
              icon={<Plus size={20} />}
              accessibilityLabel={t('home.cta.receivedMoney')}
              onPress={handleNewIncome}
            />
          </XStack>

          {pendingDeferredCount > 0 && (
            <DeferredBanner count={pendingDeferredCount} />
          )}

          {showFreshStart && (
            <FreshStartCard
              messageKey={freshStartTrigger.messageKey}
              onDismiss={() => setDismissedFS(true)}
            />
          )}
          {showRealityCheck && (
            <RealityCheckCard
              questionKey={realityCheckTrigger.questionKey}
              onAnswer={handleRealityCheckAnswer}
            />
          )}

          <ActionStatusCard
            remainingNeeds={remainingNeeds}
            debt={snowballTarget}
            onNewIncome={handleNewIncome}
          />

          <ProgressOverviewCard
            totalNeeded={totalNeeded}
            totalCovered={totalCovered}
            needsPct={needsPct}
            totalRemaining={totalRemaining}
            totalPaid={totalPaid}
          />

          {snowballTarget ? (
            <FocusDebtCard
              debt={snowballTarget}
              incomes={incomes}
              source={targetSource}
              onPickAnother={() => setPickerOpen(true)}
            />
          ) : null}

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

          {closedDebts.length > 0 && (
            <ClosedDebtsRow count={closedDebts.length} />
          )}

          {recentIncome && <LastDistributionCard income={recentIncome} />}
        </YStack>
      </ScrollView>
      <TopSafeAreaScrim topInset={insets.top} />
    </>
  );
}
