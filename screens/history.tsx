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

import { useAppStore } from '@/store';
import { formatAmount } from '@/lib/format';
import type { Income } from '@/types/models';

function IncomeRow({ income }: { income: Income }) {
  const { t } = useTranslation();
  const currency = t('common.currency');
  const alloc = income.allocation;

  const totalNeeds =
    alloc.needs.housing + alloc.needs.food + alloc.needs.transport + alloc.needs.other;
  const totalDebts = Object.values(alloc.minimumPayments).reduce((s, v) => s + v, 0);
  const extra = alloc.extraDebtPayment?.amount ?? 0;
  const unalloc = alloc.unallocated;

  const segments = [
    { key: 'needs', label: t('home.lastDistribution.needs'), amount: totalNeeds, color: '$accent9' as const },
    { key: 'debts', label: t('home.lastDistribution.minimums'), amount: totalDebts, color: '$yellow9' as const },
    { key: 'extra', label: t('home.lastDistribution.extra'), amount: extra, color: '$green9' as const },
    { key: 'unalloc', label: t('home.lastDistribution.shortfall'), amount: unalloc, color: '$color6' as const },
  ].filter((s) => s.amount > 0);

  const dateStr = new Date(income.date).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <YStack py="$3" gap="$2.5">
      <XStack items="center" justify="space-between">
        <Text color="$color9" fontSize="$2">
          {dateStr}
        </Text>
        {income.source ? (
          <Text color="$accent9" fontSize="$2" fontWeight="500">
            {income.source}
          </Text>
        ) : null}
      </XStack>

      <Text color="$color12" fontSize="$5" fontWeight="600">
        {formatAmount(income.amount)} {currency}
      </Text>

      {/* Stacked bar */}
      <XStack height={8} rounded="$10" overflow="hidden">
        {segments.map((seg) => (
          <YStack key={seg.key} flex={seg.amount} bg={seg.color} height={8} />
        ))}
      </XStack>

      {/* Breakdown rows */}
      <YStack gap="$1.5">
        {segments.map((seg) => (
          <XStack key={seg.key} items="center" justify="space-between">
            <XStack items="center" gap="$2">
              <YStack width={8} height={8} rounded="$10" bg={seg.color} />
              <Text color="$color9" fontSize="$2">{seg.label}</Text>
            </XStack>
            <Text color="$color11" fontSize="$2">
              {formatAmount(seg.amount)} {currency}
            </Text>
          </XStack>
        ))}
      </YStack>
    </YStack>
  );
}

export default function HistoryScreen() {
  const { t } = useTranslation();
  const incomes = useAppStore((s) => s.incomes);

  const sorted = [...incomes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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

            {sorted.length === 0 ? (
              <YStack bg="$color2" rounded="$6" p="$5" items="center" gap="$3">
                <Clock size={40} color="$color8" />
                <Paragraph color="$color9">{t('history.empty')}</Paragraph>
              </YStack>
            ) : (
              <YStack bg="$color2" borderWidth={1} borderColor="$color4" rounded="$6" px="$4">
                {sorted.map((income, i) => (
                  <YStack key={income.id}>
                    <IncomeRow income={income} />
                    {i < sorted.length - 1 && <Separator borderColor="$color3" />}
                  </YStack>
                ))}
              </YStack>
            )}
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
