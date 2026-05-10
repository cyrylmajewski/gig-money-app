import { Crosshair, Plus } from '@tamagui/lucide-icons-2';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';
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

import { Badge } from '@/components/badge';
import { IncomeFab } from '@/components/income-fab';
import { SnowballTargetPicker } from '@/components/snowball-target-picker';
import { sortCopy } from '@/lib/array';
import { useAppStore } from '@/store';
import { formatAmount } from '@/lib/format';
import { getActiveDebts, getEffectiveSnowballTarget } from '@/lib/distribution';
import type { Debt } from '@/types/models';
import type { SnowballTargetSource } from '@/lib/distribution';

const SOURCE_KEY: Record<SnowballTargetSource, string> = {
  manual: 'home.snowball.targetSourceManual',
  'auto-smallest': 'home.snowball.targetSourceAutoSmallest',
  'auto-no-cc': 'home.snowball.targetSourceAutoNoCc',
  'auto-fallback-cc': 'home.snowball.targetSourceAutoFallbackCc',
};

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
        bg={isSnowballTarget ? '$color3' : '$color2'}
        borderWidth={1}
        borderLeftWidth={isSnowballTarget ? 3 : 1}
        borderColor={isSnowballTarget ? '$color4' : '$color4'}
        borderLeftColor={isSnowballTarget ? '$accent9' : '$color4'}
        rounded="$6"
        overflow="hidden"
        opacity={isClosed ? 0.5 : 1}
      >
        {isSnowballTarget ? (
          <XStack px="$4" pt="$3" pb="$1" items="center" gap="$2">
            <Crosshair size={12} color="$accent11" />
            <Text color="$accent11" fontSize="$1" letterSpacing={0.8}>
              {t('debts.list.snowballTarget').toUpperCase()}
            </Text>
          </XStack>
        ) : null}

        <XStack
          px="$4"
          pt={isSnowballTarget ? '$1' : '$4'}
          pb="$2"
          items="center"
          justify="space-between"
        >
          <H3
            flex={1}
            mr="$3"
            numberOfLines={1}
            textDecorationLine={isClosed ? 'line-through' : 'none'}
          >
            {debt.label}
          </H3>
          <Badge label={t(`onboarding.debts.types.${debt.type}`)} />
        </XStack>

        <Separator borderColor={isSnowballTarget ? '$color4' : '$color3'} />

        <YStack px="$4" py="$3" gap="$3">
          <Progress value={progressValue} size="$2">
            <Progress.Indicator bg={isSnowballTarget ? '$accent9' : undefined} />
          </Progress>

          <XStack justify="space-between" items="center">
            <YStack gap="$0.5">
              <Text color="$color9" fontSize="$2">
                {t('debts.form.remainingAmount')}
              </Text>
              <Text color="$color11" fontSize="$4" fontWeight="600">
                {formatAmount(debt.remainingAmount)} {currency}
              </Text>
            </YStack>

            <YStack gap="$0.5" items="flex-end">
              <Text color="$color9" fontSize="$2">
                {t('debts.form.minimumPayment')}
              </Text>
              <Text color="$color11" fontSize="$4">
                {formatAmount(debt.minimumPayment)} {currency}
              </Text>
            </YStack>
          </XStack>

          <Text color="$color8" fontSize="$2">
            {formatAmount(paid)} / {formatAmount(debt.originalAmount)}{' '}
            {currency} ({Math.round(progressValue)}%)
          </Text>
        </YStack>
      </YStack>
    </Pressable>
  );
}

export default function DebtsScreen() {
  const { t } = useTranslation();
  const { push } = useRouter();

  const debts = useAppStore((s) => s.debts);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [pickerOpen, setPickerOpen] = useState(false);

  const rawActive = useMemo(() => getActiveDebts(debts), [debts]);
  const { debt: targetDebt, source: targetSource } = useMemo(
    () => getEffectiveSnowballTarget(rawActive, settings),
    [rawActive, settings],
  );

  const activeDebts = useMemo(
    () =>
      sortCopy(rawActive, (a, b) => {
        if (targetDebt && a.id === targetDebt.id) return -1;
        if (targetDebt && b.id === targetDebt.id) return 1;
        return a.remainingAmount - b.remainingAmount;
      }),
    [rawActive, targetDebt],
  );

  const closedDebts = useMemo(() => getClosedDebts(debts), [debts]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        contentInsetAdjustmentBehavior="automatic"
      >
          <YStack px="$4" pt="$4" gap="$5">
            <XStack items="center" justify="space-between">
              <H2>{t('debts.list.title')}</H2>
              <Button
                size="$3"
                variant="outlined"
                icon={<Plus size={14} />}
                onPress={() => push('/debt/new')}
              >
                <Button.Text>{t('debts.list.addDebt')}</Button.Text>
              </Button>
            </XStack>

            {activeDebts.length === 0 && closedDebts.length === 0 ? (
              <YStack
                bg="$color2"
                rounded="$6"
                p="$5"
                items="center"
                gap="$3"
              >
                <Paragraph color="$color9" style={{ textAlign: 'center' }}>
                  {t('debts.list.empty')}
                </Paragraph>
                <Button
                  size="$5"
                  bg="$accent9"
                  pressStyle={{ bg: '$accent10' }}
                  icon={<Plus size={18} />}
                  onPress={() => push('/debt/new')}
                >
                  <Button.Text color="$color12">
                    {t('debts.list.addDebt')}
                  </Button.Text>
                </Button>
              </YStack>
            ) : null}

            {activeDebts.length > 0 ? (
              <YStack gap="$3">
                {activeDebts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    isSnowballTarget={debt.id === targetDebt?.id}
                    onPress={() => push(`/debt/${debt.id}`)}
                  />
                ))}

                {targetDebt ? (
                  <YStack px="$1" gap="$1">
                    <Text color="$color9" fontSize="$2" lineHeight={18}>
                      {t(SOURCE_KEY[targetSource])}
                    </Text>
                    <Pressable
                      onPress={() => setPickerOpen(true)}
                      hitSlop={8}
                    >
                      <Text color="$accent11" fontSize="$2" fontWeight="600">
                        {t('debts.targetPicker.pickAnother')}
                      </Text>
                    </Pressable>
                  </YStack>
                ) : null}
              </YStack>
            ) : null}

            <SnowballTargetPicker
              open={pickerOpen}
              onOpenChange={setPickerOpen}
              debts={activeDebts}
              currentOverride={settings.snowballTargetOverride}
              effectiveTargetId={targetDebt?.id ?? null}
              onSelect={(debtId) => {
                updateSettings({ snowballTargetOverride: debtId });
                setPickerOpen(false);
              }}
            />

            {closedDebts.length > 0 ? (
              <YStack gap="$3">
                <XStack items="center" gap="$3">
                  <Separator flex={1} />
                  <Text color="$color8" fontSize="$2" letterSpacing={0.8}>
                    {t('debts.list.closedSection').toUpperCase()}
                  </Text>
                  <Separator flex={1} />
                </XStack>

                {closedDebts.map((debt) => (
                  <DebtCard
                    key={debt.id}
                    debt={debt}
                    isSnowballTarget={false}
                    onPress={() => push(`/debt/${debt.id}`)}
                    isClosed
                  />
                ))}
              </YStack>
            ) : null}
          </YStack>
      </ScrollView>
      <IncomeFab />
    </>
  );
}
