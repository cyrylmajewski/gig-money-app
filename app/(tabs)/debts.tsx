import { useTranslation } from 'react-i18next';
import { useRouter, Stack } from 'expo-router';
import { ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  YStack,
  XStack,
  Text,
  H2,
  Paragraph,
  Button,
  Progress,
  Separator,
} from 'tamagui';
import { Plus } from 'lucide-react-native';

import { useAppStore } from '@/store';
import type { Debt, DebtType } from '@/types/models';

// ── Hardcoded dark palette ───────────────────────────────────────────────────

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
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  return amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getActiveDebts(debts: Debt[]): Debt[] {
  return debts
    .filter((d) => d.closedAt === null)
    .sort((a, b) => a.remainingAmount - b.remainingAmount);
}

function getClosedDebts(debts: Debt[]): Debt[] {
  return debts
    .filter((d) => d.closedAt !== null)
    .sort((a, b) => {
      return new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime();
    });
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface TypeBadgeProps {
  type: DebtType;
}

function TypeBadge({ type }: TypeBadgeProps) {
  const { t } = useTranslation();
  return (
    <YStack
      px="$2"
      py="$1"
      rounded="$3"
      bg={C.border}
    >
      <Text fontFamily="$body" fontSize="$1" color={C.muted} fontWeight="600">
        {t(`onboarding.debts.types.${type}`)}
      </Text>
    </YStack>
  );
}

interface DebtCardProps {
  debt: Debt;
  isSnowballTarget: boolean;
  onPress: () => void;
  isClosed?: boolean;
}

function DebtCard({ debt, isSnowballTarget, onPress, isClosed = false }: DebtCardProps) {
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
        bg={C.card}
        borderWidth={1}
        borderColor={isSnowballTarget ? C.accent : C.border}
        borderLeftWidth={isSnowballTarget ? 3 : 1}
        rounded="$6"
        overflow="hidden"
        opacity={isClosed ? 0.5 : 1}
      >
        {/* Target label */}
        {isSnowballTarget ? (
          <YStack px="$4" pt="$3" pb="$1">
            <Text fontFamily="$body" fontSize="$2" color={C.accent} fontWeight="700" letterSpacing={0.8}>
              {t('debts.list.snowballTarget').toUpperCase()}
            </Text>
          </YStack>
        ) : null}

        {/* Header row */}
        <XStack px="$4" pt={isSnowballTarget ? '$1' : '$4'} pb="$2" items="center" justify="space-between">
          <YStack flex={1} mr="$3" gap="$1">
            <Text
              fontFamily="$body"
              fontSize="$5"
              fontWeight="700"
              color={isClosed ? C.muted : C.text}
              numberOfLines={1}
              textDecorationLine={isClosed ? 'line-through' : 'none'}
            >
              {debt.label}
            </Text>
          </YStack>
          <TypeBadge type={debt.type} />
        </XStack>

        {/* Progress bar */}
        <YStack px="$4" pb="$3" gap="$2">
          <Progress value={progressValue} size="$1" bg={C.border}>
            <Progress.Indicator bg={isSnowballTarget ? C.accent : C.textSec} />
          </Progress>

          {/* Amounts row */}
          <XStack justify="space-between" items="center">
            <YStack gap="$0.5">
              <Text fontFamily="$body" fontSize="$2" color={C.muted}>
                {t('debts.form.remainingAmount')}
              </Text>
              <Text fontFamily="$body" fontSize="$4" fontWeight="700" color={isSnowballTarget ? C.accent : C.text}>
                {formatAmount(debt.remainingAmount)} {currency}
              </Text>
            </YStack>

            <YStack gap="$0.5" items="flex-end">
              <Text fontFamily="$body" fontSize="$2" color={C.muted}>
                {t('debts.form.minimumPayment')}
              </Text>
              <Text fontFamily="$body" fontSize="$4" fontWeight="600" color={C.textSec}>
                {formatAmount(debt.minimumPayment)} {currency}
              </Text>
            </YStack>
          </XStack>

          {/* Original amount */}
          <Text fontFamily="$body" fontSize="$2" color={C.muted}>
            {formatAmount(paid)} / {formatAmount(debt.originalAmount)} {currency} ({Math.round(progressValue)}%)
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

  const activeDebts = getActiveDebts(debts);
  const closedDebts = getClosedDebts(debts);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <YStack px="$4" pt="$4" gap="$5">
            {/* Title + Add button */}
            <XStack items="center" justify="space-between">
              <H2 fontFamily="$body" fontWeight="800" color={C.text}>
                {t('debts.list.title')}
              </H2>
              <Button
                size="$3"
                bg="transparent"
                borderWidth={1}
                borderColor={C.accent}
                pressStyle={{ bg: (C.accentPress + '22') as typeof C.accentPress, borderColor: C.accentPress }}
                icon={<Plus size={16} color={C.accent} />}
                onPress={() => router.push('/debt/new')}
              >
                <Text fontFamily="$body" color={C.accent}>{t('debts.list.addDebt')}</Text>
              </Button>
            </XStack>

            {/* Empty state */}
            {activeDebts.length === 0 && closedDebts.length === 0 ? (
              <YStack
                bg={C.card}
                borderWidth={1}
                borderColor={C.border}
                rounded="$6"
                p="$5"
                items="center"
                gap="$3"
              >
                <Paragraph fontFamily="$body" color={C.textSec} style={{ textAlign: 'center' }}>
                  {t('debts.list.empty')}
                </Paragraph>
                <Button
                  size="$4"
                  bg={C.accent}
                  pressStyle={{ bg: C.accentPress }}
                  icon={<Plus size={18} color={C.bg} />}
                  onPress={() => router.push('/debt/new')}
                >
                  <Text fontFamily="$body" color={C.bg} fontWeight="700">{t('debts.list.addDebt')}</Text>
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
                  <Separator flex={1} borderColor={C.border} />
                  <Text fontFamily="$body" fontSize="$2" color={C.muted} fontWeight="600" letterSpacing={0.8}>
                    {t('debts.list.closedSection').toUpperCase()}
                  </Text>
                  <Separator flex={1} borderColor={C.border} />
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
