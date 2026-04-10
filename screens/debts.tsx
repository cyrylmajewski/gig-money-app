import { Plus } from '@tamagui/lucide-icons-2';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  H2,
  Paragraph,
  Progress,
  Separator,
  Text,
  XStack,
  YStack,
} from 'tamagui';

import { Badge } from '@/components/badge';
import { useAppStore } from '@/store';
import { formatAmount } from '@/lib/format';
import { getActiveDebts } from '@/lib/distribution/helpers';
import type { Debt } from '@/types/models';

function getClosedDebts(debts: Debt[]): Debt[] {
  return debts
    .filter((d) => d.closedAt !== null)
    .sort((a, b) => {
      return new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime();
    });
}


interface DebtCardProps {
  debt: Debt;
  isSnowballTarget: boolean;
  onPress: () => void;
  isClosed?: boolean;
}

function DebtCard({
  debt,
  isSnowballTarget,
  onPress,
  isClosed = false,
}: DebtCardProps) {
  const { t } = useTranslation();
  const currency = t('common.currency');

  const paid = Math.max(0, debt.originalAmount - debt.remainingAmount);
  const progressValue =
    debt.originalAmount > 0
      ? Math.min(100, Math.max(0, (paid / debt.originalAmount) * 100))
      : 0;

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <YStack
        borderWidth={1}
        borderLeftWidth={isSnowballTarget ? 3 : 1}
        rounded="$6"
        overflow="hidden"
        opacity={isClosed ? 0.5 : 1}
      >
        {/* Target label */}
        {isSnowballTarget ? (
          <YStack px="$4" pt="$3" pb="$1">
            <Text letterSpacing={0.8}>
              {t('debts.list.snowballTarget').toUpperCase()}
            </Text>
          </YStack>
        ) : null}

        {/* Header row */}
        <XStack
          px="$4"
          pt={isSnowballTarget ? '$1' : '$4'}
          pb="$2"
          items="center"
          justify="space-between"
        >
          <YStack flex={1} mr="$3" gap="$1">
            <Text
              numberOfLines={1}
              textDecorationLine={isClosed ? 'line-through' : 'none'}
            >
              {debt.label}
            </Text>
          </YStack>
          <Badge label={t(`onboarding.debts.types.${debt.type}`)} />
        </XStack>

        {/* Progress bar */}
        <YStack px="$4" pb="$3" gap="$2">
          <Progress value={progressValue} size="$1">
            <Progress.Indicator />
          </Progress>

          {/* Amounts row */}
          <XStack justify="space-between" items="center">
            <YStack gap="$0.5">
              <Text>{t('debts.form.remainingAmount')}</Text>
              <Text>
                {formatAmount(debt.remainingAmount)} {currency}
              </Text>
            </YStack>

            <YStack gap="$0.5" items="flex-end">
              <Text>{t('debts.form.minimumPayment')}</Text>
              <Text>
                {formatAmount(debt.minimumPayment)} {currency}
              </Text>
            </YStack>
          </XStack>

          {/* Original amount */}
          <Text>
            {formatAmount(paid)} / {formatAmount(debt.originalAmount)}{' '}
            {currency} ({Math.round(progressValue)}%)
          </Text>
        </YStack>
      </YStack>
    </Pressable>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function DebtsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const debts = useAppStore((s) => s.debts);

  const activeDebts = getActiveDebts(debts).sort((a, b) => a.remainingAmount - b.remainingAmount);
  const closedDebts = getClosedDebts(debts);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <YStack px="$4" pt="$4" gap="$5">
            {/* Title + Add button */}
            <XStack items="center" justify="space-between">
              <H2>{t('debts.list.title')}</H2>
              <Button
                size="$3"
                bg="transparent"
                borderWidth={1}
                icon={<Plus size={16} />}
                onPress={() => router.push('/debt/new')}
              >
                <Text>{t('debts.list.addDebt')}</Text>
              </Button>
            </XStack>

            {/* Empty state */}
            {activeDebts.length === 0 && closedDebts.length === 0 ? (
              <YStack
                borderWidth={1}
                rounded="$6"
                p="$5"
                items="center"
                gap="$3"
              >
                <Paragraph style={{ textAlign: 'center' }}>
                  {t('debts.list.empty')}
                </Paragraph>
                <Button
                  size="$4"
                  icon={<Plus size={18} />}
                  onPress={() => router.push('/debt/new')}
                >
                  <Text>{t('debts.list.addDebt')}</Text>
                </Button>
              </YStack>
            ) : null}

            {/* Active debts — snowball order */}
            {activeDebts.length > 0 ? (
              <YStack gap="$3">
                {activeDebts.map((debt, index) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    isSnowballTarget={index === 0}
                    onPress={() => router.push(`/debt/${debt.id}`)}
                  />
                ))}
              </YStack>
            ) : null}

            {/* Closed debts section */}
            {closedDebts.length > 0 ? (
              <YStack gap="$3">
                <XStack items="center" gap="$3">
                  <Separator flex={1} />
                  <Text letterSpacing={0.8}>
                    {t('debts.list.closedSection').toUpperCase()}
                  </Text>
                  <Separator flex={1} />
                </XStack>

                {closedDebts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    isSnowballTarget={false}
                    onPress={() => router.push(`/debt/${debt.id}`)}
                    isClosed
                  />
                ))}
              </YStack>
            ) : null}
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
