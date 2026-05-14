import { Clock } from '@tamagui/lucide-icons-2';
import { Stack } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList, type SectionListRenderItem } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { H2, Paragraph, Separator, Text, XStack, YStack } from 'tamagui';

import type { AllocationStackSegment } from '@/components/allocation-stack';
import { AllocationStack } from '@/components/allocation-stack';
import { TopSafeAreaScrim } from '@/components/top-safe-area-scrim';
import { summarizeAllocation } from '@/lib/allocation-summary';
import { formatAmount } from '@/lib/format';
import type { IncomeDayGroup } from '@/lib/income-history';
import { groupIncomesByDay } from '@/lib/income-history';
import { useAppStore } from '@/store';
import type { Income } from '@/types/models';

interface HistorySection extends IncomeDayGroup {
  data: Income[];
}

type IncomeRowProps = {
  income: Income;
};

const IncomeRow = (props: IncomeRowProps) => {
  const { income } = props;
  const { t } = useTranslation();
  const currency = t('common.currency');
  const summary = summarizeAllocation(income.allocation);
  const segments: AllocationStackSegment[] = summary.segments.map(
    (segment) => ({
      ...segment,
      label:
        segment.key === 'needs'
          ? t('home.lastDistribution.needs')
          : segment.key === 'minimums'
            ? t('home.lastDistribution.minimums')
            : segment.key === 'extra'
              ? t('home.lastDistribution.extra')
              : t('home.lastDistribution.unallocated'),
    })
  );

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
};

type IncomeDayHeaderProps = {
  group: IncomeDayGroup;
};

const IncomeDayHeader = (props: IncomeDayHeaderProps) => {
  const { group } = props;
  const { t } = useTranslation();
  const currency = t('common.currency');

  return (
    <YStack
      bg="$color2"
      borderWidth={1}
      borderBottomWidth={0}
      borderColor="$color4"
      borderTopLeftRadius="$6"
      borderTopRightRadius="$6"
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
    </YStack>
  );
};

type IncomeDayItemProps = {
  income: Income;
  isLast: boolean;
};

const IncomeDayItem = (props: IncomeDayItemProps) => {
  const { income, isLast } = props;

  return (
    <YStack
      bg="$color2"
      borderLeftWidth={1}
      borderRightWidth={1}
      borderBottomWidth={isLast ? 1 : 0}
      borderColor="$color4"
      borderBottomLeftRadius={isLast ? '$6' : undefined}
      borderBottomRightRadius={isLast ? '$6' : undefined}
      overflow="hidden"
      px="$4"
      pb={isLast ? '$2' : '$0'}
      mb={isLast ? '$3' : '$0'}
    >
      <IncomeRow income={income} />
      {!isLast && <Separator borderColor="$color3" />}
    </YStack>
  );
};

export default function HistoryScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const incomes = useAppStore((s) => s.incomes);
  const sections: HistorySection[] = useMemo(
    () =>
      groupIncomesByDay(incomes).map((group) => ({
        ...group,
        data: group.incomes,
      })),
    [incomes]
  );
  const renderIncomeItem = useCallback<
    SectionListRenderItem<Income, HistorySection>
  >(
    ({ item, index, section }) => (
      <IncomeDayItem income={item} isLast={index === section.data.length - 1} />
    ),
    []
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 100 + insets.bottom,
          }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <YStack mb="$4">
              <H2>{t('history.title')}</H2>
            </YStack>
          }
          ListEmptyComponent={
            <YStack bg="$color2" rounded="$6" p="$5" items="center" gap="$3">
              <Clock size={40} color="$color8" />
              <Paragraph color="$color9">{t('history.empty')}</Paragraph>
            </YStack>
          }
          renderSectionHeader={({ section }) => (
            <IncomeDayHeader group={section} />
          )}
          renderItem={renderIncomeItem}
          style={{ flex: 1 }}
          contentInsetAdjustmentBehavior="automatic"
        />
      </SafeAreaView>
      <TopSafeAreaScrim topInset={insets.top} />
    </>
  );
}
