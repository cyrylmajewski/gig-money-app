import { AlertTriangle, ArrowLeft, Check } from '@tamagui/lucide-icons-2';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  H3,
  Paragraph,
  Separator,
  Text,
  Theme,
  XStack,
  YStack,
} from 'tamagui';

import { getCreditorById } from '@/lib/creditors';
import { formatAmount } from '@/lib/format';
import { parseJsonParam } from '@/lib/route-params';
import { useAppStore } from '@/store';
import type {
  DeferredPaymentReason,
  DeferredPaymentReasons,
} from '@/types/models';

const L4_REASONS: Array<{
  value: DeferredPaymentReason;
  titleKey: string;
  bodyKey: string;
}> = [
  {
    value: 'postponing',
    titleKey: 'income.allocate.guardrail.l4.reasonPostponingTitle',
    bodyKey: 'income.allocate.guardrail.l4.reasonPostponingBody',
  },
  {
    value: 'agreed_delay',
    titleKey: 'income.allocate.guardrail.l4.reasonAgreedDelayTitle',
    bodyKey: 'income.allocate.guardrail.l4.reasonAgreedDelayBody',
  },
  {
    value: 'other',
    titleKey: 'income.allocate.guardrail.l4.reasonOtherTitle',
    bodyKey: 'income.allocate.guardrail.l4.reasonOtherBody',
  },
];

export default function NoContributionScreen() {
  const { t } = useTranslation();
  const { back, push } = useRouter();
  const params = useLocalSearchParams<{
    amount: string;
    source?: string;
    allocation: string;
    reasons: string;
  }>();

  const debts = useAppStore((s) => s.debts);
  const currency = t('common.currency');

  const activeDebts = debts.filter(
    (d) => d.closedAt === null && d.remainingAmount > 0
  );

  const [selectedReason, setSelectedReason] =
    useState<DeferredPaymentReason | null>(null);
  const completedRef = useRef(false);

  function handleConfirm() {
    if (completedRef.current || selectedReason === null) return;
    completedRef.current = true;
    const reasons = parseJsonParam<DeferredPaymentReasons>(params.reasons, {});
    for (const debt of activeDebts) {
      reasons[`debt:${debt.id}`] = selectedReason;
    }
    push({
      pathname: '/income/confirm',
      params: {
        amount: params.amount ?? '0',
        source: params.source ?? '',
        allocation: params.allocation,
        reasons: JSON.stringify(reasons),
      },
    });
  }

  function getCreditorLabel(debtId: string): string {
    const debt = activeDebts.find((d) => d.id === debtId);
    if (!debt) return '';
    if (debt.creditorId) {
      const creditor = getCreditorById(debt.creditorId);
      if (creditor) return creditor.name;
    }
    return t(`debts.creditorKinds.${debt.creditorKind}`, {
      defaultValue: debt.creditorKind,
    });
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('income.allocate.guardrail.l4.title'),
          headerLeft: () => (
            <Pressable
              onPress={back}
              hitSlop={8}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <ArrowLeft size={20} color="$color11" />
            </Pressable>
          ),
        }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <YStack flex={1}>
          <ScrollView>
            <YStack px="$4" pt="$4" pb="$6" gap="$4">
              <Theme name="error">
                <YStack
                  bg="$color3"
                  borderWidth={1}
                  borderLeftWidth={3}
                  borderColor="$color7"
                  borderLeftColor="$color9"
                  rounded="$6"
                  p="$4"
                  gap="$3"
                >
                  <XStack items="center" gap="$2">
                    <AlertTriangle size={18} color="$color9" />
                    <H3 color="$color11" fontSize="$5" fontWeight="700">
                      {t('income.allocate.guardrail.l4.title')}
                    </H3>
                  </XStack>
                  <Paragraph color="$color11" fontSize="$3">
                    {t('income.allocate.guardrail.l4.subtitle')}
                  </Paragraph>
                </YStack>
              </Theme>

              {activeDebts.length > 0 && (
                <YStack
                  bg="$color2"
                  borderWidth={1}
                  borderColor="$color4"
                  rounded="$6"
                  px="$4"
                >
                  {activeDebts.map((debt, i) => (
                    <YStack key={debt.id}>
                      <XStack py="$3" justify="space-between" items="center">
                        <YStack flex={1} pr="$3" gap="$0.5">
                          <Text color="$color11" fontWeight="600" fontSize="$3">
                            {debt.label}
                          </Text>
                          <Text color="$color9" fontSize="$2">
                            {getCreditorLabel(debt.id)}
                          </Text>
                        </YStack>
                        <XStack items="center" gap="$2">
                          <Text color="$color9" fontSize="$3">
                            {formatAmount(debt.minimumPayment)} {currency}
                          </Text>
                          <Theme name="error">
                            <Text
                              color="$color9"
                              fontSize="$3"
                              fontWeight="700"
                            >
                              → 0 {currency}
                            </Text>
                          </Theme>
                        </XStack>
                      </XStack>
                      {i < activeDebts.length - 1 && (
                        <Separator borderColor="$color3" />
                      )}
                    </YStack>
                  ))}
                </YStack>
              )}

              <YStack gap="$3">
                <YStack gap="$1">
                  <Text color="$color11" fontWeight="600" fontSize="$3">
                    {t('income.allocate.guardrail.l4.reasonTitle')}
                  </Text>
                  <Text color="$color9" fontSize="$2" lineHeight={18}>
                    {t('income.allocate.guardrail.l4.reasonSubtitle')}
                  </Text>
                </YStack>

                {L4_REASONS.map((reason) => {
                  const selected = selectedReason === reason.value;
                  return (
                    <Pressable
                      key={reason.value}
                      onPress={() => setSelectedReason(reason.value)}
                    >
                      <XStack
                        bg={selected ? '$accent3' : '$color2'}
                        borderWidth={1}
                        borderColor={selected ? '$accent7' : '$color4'}
                        rounded="$5"
                        p="$3"
                        gap="$3"
                        items="flex-start"
                      >
                        <YStack
                          width={22}
                          height={22}
                          rounded="$10"
                          borderWidth={2}
                          borderColor={selected ? '$accent9' : '$color6'}
                          bg={selected ? '$accent9' : 'transparent'}
                          items="center"
                          justify="center"
                          mt="$0.5"
                        >
                          {selected && <Check size={13} color="white" />}
                        </YStack>
                        <YStack flex={1} gap="$1">
                          <Text
                            color={selected ? '$accent11' : '$color11'}
                            fontWeight="600"
                            fontSize="$3"
                          >
                            {t(reason.titleKey)}
                          </Text>
                          <Text color="$color9" fontSize="$2" lineHeight={18}>
                            {t(reason.bodyKey)}
                          </Text>
                        </YStack>
                      </XStack>
                    </Pressable>
                  );
                })}
              </YStack>
            </YStack>
          </ScrollView>

          <YStack px="$4" pt="$3" pb="$4" gap="$3">
            <Button
              size="$5"
              theme="error"
              bg="$color5"
              pressStyle={{ bg: '$color6' }}
              onPress={handleConfirm}
              disabled={selectedReason === null}
              opacity={selectedReason === null ? 0.45 : 1}
            >
              <Button.Text color="white" fontWeight="600" fontSize="$4">
                {t('income.allocate.guardrail.l4.confirm')}
              </Button.Text>
            </Button>

            <Button
              size="$4"
              variant="outlined"
              borderColor="$color6"
              bg="transparent"
              onPress={back}
              pressStyle={{ bg: '$color3' }}
            >
              <Button.Text color="$color11">
                {t('income.allocate.guardrail.l4.back')}
              </Button.Text>
            </Button>
          </YStack>
        </YStack>
      </SafeAreaView>
    </>
  );
}
