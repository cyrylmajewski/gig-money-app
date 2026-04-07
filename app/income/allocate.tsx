import { useMemo } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import {
  YStack,
  XStack,
  H3,
  Text,
  Button,
  Paragraph,
  Separator,
  ScrollView,
  Theme,
} from 'tamagui';
import { useAppStore } from '@/store';
import { distributeIncome } from '@/lib/distribution';
import type { Allocation, AppState } from '@/types/models';

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPLN(amount: number): string {
  return amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Row component ─────────────────────────────────────────────────────────────

interface AllocationRowProps {
  label: string;
  amount: number;
  sublabel?: string;
  highlight?: boolean;
  currency: string;
}

function AllocationRow({ label, amount, sublabel, highlight, currency }: AllocationRowProps) {
  return (
    <XStack
      py="$3"
      items="center"
      justify="space-between"
    >
      <YStack flex={1} gap="$1" pr="$4">
        <Text
          fontFamily="$body"
          fontSize="$4"
          fontWeight={highlight ? '700' : '500'}
          color={highlight ? C.text : C.textSec}
        >
          {label}
        </Text>
        {sublabel ? (
          <Paragraph fontFamily="$body" fontSize="$2" color={C.muted}>
            {sublabel}
          </Paragraph>
        ) : null}
      </YStack>
      <Text
        fontFamily="$body"
        fontSize="$5"
        fontWeight="700"
        color={highlight ? C.text : C.textSec}
        minW={80}
        style={{ textAlign: 'right' }}
      >
        {formatPLN(amount)} {currency}
      </Text>
    </XStack>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AllocateScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ amount: string; source?: string }>();

  // Read state slices individually for performance
  const monthlyNeeds = useAppStore((s) => s.monthlyNeeds);
  const debts = useAppStore((s) => s.debts);
  const deferredPayments = useAppStore((s) => s.deferredPayments);
  const monthlyCoverage = useAppStore((s) => s.monthlyCoverage);
  const settings = useAppStore((s) => s.settings);

  const incomeAmount = parseFloat(params.amount ?? '0');
  const currency = t('common.currency');

  // Build a minimal AppState snapshot for the pure distributeIncome function
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
      settings,
    }),
    [monthlyNeeds, debts, deferredPayments, monthlyCoverage, settings],
  );

  const allocation: Allocation = useMemo(
    () => distributeIncome(incomeAmount, stateSnapshot),
    [incomeAmount, stateSnapshot],
  );

  // Shortfall: portion of monthly needs that income could not cover
  const shortfall = useMemo(() => {
    const covered =
      allocation.needs.housing +
      allocation.needs.food +
      allocation.needs.transport +
      allocation.needs.other;
    const totalNeeds =
      monthlyNeeds.housing +
      monthlyNeeds.food +
      monthlyNeeds.transport +
      monthlyNeeds.other;
    return Math.max(0, totalNeeds - covered);
  }, [allocation, monthlyNeeds]);

  // Debt label lookup
  const debtById = useMemo(() => {
    return Object.fromEntries(debts.map((d) => [d.id, d]));
  }, [debts]);

  function handleConfirm() {
    router.push({
      pathname: '/income/confirm',
      params: {
        amount: params.amount,
        source: params.source ?? '',
        allocation: JSON.stringify(allocation),
      },
    });
  }

  const hasDeferred = allocation.deferredPayments > 0;
  const hasMinimums = Object.keys(allocation.minimumPayments).length > 0;
  const hasExtra = allocation.extraDebtPayment !== null;

  return (
    <>
      <Stack.Screen
        options={{
          title: t('income.allocate.title'),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text fontFamily="$body" color={C.accent} fontSize="$4">
                {t('common.back')}
              </Text>
            </Pressable>
          ),
        }}
      />

      <YStack flex={1}>
        <ScrollView>
          <YStack px="$5" pt="$4" pb="$6" gap="$4">

            {/* Received amount header */}
            <XStack items="center" gap="$2">
              <Text fontFamily="$body" color={C.muted} fontSize="$4">
                {t('income.allocate.receivedLabel')}
              </Text>
              <Text fontFamily="$body" fontSize="$5" fontWeight="700" color={C.text}>
                {formatPLN(incomeAmount)} {currency}
              </Text>
            </XStack>

            {/* Loss aversion shortfall warning */}
            {shortfall > 0 && (
              <YStack p="$4" rounded="$4" bg="#2A1215" borderWidth={1} borderColor="#5C2B2E">
                <YStack gap="$2">
                  <H3 fontFamily="$body" fontSize="$4" fontWeight="700" color={C.error}>
                    {t('income.allocate.shortfall.title')}
                  </H3>
                  <Paragraph fontFamily="$body" fontSize="$4" fontWeight="700" color={C.error}>
                    {t('income.allocate.shortfall.lossWarning', {
                      amount: formatPLN(shortfall),
                      currency,
                    })}
                  </Paragraph>
                  <Paragraph fontFamily="$body" fontSize="$3" color={C.textSec}>
                    {t('income.allocate.shortfall.advice')}
                  </Paragraph>
                </YStack>
              </YStack>
            )}

            {/* Allocation breakdown card */}
            <YStack p="$4" rounded="$5" bg={C.card} borderWidth={1} borderColor={C.border}>
              <YStack gap="$0">

                {/* Deferred payments */}
                {hasDeferred && (
                  <>
                    <AllocationRow
                      label={t('income.allocate.rows.deferred')}
                      amount={allocation.deferredPayments}
                      sublabel={t('income.allocate.rows.deferredSublabel')}
                      highlight
                      currency={currency}
                    />
                    <Separator borderColor={C.border} />
                  </>
                )}

                {/* Housing */}
                {allocation.needs.housing > 0 && (
                  <>
                    <AllocationRow
                      label={t('income.allocate.rows.housing')}
                      amount={allocation.needs.housing}
                      currency={currency}
                    />
                    <Separator borderColor={C.border} />
                  </>
                )}

                {/* Food */}
                {allocation.needs.food > 0 && (
                  <>
                    <AllocationRow
                      label={t('income.allocate.rows.food')}
                      amount={allocation.needs.food}
                      currency={currency}
                    />
                    <Separator borderColor={C.border} />
                  </>
                )}

                {/* Minimum payments per debt */}
                {hasMinimums &&
                  Object.entries(allocation.minimumPayments).map(([debtId, amt]) => {
                    const debt = debtById[debtId];
                    return (
                      <YStack key={debtId}>
                        <AllocationRow
                          label={t('income.allocate.rows.minimumPayment', {
                            label: debt?.label ?? debtId,
                          })}
                          amount={amt}
                          sublabel={t('income.allocate.rows.minimumPaymentSublabel')}
                          currency={currency}
                        />
                        <Separator borderColor={C.border} />
                      </YStack>
                    );
                  })}

                {/* Transport */}
                {allocation.needs.transport > 0 && (
                  <>
                    <AllocationRow
                      label={t('income.allocate.rows.transport')}
                      amount={allocation.needs.transport}
                      currency={currency}
                    />
                    <Separator borderColor={C.border} />
                  </>
                )}

                {/* Other needs */}
                {allocation.needs.other > 0 && (
                  <>
                    <AllocationRow
                      label={t('income.allocate.rows.other')}
                      amount={allocation.needs.other}
                      currency={currency}
                    />
                    <Separator borderColor={C.border} />
                  </>
                )}

                {/* Extra snowball payment — highlighted as a win */}
                {hasExtra && allocation.extraDebtPayment && (
                  <>
                    <Theme name="green">
                      <AllocationRow
                        label={t('income.allocate.rows.extraPayment', {
                          label:
                            debtById[allocation.extraDebtPayment.debtId]?.label ??
                            t('income.allocate.rows.extraPaymentFallback'),
                        })}
                        amount={allocation.extraDebtPayment.amount}
                        sublabel={t('income.allocate.rows.extraPaymentSublabel')}
                        highlight
                        currency={currency}
                      />
                    </Theme>
                    <Separator borderColor={C.border} />
                  </>
                )}

                {/* Unallocated surplus */}
                {allocation.unallocated > 0 && (
                  <AllocationRow
                    label={t('income.allocate.rows.unallocated')}
                    amount={allocation.unallocated}
                    sublabel={t('income.allocate.rows.unallocatedSublabel')}
                    currency={currency}
                  />
                )}
              </YStack>
            </YStack>

            {/* Default bias note */}
            <Paragraph fontFamily="$body" fontSize="$3" color={C.muted} style={{ textAlign: 'center' }}>
              {t('income.allocate.defaultBiasNote')}
            </Paragraph>
          </YStack>
        </ScrollView>

        {/* Sticky confirm button — default bias: prominent one-tap confirm */}
        <YStack
          px="$5"
          pt="$3"
          pb={insets.bottom + 12}
          bg={C.bg}
          borderTopWidth={1}
          borderColor={C.border}
        >
          <Button
            size="$5"
            bg={C.accent}
            pressStyle={{ bg: C.accentPress }}
            onPress={handleConfirm}
            accessibilityRole="button"
          >
            <Text fontFamily="$body" color={C.bg} fontWeight="700">{t('income.allocate.confirm')}</Text>
          </Button>
        </YStack>
      </YStack>
    </>
  );
}
