import { useAppStore } from '@/store';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, H1, Paragraph, YStack } from 'tamagui';

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
      <YStack flex={1} px="$5">
        <YStack flex={1} />

        <YStack items="center" gap="$6">
          <LottieView
            source={require('@/assets/animations/coin.json')}
            autoPlay
            style={{ width: 160, height: 160 }}
          />

          <H1 style={{ textAlign: 'center' }}>{t('onboarding.ready.title')}</H1>

          <Paragraph
            color="$color11"
            fontSize="$5"
            lineHeight={28}
            style={{ textAlign: 'center' }}
          >
            {t('onboarding.ready.commitment')}
          </Paragraph>
        </YStack>

        <YStack flex={1} />

        <Button
          theme="accent"
          size="$5"
          rounded="$4"
          mb="$3"
          onPress={handlePress}
        >
          {t('onboarding.ready.cta')}
        </Button>
      </YStack>
    </SafeAreaView>
  );
}
