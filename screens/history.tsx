import { Clock } from '@tamagui/lucide-icons-2';
import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  H2,
  Paragraph,
  Separator,
  Text,
  XStack,
  YStack,
} from 'tamagui';

import { AllocationStack } from '@/components/allocation-stack';
import type { AllocationStackSegment } from '@/components/allocation-stack';
import { summarizeAllocation } from '@/lib/allocation-summary';
import { useAppStore } from '@/store';
import { formatAmount } from '@/lib/format';
import type { Income } from '@/types/models';

interface IncomeDayGroup {
  key: string;
  label: string;
  total: number;
  incomes: Income[];
}

function getDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function groupIncomesByDay(incomes: Income[]): IncomeDayGroup[] {
  const sorted = [...incomes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const groups: IncomeDayGroup[] = [];

  for (const income of sorted) {
    const date = new Date(income.date);
    const key = getDateKey(date);
    const existing = groups.find((group) => group.key === key);

    if (existing) {
      existing.incomes.push(income);
      existing.total += income.amount;
      continue;
    }

    groups.push({
      key,
      label: date.toLocaleDateString('pl-PL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      total: income.amount,
      incomes: [income],
    });
  }

  return groups;
}

function IncomeRow({ income }: { income: Income }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const summary = summarizeAllocation(income.allocation);
  const segments: AllocationStackSegment[] = summary.segments.map((segment) => ({
    ...segment,
    label:
      segment.key === 'needs'
        ? t('home.lastDistribution.needs')
        : segment.key === 'minimums'
          ? t('home.lastDistribution.minimums')
          : segment.key === 'extra'
            ? t('home.lastDistribution.extra')
            : t('home.lastDistribution.unallocated'),
  }));

  return (
    <YStack py="$2.5" gap="$2">
      <XStack items="center" justify="space-between">
        <Text color="$color12" fontSize="$5" fontWeight="700">
          {formatAmount(income.amount)} {currency}
        </Text>
        {income.source ? (
          <Text color="$accent10" fontSize="$2" fontWeight="600">
            {income.source}
          </Text>
        ) : null}
      </XStack>

      <AllocationStack
        segments={segments}
        currency={currency}
        barHeight={8}
        legend="rows"
      />
    </YStack>
  );
}

function IncomeDayCard({ group }: { group: IncomeDayGroup }) {
  const { t } = useTranslation();
  const currency = t('common.currency');

  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderColor="$color4"
      rounded="$6"
      overflow="hidden"
    >
      <XStack p="$4" pb="$2.5" items="center" justify="space-between" gap="$3">
        <Text color="$color11" fontSize="$3" fontWeight="600">
          {group.label}
        </Text>
        <Text color="$color10" fontSize="$3" fontWeight="600">
          {formatAmount(group.total)} {currency}
        </Text>
      </XStack>

      <YStack px="$4" pb="$2">
        {group.incomes.map((income, i) => (
          <YStack key={income.id}>
            <IncomeRow income={income} />
            {i < group.incomes.length - 1 && (
              <Separator borderColor="$color3" />
            )}
          </YStack>
        ))}
      </YStack>
    </YStack>
  );
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const incomes = useAppStore((s) => s.incomes);
  const groups = groupIncomesByDay(incomes);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          <YStack px="$4" pt="$4" gap="$4">
            <H2>{t('history.title')}</H2>

            {groups.length === 0 ? (
              <YStack bg="$color2" rounded="$6" p="$5" items="center" gap="$3">
                <Clock size={40} color="$color8" />
                <Paragraph color="$color9">{t('history.empty')}</Paragraph>
              </YStack>
            ) : (
              <YStack gap="$3">
                {groups.map((group) => (
                  <IncomeDayCard key={group.key} group={group} />
                ))}
              </YStack>
            )}
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
