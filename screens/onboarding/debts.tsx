import { Badge } from '@/components/badge';
import { formatAmount } from '@/lib/format';
import { useAppStore } from '@/store';
import { Plus, X } from '@tamagui/lucide-icons-2';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, H2, Paragraph, Separator, Text, XStack, YStack } from 'tamagui';

export default function OnboardingDebtsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const debts = useAppStore((s) => s.debts);
  const removeDebt = useAppStore((s) => s.removeDebt);

  const hasDebts = debts.length > 0;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack px="$5" pt="$4" pb="$5" gap="$5" flex={1}>
          <H2>{t('onboarding.debts.title')}</H2>

          {/* Debt list */}
          <YStack gap="$3">
            {!hasDebts ? (
              <Paragraph color="$color9" style={{ textAlign: 'center' }} py="$6">
                {t('debts.list.empty')}
              </Paragraph>
            ) : (
              debts.map((debt) => (
                <Pressable key={debt.id} onPress={() => router.push(`/debt/${debt.id}?onboarding=1`)}>
                <Card borderWidth={1} borderColor="$color5" rounded="$4" p="$4" bg="$color3">
                  <XStack justify="space-between" items="flex-start">
                    <YStack flex={1} gap="$1.5">
                      <Text color="$color12" fontSize="$5" fontWeight="600">
                        {debt.label}
                      </Text>
                      <Badge label={t(`onboarding.debts.types.${debt.type}`)} />
                    </YStack>
                    <Pressable
                      onPress={() => removeDebt(debt.id)}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.delete')}
                      hitSlop={8}
                    >
                      <YStack p="$2" bg="$color4" rounded="$10">
                        <X size={16} color="$color11" />
                      </YStack>
                    </Pressable>
                  </XStack>

                  <Separator borderColor="$color5" my="$2.5" />

                  <XStack gap="$6">
                    <YStack gap="$1">
                      <Text color="$color9" fontSize="$2" textTransform="uppercase" letterSpacing={0.4}>
                        {t('debts.form.remainingAmount')}
                      </Text>
                      <XStack items="baseline" gap="$1">
                        <Text color="$color12" fontSize="$5" fontWeight="700">
                          {formatAmount(debt.remainingAmount)}
                        </Text>
                        <Text color="$color9" fontSize="$2">
                          {t('common.currency')}
                        </Text>
                      </XStack>
                    </YStack>
                    {debt.minimumPayment > 0 && (
                      <YStack gap="$1">
                        <Text color="$color9" fontSize="$2" textTransform="uppercase" letterSpacing={0.4}>
                          {t('debts.form.minimumPayment')}
                        </Text>
                        <XStack items="baseline" gap="$1">
                          <Text color="$color12" fontSize="$5" fontWeight="700">
                            {formatAmount(debt.minimumPayment)}
                          </Text>
                          <Text color="$color9" fontSize="$2">
                            {t('common.currency')}
                          </Text>
                        </XStack>
                      </YStack>
                    )}
                  </XStack>
                </Card>
                </Pressable>
              ))
            )}
          </YStack>

          {/* Add debt button */}
          <Button
            size="$4"
            bg="transparent"
            borderWidth={1}
            borderColor="$color5"
            rounded="$4"
            icon={<Plus size={18} color="$color11" />}
            onPress={() => router.push('/debt/new')}
          >
            {t('onboarding.debts.addDebt')}
          </Button>

          <YStack flex={1} />

          {/* Bottom navigation */}
          <YStack gap="$3">
            {hasDebts ? (
              <Button
                theme="accent"
                size="$5"
                rounded="$4"
                onPress={() => router.push('/onboarding/strict-mode')}
              >
                {t('common.continue')}
              </Button>
            ) : (
              <Button
                size="$5"
                bg="transparent"
                rounded="$4"
                pressStyle={{ opacity: 0.7 }}
                onPress={() => router.push('/onboarding/strict-mode')}
              >
                <Text color="$color9">{t('onboarding.debts.skip')}</Text>
              </Button>
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
