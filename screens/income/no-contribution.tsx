import { AlertTriangle, ArrowLeft } from '@tamagui/lucide-icons-2';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  H3,
  Paragraph,
  Separator,
  Text,
  TextArea,
  Theme,
  XStack,
  YStack,
} from 'tamagui';

import { getCreditorById } from '@/lib/creditors';
import { formatAmount } from '@/lib/format';
import { parseJsonParam } from '@/lib/route-params';
import { useAppStore } from '@/store';
import type { DeferredPaymentReasons } from '@/types/models';

const HOLD_DURATION = 3000;

export default function NoContributionScreen() {
  const { t } = useTranslation();
  const { back, push } = useRouter();
  const params = useLocalSearchParams<{
    amount: string;
    source?: string;
    allocation: string;
    reasons: string;
    wasAdjustedByUser: string;
  }>();

  const debts = useAppStore((s) => s.debts);
  const currency = t('common.currency');

  const activeDebts = debts.filter(
    (d) => d.closedAt === null && d.remainingAmount > 0,
  );

  const [note, setNote] = useState('');
  const completedRef = useRef(false);
  const progress = useSharedValue(0);

  const noteValid = note.trim().length >= 10;
  const canConfirm = noteValid;

  function handleConfirm() {
    if (completedRef.current) return;
    completedRef.current = true;
    const reasons = parseJsonParam<DeferredPaymentReasons>(params.reasons, {});
    for (const debt of activeDebts) {
      reasons[`debt:${debt.id}`] = 'other';
    }
    push({
      pathname: '/income/confirm',
      params: {
        amount: params.amount ?? '0',
        source: params.source ?? '',
        allocation: params.allocation,
        reasons: JSON.stringify(reasons),
        wasAdjustedByUser: params.wasAdjustedByUser ?? 'true',
        note,
      },
    });
  }

  function startHold() {
    if (!canConfirm || completedRef.current) return;
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: HOLD_DURATION, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(handleConfirm)();
      },
    );
  }

  function cancelHold() {
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
  }

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
  }));

  function getCreditorLabel(debtId: string): string {
    const debt = activeDebts.find((d) => d.id === debtId);
    if (!debt) return '';
    if (debt.creditorId) {
      const creditor = getCreditorById(debt.creditorId);
      if (creditor) return creditor.name;
    }
    return t(`debts.creditorKinds.${debt.creditorKind}`, { defaultValue: debt.creditorKind });
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={90}
        >
          <YStack flex={1}>
            <ScrollView keyboardShouldPersistTaps="handled">
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
                              <Text color="$color9" fontSize="$3" fontWeight="700">
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

                <YStack gap="$2">
                  <Text color="$color11" fontWeight="600" fontSize="$3">
                    {t('income.allocate.guardrail.l4.noteLabel')}
                  </Text>
                  <TextArea
                    value={note}
                    onChangeText={setNote}
                    placeholder={t('income.allocate.guardrail.l4.noteLabel')}
                    height={100}
                    borderColor={noteValid ? '$color6' : '$color5'}
                    bg="$color2"
                    color="$color11"
                    placeholderTextColor="$color8"
                    fontSize="$3"
                    p="$3"
                    rounded="$4"
                  />
                  {note.trim().length > 0 && !noteValid && (
                    <Theme name="error">
                      <Text color="$color9" fontSize="$2">
                        {t('income.allocate.guardrail.l4.noteMinLength', {
                          defaultValue: 'Minimum 10 znaków',
                        })}
                      </Text>
                    </Theme>
                  )}
                </YStack>
              </YStack>
            </ScrollView>

            <YStack px="$4" pt="$3" pb="$4" gap="$3">
              <Pressable
                onPressIn={startHold}
                onPressOut={cancelHold}
                disabled={!canConfirm}
              >
                <Theme name="error">
                  <YStack
                    bg={canConfirm ? '$color5' : '$color4'}
                    rounded="$4"
                    height={52}
                    items="center"
                    justify="center"
                    opacity={canConfirm ? 1 : 0.5}
                    overflow="hidden"
                  >
                    {canConfirm && (
                      <Animated.View
                        style={[
                          {
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            right: 0,
                            backgroundColor: 'rgba(220, 38, 38, 1)',
                            transformOrigin: 'left',
                          },
                          fillStyle,
                        ]}
                      />
                    )}
                    <Text
                      color={canConfirm ? 'white' : '$color9'}
                      fontWeight="600"
                      fontSize="$4"
                      z={1}
                    >
                      {t('income.allocate.guardrail.l4.confirmHold')}
                    </Text>
                  </YStack>
                </Theme>
              </Pressable>

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
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
