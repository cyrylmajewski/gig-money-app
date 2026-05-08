import { useMemo, useState, useCallback, useRef } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Button,
  Paragraph,
  Progress,
  Separator,
  ScrollView,
  Input,
  Sheet,
} from 'tamagui';
import { AllocationStack } from '@/components/allocation-stack';
import type { AllocationStackSegment } from '@/components/allocation-stack';
import { summarizeAllocation } from '@/lib/allocation-summary';
import { useAppStore } from '@/store';
import { formatAmount } from '@/lib/format';
import { distributeIncome } from '@/lib/distribution';
import {
  getCurrentMonthlyCoverage,
  getOutstandingNeeds,
  getOutstandingMinimums,
  getActiveDebts,
  getFloorForCategory,
  getPreviousMonthsAverage,
  roundPLN,
} from '@/lib/distribution/helpers';
import type {
  Allocation,
  AppState,
  DeferredPaymentReason,
  DeferredPaymentReasons,
  MonthlyNeeds,
} from '@/types/models';

interface L3QueueItem {
  key: string;
  label: string;
}

function AllocationHeader({
  incomeAmount,
  allocation,
  currency,
}: {
  incomeAmount: number;
  allocation: Allocation;
  currency: string;
}) {
  const { t } = useTranslation();
  const summary = summarizeAllocation(allocation);
  const segments: AllocationStackSegment[] = summary.segments.map((segment) => ({
    ...segment,
    label:
      segment.key === 'needs'
        ? t('home.lastDistribution.needs')
        : segment.key === 'minimums'
          ? t('home.lastDistribution.minimums')
          : segment.key === 'extra'
            ? t('home.lastDistribution.extra')
            : t('income.allocate.rows.unallocated'),
  }));

  return (
    <YStack
      bg="$color3"
      borderWidth={1}
      borderColor="$color4"
      rounded="$6"
      p="$4"
      gap="$3"
    >
      <Text color="$color9" fontSize="$2">
        {t('income.allocate.receivedLabel')}
      </Text>
      <Text fontSize="$7" fontWeight="700">
        {formatAmount(incomeAmount)} {currency}
      </Text>

      <AllocationStack
        segments={segments}
        currency={currency}
        barHeight={12}
        legend="amounts"
      />
    </YStack>
  );
}

function RemainingCard({
  incomeAmount,
  spent,
  currency,
}: {
  incomeAmount: number;
  spent: number;
  currency: string;
}) {
  const { t } = useTranslation();
  const remaining = roundPLN(incomeAmount - spent);
  const isOverspent = remaining < 0;

  return (
    <YStack
      bg={isOverspent ? '$red3' : '$color3'}
      borderWidth={1}
      borderColor={isOverspent ? '$red6' : '$color4'}
      rounded="$6"
      p="$4"
      gap="$1.5"
    >
      <XStack items="center" justify="space-between">
        <Text color={isOverspent ? '$red11' : '$color9'} fontSize="$2">
          {t('income.allocate.edit.remainingLabel')}
        </Text>
        <Text
          color={isOverspent ? '$red11' : '$color11'}
          fontWeight="700"
          fontSize="$4"
        >
          {formatAmount(Math.abs(remaining))} {currency}
        </Text>
      </XStack>
      {isOverspent && (
        <>
          <Text color="$red10" fontSize="$2" fontWeight="600">
            {t('income.allocate.edit.overspentLabel', {
              amount: formatAmount(Math.abs(remaining)),
              currency,
            })}
          </Text>
          <Text color="$red9" fontSize="$1">
            {t('income.allocate.edit.blockedHint')}
          </Text>
        </>
      )}
    </YStack>
  );
}

interface EditableRowProps {
  label: string;
  sublabel?: string;
  value: number;
  step: number;
  onChange: (next: number) => void;
  currency: string;
  l2Warning?: string | null;
}

function EditableRow({
  label,
  sublabel,
  value,
  step,
  onChange,
  currency,
  l2Warning,
}: EditableRowProps) {
  const [inputText, setInputText] = useState(value > 0 ? String(Math.round(value)) : '');

  function handleIncrement() {
    const next = roundPLN(value + step);
    setInputText(String(Math.round(next)));
    onChange(next);
  }

  function handleDecrement() {
    const next = roundPLN(Math.max(0, value - step));
    setInputText(String(Math.round(next)));
    onChange(next);
  }

  function handleTextChange(raw: string) {
    const digits = raw.replace(/[^0-9]/g, '');
    setInputText(digits);
    const parsed = digits.length > 0 ? parseInt(digits, 10) : 0;
    onChange(parsed);
  }

  return (
    <YStack py="$3" gap="$2">
      <YStack gap="$0.5">
        <Text color="$color11" fontWeight="500">
          {label}
        </Text>
        {sublabel ? (
          <Text color="$color8" fontSize="$2">
            {sublabel}
          </Text>
        ) : null}
      </YStack>

      <XStack items="center" gap="$2">
        <Button
          size="$3"
          bg="$color4"
          pressStyle={{ bg: '$color5' }}
          onPress={handleDecrement}
          width={40}
          height={40}
          p={0}
          items="center"
          justify="center"
        >
          <Button.Text fontWeight="700" fontSize="$5">−</Button.Text>
        </Button>

        <Input
          flex={1}
          keyboardType="number-pad"
          value={inputText}
          onChangeText={handleTextChange}
          textAlign="center"
          fontSize="$4"
          fontWeight="600"
          bg="$color2"
          borderColor="$color5"
          height={40}
        />

        <Text color="$color9" fontSize="$3" width={28}>
          {currency}
        </Text>

        <Button
          size="$3"
          bg="$color4"
          pressStyle={{ bg: '$color5' }}
          onPress={handleIncrement}
          width={40}
          height={40}
          p={0}
          items="center"
          justify="center"
        >
          <Button.Text fontWeight="700" fontSize="$5">+</Button.Text>
        </Button>
      </XStack>

      {l2Warning ? (
        <XStack
          bg="$yellow2"
          borderWidth={1}
          borderColor="$yellow6"
          rounded="$4"
          px="$3"
          py="$2"
        >
          <Text color="$yellow11" fontSize="$2" flex={1}>
            {l2Warning}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}

function ReadOnlyRow({
  label,
  sublabel,
  amount,
  currency,
  highlight,
}: {
  label: string;
  sublabel?: string;
  amount: number;
  currency: string;
  highlight?: boolean;
}) {
  return (
    <YStack py="$3" gap="$1">
      <XStack items="center" justify="space-between">
        <YStack flex={1} gap="$0.5" pr="$3">
          <Text color="$color11" fontWeight={highlight ? '600' : '400'}>
            {label}
          </Text>
          {sublabel ? (
            <Text color="$color8" fontSize="$2">
              {sublabel}
            </Text>
          ) : null}
        </YStack>
        <Text color={highlight ? '$accent9' : '$color11'} fontWeight="600">
          {formatAmount(amount)} {currency}
        </Text>
      </XStack>
    </YStack>
  );
}

interface L3SheetProps {
  open: boolean;
  currentItem: L3QueueItem | null;
  selectedReason: DeferredPaymentReason;
  onSelectReason: (r: DeferredPaymentReason) => void;
  onSave: () => void;
  onBack: () => void;
  queueIndex: number;
  queueTotal: number;
}

function L3Sheet({
  open,
  currentItem,
  selectedReason,
  onSelectReason,
  onSave,
  onBack,
  queueIndex,
  queueTotal,
}: L3SheetProps) {
  const { t } = useTranslation();

  const reasons: { value: DeferredPaymentReason; labelKey: string }[] = [
    { value: 'agreed_delay', labelKey: 'income.allocate.guardrail.l3.reasonAgreedDelay' },
    { value: 'postponing', labelKey: 'income.allocate.guardrail.l3.reasonPostponing' },
    { value: 'other', labelKey: 'income.allocate.guardrail.l3.reasonOther' },
  ];

  return (
    <Sheet
      open={open}
      snapPoints={[52]}
      dismissOnSnapToBottom={false}
      modal
    >
      <Sheet.Overlay />
      <Sheet.Frame p="$5" gap="$4">
        <YStack gap="$2">
          <Text fontWeight="700" fontSize="$5">
            {t('income.allocate.guardrail.l3.title')}
            {queueTotal > 1 ? ` (${queueIndex + 1}/${queueTotal})` : ''}
          </Text>
          <Text color="$color9" fontSize="$3">
            {t('income.allocate.guardrail.l3.subtitle', {
              label: currentItem?.label ?? '',
            })}
          </Text>
        </YStack>

        <YStack gap="$2">
          {reasons.map(({ value, labelKey }) => (
            <Pressable key={value} onPress={() => onSelectReason(value)}>
              <XStack
                bg={selectedReason === value ? '$accent3' : '$color3'}
                borderWidth={1}
                borderColor={selectedReason === value ? '$accent7' : '$color5'}
                rounded="$4"
                px="$4"
                py="$3"
                items="center"
                gap="$3"
              >
                <YStack
                  width={18}
                  height={18}
                  rounded="$10"
                  borderWidth={2}
                  borderColor={selectedReason === value ? '$accent9' : '$color7'}
                  bg={selectedReason === value ? '$accent9' : 'transparent'}
                />
                <Text
                  color={selectedReason === value ? '$accent11' : '$color11'}
                  flex={1}
                  fontSize="$3"
                >
                  {t(labelKey)}
                </Text>
              </XStack>
            </Pressable>
          ))}
        </YStack>

        <XStack gap="$3">
          <Button
            flex={1}
            size="$4"
            bg="$color3"
            pressStyle={{ bg: '$color4' }}
            onPress={onBack}
          >
            <Button.Text color="$color11">
              {t('income.allocate.guardrail.l3.back')}
            </Button.Text>
          </Button>
          <Button
            flex={2}
            size="$4"
            bg="$accent9"
            pressStyle={{ bg: '$accent10' }}
            onPress={onSave}
          >
            <Button.Text color="$color12">
              {t('income.allocate.guardrail.l3.save')}
            </Button.Text>
          </Button>
        </XStack>
      </Sheet.Frame>
    </Sheet>
  );
}

export default function AllocateScreen() {
  const { t } = useTranslation();
  const { back, push } = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ amount: string; source?: string }>();

  const monthlyNeeds = useAppStore((s) => s.monthlyNeeds);
  const debts = useAppStore((s) => s.debts);
  const deferredPayments = useAppStore((s) => s.deferredPayments);
  const monthlyCoverage = useAppStore((s) => s.monthlyCoverage);
  const settings = useAppStore((s) => s.settings);

  const incomeAmount = parseFloat(params.amount ?? '0');
  const currency = t('common.currency');

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
      shortfallContacts: [],
      settings,
    }),
    [monthlyNeeds, debts, deferredPayments, monthlyCoverage, settings]
  );

  const seededAllocation: Allocation = useMemo(
    () => distributeIncome(incomeAmount, stateSnapshot),
    [incomeAmount, stateSnapshot]
  );

  const [editedAllocation, setEditedAllocation] = useState<Allocation>(seededAllocation);
  const [wasAdjustedByUser, setWasAdjustedByUser] = useState(false);

  const [l3SheetOpen, setL3SheetOpen] = useState(false);
  const [l3Queue, setL3Queue] = useState<L3QueueItem[]>([]);
  const [l3QueueIndex, setL3QueueIndex] = useState(0);
  const [l3CurrentReason, setL3CurrentReason] =
    useState<DeferredPaymentReason>('postponing');
  const l3CollectedReasonsRef = useRef<DeferredPaymentReasons>({});

  const outstanding = useMemo(() => {
    const coverage = getCurrentMonthlyCoverage(monthlyCoverage);
    const needs = getOutstandingNeeds(monthlyNeeds, coverage);
    const activeD = getActiveDebts(debts);
    const mins = getOutstandingMinimums(activeD, coverage);
    return { needs, mins };
  }, [monthlyNeeds, monthlyCoverage, debts]);

  const activeDebtsList = useMemo(() => getActiveDebts(debts), [debts]);

  const debtById = useMemo(
    () => Object.fromEntries(debts.map((d) => [d.id, d])),
    [debts]
  );

  const editedSpent = useMemo(() => {
    return roundPLN(
      editedAllocation.needs.housing +
        editedAllocation.needs.food +
        editedAllocation.needs.transport +
        editedAllocation.needs.other +
        Object.values(editedAllocation.minimumPayments).reduce((s, v) => s + v, 0) +
        editedAllocation.deferredPayments
    );
  }, [editedAllocation]);

  const computedSnowball = useMemo(() => {
    const remaining = roundPLN(incomeAmount - editedSpent);
    if (remaining <= 0 || !seededAllocation.extraDebtPayment) return null;
    const debtId = seededAllocation.extraDebtPayment.debtId;
    const snowballDebt = debtById[debtId];
    if (!snowballDebt) return null;
    const maxExtra = roundPLN(
      snowballDebt.remainingAmount -
        (editedAllocation.minimumPayments[debtId] ?? 0)
    );
    const snowballAmount = Math.min(remaining, Math.max(0, maxExtra));
    if (snowballAmount <= 0) return null;
    return { debtId, amount: roundPLN(snowballAmount) };
  }, [incomeAmount, editedSpent, seededAllocation, debtById, editedAllocation.minimumPayments]);

  const coverageStats = useMemo(() => {
    const covered =
      editedAllocation.needs.housing +
      editedAllocation.needs.food +
      editedAllocation.needs.transport +
      editedAllocation.needs.other;
    const totalNeeds =
      monthlyNeeds.housing +
      monthlyNeeds.food +
      monthlyNeeds.transport +
      monthlyNeeds.other;
    const pct =
      totalNeeds > 0 ? Math.round((covered / totalNeeds) * 100) : 100;
    const hasShortfall = covered < totalNeeds;

    const tips: string[] = [];
    if (editedAllocation.needs.food < monthlyNeeds.food && monthlyNeeds.food > 0) {
      tips.push('income.allocate.tips.food');
    }
    if (editedAllocation.needs.transport === 0 && monthlyNeeds.transport > 0) {
      tips.push('income.allocate.tips.transport');
    }
    const unpaidDebts = Object.entries(outstanding.mins).filter(
      ([id]) => (editedAllocation.minimumPayments[id] ?? 0) === 0
    );
    if (unpaidDebts.length > 0) {
      tips.push('income.allocate.tips.contactCreditor');
    }
    if (tips.length === 0 && hasShortfall) {
      tips.push('income.allocate.tips.nextIncome');
    }

    return { pct, hasShortfall, tips };
  }, [editedAllocation, monthlyNeeds, outstanding]);

  const foodAvg = useMemo(
    () => getPreviousMonthsAverage('food', monthlyCoverage, 3),
    [monthlyCoverage]
  );

  const housingAvg = useMemo(
    () => getPreviousMonthsAverage('housing', monthlyCoverage, 3),
    [monthlyCoverage]
  );

  function getPriorMonthName(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString(settings.locale === 'pl' ? 'pl-PL' : 'en-US', {
      month: 'long',
    });
  }

  const priorMonthName = useMemo(getPriorMonthName, [settings.locale]);

  function markAdjusted() {
    if (!wasAdjustedByUser) setWasAdjustedByUser(true);
  }

  function updateNeed(cat: keyof MonthlyNeeds, value: number) {
    markAdjusted();
    setEditedAllocation((prev) => ({
      ...prev,
      needs: { ...prev.needs, [cat]: value },
    }));
  }

  function updateMinimum(debtId: string, value: number) {
    markAdjusted();
    setEditedAllocation((prev) => ({
      ...prev,
      minimumPayments: { ...prev.minimumPayments, [debtId]: value },
    }));
  }

  function getFoodL2Warning(): string | null {
    if (foodAvg === null) return null;
    if (editedAllocation.needs.food < foodAvg * 0.6) {
      return t('income.allocate.guardrail.l2.foodBelowAvg', {
        month: priorMonthName,
        avg: formatAmount(Math.round(foodAvg)),
        now: formatAmount(editedAllocation.needs.food),
        currency,
      });
    }
    return null;
  }

  function getHousingL2Warning(): string | null {
    if (housingAvg === null) return null;
    if (editedAllocation.needs.housing < housingAvg * 0.6) {
      return t('income.allocate.guardrail.l2.housingBelowAvg', {
        month: priorMonthName,
        avg: formatAmount(Math.round(housingAvg)),
        now: formatAmount(editedAllocation.needs.housing),
        currency,
      });
    }
    return null;
  }

  function buildL3Queue(): L3QueueItem[] {
    const queue: L3QueueItem[] = [];
    const coverage = getCurrentMonthlyCoverage(monthlyCoverage);

    const needCategories: Array<{ cat: keyof MonthlyNeeds; label: string }> = [
      { cat: 'housing', label: t('income.allocate.rows.housing') },
      { cat: 'food', label: t('income.allocate.rows.food') },
      { cat: 'transport', label: t('income.allocate.rows.transport') },
      { cat: 'other', label: t('income.allocate.rows.other') },
    ];

    for (const { cat, label } of needCategories) {
      const floor = getFloorForCategory(cat, outstanding.needs[cat], settings.floorOverrides);
      const covered = coverage.needs[cat] ?? 0;
      const outstandingCat = Math.max(0, floor - covered);
      if (outstandingCat > 0 && (editedAllocation.needs[cat] ?? 0) === 0) {
        queue.push({ key: `need:${cat}`, label });
      }
    }

    for (const debt of activeDebtsList) {
      const needed = outstanding.mins[debt.id] ?? 0;
      const edited = editedAllocation.minimumPayments[debt.id] ?? 0;
      if (needed > 0 && edited === 0) {
        queue.push({
          key: `debt:${debt.id}`,
          label: t('income.allocate.rows.minimumPayment', { label: debt.label }),
        });
      }
    }

    return queue;
  }

  function finalizeWithReasons(reasons: DeferredPaymentReasons) {
    const finalAllocation: Allocation = {
      ...editedAllocation,
      extraDebtPayment: computedSnowball,
      unallocated: roundPLN(Math.max(0, incomeAmount - editedSpent - (computedSnowball?.amount ?? 0))),
      wasAdjustedByUser: true,
    };

    const shortfalls: Array<{
      kind: 'housing' | 'food' | 'debt';
      label: string;
      shortAmount: number;
      debtId?: string;
    }> = [];

    if (outstanding.needs.housing > 0 && finalAllocation.needs.housing < outstanding.needs.housing) {
      shortfalls.push({
        kind: 'housing',
        label: t('income.allocate.rows.housing'),
        shortAmount: outstanding.needs.housing - finalAllocation.needs.housing,
      });
    }
    if (outstanding.needs.food > 0 && finalAllocation.needs.food < outstanding.needs.food) {
      shortfalls.push({
        kind: 'food',
        label: t('income.allocate.rows.food'),
        shortAmount: outstanding.needs.food - finalAllocation.needs.food,
      });
    }
    for (const debt of activeDebtsList) {
      const needed = outstanding.mins[debt.id] ?? 0;
      const paid = finalAllocation.minimumPayments[debt.id] ?? 0;
      if (needed > 0 && paid < needed) {
        shortfalls.push({
          kind: 'debt',
          label: debt.label,
          shortAmount: needed - paid,
          debtId: debt.id,
        });
      }
    }

    const allocationJson = JSON.stringify(finalAllocation);
    const reasonsJson = JSON.stringify(reasons);

    if (shortfalls.length > 0) {
      push({
        pathname: '/income/shortfall',
        params: {
          amount: params.amount,
          source: params.source ?? '',
          allocation: allocationJson,
          shortfalls: JSON.stringify(shortfalls),
          wasAdjustedByUser: 'true',
          reasons: reasonsJson,
        },
      });
    } else {
      push({
        pathname: '/income/confirm',
        params: {
          amount: params.amount,
          source: params.source ?? '',
          allocation: allocationJson,
          wasAdjustedByUser: wasAdjustedByUser ? 'true' : 'false',
          reasons: reasonsJson,
        },
      });
    }
  }

  const handleConfirm = useCallback(() => {
    const remaining = roundPLN(incomeAmount - editedSpent);
    if (remaining < 0) return;

    // L4 check: every active debt receives 0 — counting both minimums AND the
    // auto-assigned snowball extra. If snowball will pay any debt, user IS
    // contributing and L4 should not fire.
    if (
      activeDebtsList.length > 0 &&
      activeDebtsList.every((d) => {
        const minimum = editedAllocation.minimumPayments[d.id] ?? 0;
        const extra = computedSnowball?.debtId === d.id ? computedSnowball.amount : 0;
        return minimum + extra === 0;
      })
    ) {
      const finalAllocation: Allocation = {
        ...editedAllocation,
        extraDebtPayment: null,
        unallocated: roundPLN(Math.max(0, remaining)),
        wasAdjustedByUser: true,
      };
      push({
        pathname: '/income/no-contribution',
        params: {
          amount: params.amount,
          source: params.source ?? '',
          allocation: JSON.stringify(finalAllocation),
          reasons: JSON.stringify({}),
          wasAdjustedByUser: 'true',
        },
      });
      return;
    }

    // L3 check
    const queue = buildL3Queue();
    if (queue.length > 0) {
      setL3Queue(queue);
      setL3QueueIndex(0);
      l3CollectedReasonsRef.current = {};
      setL3CurrentReason('postponing');
      setL3SheetOpen(true);
      return;
    }

    finalizeWithReasons({});
  }, [
    incomeAmount,
    editedSpent,
    editedAllocation,
    activeDebtsList,
    outstanding,
    computedSnowball,
    wasAdjustedByUser,
    params,
  ]);

  function handleL3Save() {
    const currentItem = l3Queue[l3QueueIndex];
    if (!currentItem) return;

    const updated = {
      ...l3CollectedReasonsRef.current,
      [currentItem.key]: l3CurrentReason,
    };
    l3CollectedReasonsRef.current = updated;

    if (l3QueueIndex < l3Queue.length - 1) {
      setL3QueueIndex((i) => i + 1);
      setL3CurrentReason('postponing');
    } else {
      setL3SheetOpen(false);
      finalizeWithReasons(updated);
    }
  }

  function handleL3Back() {
    setL3SheetOpen(false);
    setL3Queue([]);
    setL3QueueIndex(0);
    l3CollectedReasonsRef.current = {};
  }

  const isConfirmDisabled = roundPLN(incomeAmount - editedSpent) < 0;
  const hasDeferred = editedAllocation.deferredPayments > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: t('income.allocate.title'),
          headerLeft: () => (
            <Pressable
              onPress={back}
              hitSlop={8}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Text color="$color11">{t('common.back')}</Text>
            </Pressable>
          ),
        }}
      />

      <YStack flex={1}>
        <ScrollView>
          <YStack px="$4" pt="$4" pb="$6" gap="$4">
            <AllocationHeader
              incomeAmount={incomeAmount}
              allocation={editedAllocation}
              currency={currency}
            />

            <RemainingCard
              incomeAmount={incomeAmount}
              spent={editedSpent}
              currency={currency}
            />

            <YStack
              bg="$color2"
              borderWidth={1}
              borderColor="$color4"
              rounded="$6"
              p="$4"
              gap="$3"
            >
              <XStack items="center" justify="space-between">
                <Text color="$color9" fontSize="$2" letterSpacing={0.5}>
                  {t('income.allocate.summary.coverageLabel').toUpperCase()}
                </Text>
                <Text
                  color={
                    coverageStats.pct >= 100
                      ? '$color11'
                      : coverageStats.pct < 50
                        ? '$red9'
                        : '$yellow9'
                  }
                  fontWeight="600"
                >
                  {coverageStats.pct}%
                </Text>
              </XStack>

              <Progress value={Math.min(100, coverageStats.pct)} size="$2">
                <Progress.Indicator
                  bg={
                    coverageStats.pct >= 100
                      ? '$accent9'
                      : coverageStats.pct < 50
                        ? '$red9'
                        : '$yellow9'
                  }
                />
              </Progress>

              {coverageStats.tips.length > 0 && (
                <YStack gap="$2" pt="$1">
                  <Text color="$color9" fontSize="$2">
                    {t('income.allocate.summary.tipsLabel')}
                  </Text>
                  {coverageStats.tips.map((tipKey) => (
                    <XStack key={tipKey} gap="$2" items="flex-start">
                      <Text color="$yellow9">→</Text>
                      <Text color="$color11" flex={1} fontSize="$3">
                        {t(tipKey)}
                      </Text>
                    </XStack>
                  ))}
                </YStack>
              )}
            </YStack>

            <YStack
              bg="$color2"
              borderWidth={1}
              borderColor="$color4"
              rounded="$6"
              px="$4"
            >
              {hasDeferred && (
                <>
                  <ReadOnlyRow
                    label={t('income.allocate.rows.deferred')}
                    sublabel={t('income.allocate.rows.deferredSublabel')}
                    amount={editedAllocation.deferredPayments}
                    currency={currency}
                    highlight
                  />
                  <Separator borderColor="$color3" />
                </>
              )}

              {outstanding.needs.housing > 0 && (
                <>
                  <EditableRow
                    label={t('income.allocate.rows.housing')}
                    sublabel={t('income.allocate.edit.remainingLabel') + ': ' + formatAmount(outstanding.needs.housing) + ' ' + currency}
                    value={editedAllocation.needs.housing}
                    step={50}
                    onChange={(v) => updateNeed('housing', v)}
                    currency={currency}
                    l2Warning={getHousingL2Warning()}
                  />
                  <Separator borderColor="$color3" />
                </>
              )}

              {outstanding.needs.food > 0 && (
                <>
                  <EditableRow
                    label={t('income.allocate.rows.food')}
                    sublabel={t('income.allocate.edit.remainingLabel') + ': ' + formatAmount(outstanding.needs.food) + ' ' + currency}
                    value={editedAllocation.needs.food}
                    step={50}
                    onChange={(v) => updateNeed('food', v)}
                    currency={currency}
                    l2Warning={getFoodL2Warning()}
                  />
                  <Separator borderColor="$color3" />
                </>
              )}

              {activeDebtsList.map((debt) => {
                const needed = outstanding.mins[debt.id] ?? 0;
                if (needed <= 0) return null;
                return (
                  <YStack key={debt.id}>
                    <EditableRow
                      label={t('income.allocate.rows.minimumPayment', { label: debt.label })}
                      sublabel={t('income.allocate.rows.minimumPaymentSublabel') + ': ' + formatAmount(needed) + ' ' + currency}
                      value={editedAllocation.minimumPayments[debt.id] ?? 0}
                      step={10}
                      onChange={(v) => updateMinimum(debt.id, v)}
                      currency={currency}
                    />
                    <Separator borderColor="$color3" />
                  </YStack>
                );
              })}

              {outstanding.needs.transport > 0 && (
                <>
                  <EditableRow
                    label={t('income.allocate.rows.transport')}
                    sublabel={t('income.allocate.edit.remainingLabel') + ': ' + formatAmount(outstanding.needs.transport) + ' ' + currency}
                    value={editedAllocation.needs.transport}
                    step={10}
                    onChange={(v) => updateNeed('transport', v)}
                    currency={currency}
                  />
                  <Separator borderColor="$color3" />
                </>
              )}

              {outstanding.needs.other > 0 && (
                <>
                  <EditableRow
                    label={t('income.allocate.rows.other')}
                    sublabel={t('income.allocate.edit.remainingLabel') + ': ' + formatAmount(outstanding.needs.other) + ' ' + currency}
                    value={editedAllocation.needs.other}
                    step={10}
                    onChange={(v) => updateNeed('other', v)}
                    currency={currency}
                  />
                  <Separator borderColor="$color3" />
                </>
              )}

              {computedSnowball && (
                <>
                  <ReadOnlyRow
                    label={t('income.allocate.rows.extraPayment', {
                      label:
                        debtById[computedSnowball.debtId]?.label ??
                        t('income.allocate.rows.extraPaymentFallback'),
                    })}
                    sublabel={t('income.allocate.rows.extraPaymentSublabel')}
                    amount={computedSnowball.amount}
                    currency={currency}
                    highlight
                  />
                  <Separator borderColor="$color3" />
                </>
              )}
            </YStack>

            <Paragraph color="$color8" fontSize="$2" style={{ textAlign: 'center' }}>
              {t('income.allocate.defaultBiasNote')}
            </Paragraph>
          </YStack>
        </ScrollView>

        <YStack px="$4" pt="$3" pb={insets.bottom + 12}>
          <Button
            size="$5"
            bg="$accent9"
            pressStyle={{ bg: '$accent10' }}
            onPress={handleConfirm}
            opacity={isConfirmDisabled ? 0.4 : 1}
            disabled={isConfirmDisabled}
            accessibilityRole="button"
          >
            <Button.Text color="$color12">
              {t('income.allocate.confirm')}
            </Button.Text>
          </Button>
        </YStack>
      </YStack>

      <L3Sheet
        open={l3SheetOpen}
        currentItem={l3Queue[l3QueueIndex] ?? null}
        selectedReason={l3CurrentReason}
        onSelectReason={setL3CurrentReason}
        onSave={handleL3Save}
        onBack={handleL3Back}
        queueIndex={l3QueueIndex}
        queueTotal={l3Queue.length}
      />
    </>
  );
}
