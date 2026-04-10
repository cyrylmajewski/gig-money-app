import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, H2, Button } from 'tamagui';
import { useAppStore } from '@/store';


export default function ReadyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setOnboardingCompleted = useAppStore((s) => s.setOnboardingCompleted);

  function handlePress() {
    setOnboardingCompleted(true);
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <YStack
        flex={1}
        px="$5"
      >
      <YStack flex={1} />

      <YStack items="center" gap="$5">
        <H2


          style={{ textAlign: 'center' }}
        >
          {t('onboarding.ready.title')}
        </H2>

        <Text

          lineHeight={32}

          style={{ textAlign: 'center' }}
        >
          {t('onboarding.ready.commitment')}
        </Text>
      </YStack>

      <YStack flex={1} />

      <Button
        size="$5"
        mb="$3"
        onPress={handlePress}
      >
        <Text>{t('onboarding.ready.cta')}</Text>
      </Button>
      </YStack>
    </SafeAreaView>
  );
}
