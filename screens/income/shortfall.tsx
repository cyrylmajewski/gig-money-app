import { AlertTriangle, Check, Phone, Timer } from '@tamagui/lucide-icons-2';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  H3,
  Paragraph,
  Separator,
  Text,
  XStack,
  YStack,
} from 'tamagui';

import { getCreditorById } from '@/lib/creditors';
import { getMonthKey } from '@/lib/distribution/helpers';
import { formatAmount } from '@/lib/format';
import { useAppStore } from '@/store';

interface ShortfallItem {
  kind: 'housing' | 'food' | 'debt';
  label: string;
  shortAmount: number;
  debtId?: string;
}

const CALL_TIMER_SECONDS = 30;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ShortfallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    amount: string;
    source?: string;
    allocation: string;
    shortfalls: string;
  }>();

  const debts = useAppStore((s) => s.debts);
  const strictMode = useAppStore((s) => s.settings.strictMode);
  const shortfallContacts = useAppStore((s) => s.shortfallContacts);
  const recordShortfallContact = useAppStore((s) => s.recordShortfallContact);
  const currency = t('common.currency');
  const currentMonth = getMonthKey(new Date());

  function wasContactedThisMonth(contactId: string): boolean {
    return shortfallContacts.some(
      (c) => c.contactId === contactId && c.month === currentMonth
    );
  }

  const shortfalls: ShortfallItem[] = JSON.parse(params.shortfalls ?? '[]');

  const debtShortfalls = shortfalls.filter((s) => s.kind === 'debt');
  const needShortfalls = shortfalls.filter((s) => s.kind !== 'debt');

  const bankContacts = debtShortfalls
    .map((s) => {
      const debt = debts.find((d) => d.id === s.debtId);
      if (!debt) return null;
      const creditor = getCreditorById(debt.creditorId);
      return creditor
        ? {
            ...creditor,
            debtLabel: debt.label,
            shortAmount: s.shortAmount,
          }
        : null;
    })
    .filter(Boolean);

  // ── Strict mode state ──────────────────────────────────────────────────
  const hasHousingShortfall = needShortfalls.some((s) => s.kind === 'housing');

  // Pre-populate from persisted monthly contacts
  const landlordAlreadyContacted = wasContactedThisMonth('landlord');
  const alreadyContactedBanks = new Set(
    bankContacts
      .filter((c) => c && wasContactedThisMonth(c.id))
      .map((c) => c!.id)
  );

  const [calledBanks, setCalledBanks] = useState<Set<string>>(new Set());
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [confirmedCall, setConfirmedCall] = useState<Set<string>>(alreadyContactedBanks);
  const [confirmedLandlord, setConfirmedLandlord] = useState(landlordAlreadyContacted);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer logic
  useEffect(() => {
    if (activeTimer && timerSeconds < CALL_TIMER_SECONDS) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }, [activeTimer, timerSeconds]);

  // Check if all strict mode requirements are met
  const allConfirmed = strictMode
    ? (() => {
        const bankIds = bankContacts.map((c) => c!.id);
        const allBanksConfirmed =
          bankIds.length === 0 ||
          bankIds.every((id) => confirmedCall.has(id));
        const landlordOk = !hasHousingShortfall || confirmedLandlord;
        return allBanksConfirmed && landlordOk;
      })()
    : true;

  function handleCall(phone: string, bankId: string) {
    const cleaned = phone.replace(/\s/g, '');
    Linking.openURL(`tel:${cleaned}`);
    if (strictMode) {
      setCalledBanks((prev) => new Set(prev).add(bankId));
      if (!activeTimer) {
        setActiveTimer(bankId);
        setTimerSeconds(0);
      }
    }
  }

  function handleConfirmBank(bankId: string) {
    setConfirmedCall((prev) => new Set(prev).add(bankId));
    recordShortfallContact(bankId);
  }

  function handleConfirmLandlord() {
    setConfirmedLandlord(true);
    recordShortfallContact('landlord');
  }

  function handleContinue() {
    router.push({
      pathname: '/income/confirm',
      params: {
        amount: params.amount,
        source: params.source ?? '',
        allocation: params.allocation,
      },
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: t('income.shortfall.title') }} />

      <YStack flex={1}>
        <ScrollView>
          <YStack px="$4" pt="$4" pb="$6" gap="$4">
            {/* Warning header */}
            <YStack
              theme="warning"
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
                <Text color="$color11" fontWeight="600">
                  {t('income.shortfall.title')}
                </Text>
              </XStack>
              <Paragraph color="$color11" fontSize="$3">
                {t('income.shortfall.subtitle')}
              </Paragraph>
            </YStack>

            {/* Shortfall items */}
            <YStack
              bg="$color2"
              borderWidth={1}
              borderColor="$color4"
              rounded="$6"
              px="$4"
            >
              {needShortfalls.map((item, i) => (
                <YStack key={item.kind}>
                  <YStack py="$3">
                    <Text color="$color11">
                      {item.kind === 'housing'
                        ? t('income.shortfall.housingShort', {
                            amount: formatAmount(item.shortAmount),
                            currency,
                          })
                        : t('income.shortfall.foodShort', {
                            amount: formatAmount(item.shortAmount),
                            currency,
                          })}
                    </Text>
                  </YStack>
                  {(i < needShortfalls.length - 1 ||
                    debtShortfalls.length > 0) && (
                    <Separator borderColor="$color3" />
                  )}
                </YStack>
              ))}
              {debtShortfalls.map((item, i) => (
                <YStack key={item.debtId ?? i}>
                  <YStack py="$3">
                    <Text color="$color11">
                      {t('income.shortfall.debtShort', {
                        amount: formatAmount(item.shortAmount),
                        currency,
                        label: item.label,
                      })}
                    </Text>
                  </YStack>
                  {i < debtShortfalls.length - 1 && (
                    <Separator borderColor="$color3" />
                  )}
                </YStack>
              ))}
            </YStack>

            {/* Housing shortfall — landlord advice */}
            {hasHousingShortfall && (
              <YStack
                bg="$color2"
                borderWidth={1}
                borderColor="$color4"
                rounded="$6"
                p="$4"
                gap="$3"
              >
                <H3 fontSize="$4">
                  {t('income.shortfall.landlordTitle')}
                </H3>
                <Paragraph color="$color9" fontSize="$3">
                  {t('income.shortfall.landlordTip')}
                </Paragraph>

                {/* Strict mode: confirm landlord contact */}
                {strictMode && (
                  <Pressable
                    onPress={() => !confirmedLandlord && handleConfirmLandlord()}
                    disabled={confirmedLandlord}
                  >
                    <XStack
                      bg={confirmedLandlord ? '$accent3' : '$color3'}
                      rounded="$4"
                      px="$4"
                      py="$3"
                      items="center"
                      gap="$2"
                    >
                      <YStack
                        width={20}
                        height={20}
                        rounded="$2"
                        borderWidth={2}
                        borderColor={
                          confirmedLandlord ? '$accent9' : '$color6'
                        }
                        bg={confirmedLandlord ? '$accent9' : 'transparent'}
                        items="center"
                        justify="center"
                      >
                        {confirmedLandlord && (
                          <Check size={12} color="white" />
                        )}
                      </YStack>
                      <Text
                        color={confirmedLandlord ? '$accent11' : '$color11'}
                        flex={1}
                        fontSize="$3"
                      >
                        {t('income.shortfall.confirmLandlord')}
                      </Text>
                    </XStack>
                  </Pressable>
                )}
              </YStack>
            )}

            {/* Bank contact cards */}
            {bankContacts.map((contact) => {
              if (!contact) return null;
              const previouslyContacted = alreadyContactedBanks.has(contact.id);
              const hasCalled = calledBanks.has(contact.id);
              const isConfirmed = confirmedCall.has(contact.id);
              const timerDone =
                hasCalled && timerSeconds >= CALL_TIMER_SECONDS;

              return (
                <YStack
                  key={contact.id}
                  bg="$color2"
                  borderWidth={1}
                  borderLeftWidth={3}
                  borderColor="$color4"
                  borderLeftColor={isConfirmed ? '$accent9' : '$accent7'}
                  rounded="$6"
                  p="$4"
                  gap="$3"
                >
                  <H3 fontSize="$4">
                    {t('income.shortfall.callBankTitle', {
                      bank: contact.name,
                    })}
                  </H3>

                  <YStack gap="$1">
                    <Text color="$color11" fontSize="$3">
                      {t('income.shortfall.callBankPhone', {
                        phone: contact.phone,
                      })}
                    </Text>
                    <Text color="$color9" fontSize="$2">
                      {t('income.shortfall.callBankHours', {
                        hours: contact.hours,
                      })}
                    </Text>
                  </YStack>

                  {/* Step-by-step script */}
                  <YStack gap="$2">
                    <Text
                      color="$color9"
                      fontSize="$2"
                      textTransform="uppercase"
                      letterSpacing={0.5}
                    >
                      {t('income.shortfall.stepsTitle')}
                    </Text>
                    {['step1', 'step2', 'step3', 'step4'].map(
                      (step, idx) => (
                        <XStack key={step} gap="$2" items="flex-start">
                          <Text
                            color="$accent9"
                            fontSize="$3"
                            fontWeight="600"
                          >
                            {idx + 1}.
                          </Text>
                          <Text color="$color11" flex={1} fontSize="$3">
                            {t(`income.shortfall.${step}`)}
                          </Text>
                        </XStack>
                      )
                    )}
                  </YStack>

                  {/* Call button */}
                  <Pressable
                    onPress={() => handleCall(contact.phone, contact.id)}
                  >
                    <XStack
                      bg="$accent3"
                      rounded="$4"
                      px="$4"
                      py="$3"
                      items="center"
                      justify="center"
                      gap="$2"
                    >
                      <Phone size={16} color="$accent11" />
                      <Text color="$accent11" fontWeight="600">
                        {t('income.shortfall.callNow')}
                      </Text>
                    </XStack>
                  </Pressable>

                  {/* Strict mode: already contacted or timer flow */}
                  {strictMode && previouslyContacted && !hasCalled && (
                    <XStack
                      bg="$accent3"
                      rounded="$4"
                      px="$4"
                      py="$3"
                      items="center"
                      gap="$2"
                    >
                      <Check size={14} color="$accent11" />
                      <Text color="$accent11" flex={1} fontSize="$3">
                        {t('income.shortfall.alreadyContacted')}
                      </Text>
                    </XStack>
                  )}

                  {strictMode && hasCalled && (
                    <YStack gap="$2">
                      {/* Timer */}
                      {!timerDone && (
                        <XStack
                          bg="$color3"
                          rounded="$4"
                          px="$4"
                          py="$2.5"
                          items="center"
                          gap="$2"
                        >
                          <Timer size={14} color="$color9" />
                          <Text color="$color9" fontSize="$3">
                            {t('income.shortfall.timerWaiting', {
                              time: formatTimer(
                                CALL_TIMER_SECONDS - timerSeconds
                              ),
                            })}
                          </Text>
                        </XStack>
                      )}

                      {/* Confirm checkbox — only after timer */}
                      {timerDone && !isConfirmed && (
                        <Pressable
                          onPress={() => handleConfirmBank(contact.id)}
                        >
                          <XStack
                            bg="$color3"
                            rounded="$4"
                            px="$4"
                            py="$3"
                            items="center"
                            gap="$2"
                          >
                            <YStack
                              width={20}
                              height={20}
                              rounded="$2"
                              borderWidth={2}
                              borderColor="$color6"
                              items="center"
                              justify="center"
                            />
                            <Text color="$color11" flex={1} fontSize="$3">
                              {t('income.shortfall.confirmCall')}
                            </Text>
                          </XStack>
                        </Pressable>
                      )}

                      {/* Confirmed state */}
                      {isConfirmed && (
                        <XStack
                          bg="$accent3"
                          rounded="$4"
                          px="$4"
                          py="$3"
                          items="center"
                          gap="$2"
                        >
                          <YStack
                            width={20}
                            height={20}
                            rounded="$2"
                            bg="$accent9"
                            items="center"
                            justify="center"
                          >
                            <Check size={12} color="white" />
                          </YStack>
                          <Text color="$accent11" flex={1} fontSize="$3">
                            {t('income.shortfall.confirmed')}
                          </Text>
                        </XStack>
                      )}
                    </YStack>
                  )}
                </YStack>
              );
            })}
          </YStack>
        </ScrollView>

        {/* Continue button */}
        <YStack px="$4" pt="$3" pb={insets.bottom + 12}>
          <Button
            size="$5"
            bg="$accent9"
            pressStyle={{ bg: '$accent10' }}
            onPress={handleContinue}
            opacity={allConfirmed ? 1 : 0.4}
            disabled={!allConfirmed}
          >
            <Button.Text color="$color12">
              {t('income.shortfall.continue')}
            </Button.Text>
          </Button>
        </YStack>
      </YStack>
    </>
  );
}
