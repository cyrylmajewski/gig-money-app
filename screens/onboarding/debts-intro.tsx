import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, H1, Paragraph, YStack } from 'tamagui';

export default function DebtsIntroScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <YStack flex={1} px="$5">
        <YStack flex={1} />

        <YStack items="center" gap="$5" px="$2">
          <LottieView
            source={require('@/assets/animations/loan.json')}
            autoPlay
            loop
            style={{ width: 200, height: 200 }}
          />

          <H1 fontSize="$9" letterSpacing={-0.5} style={{ textAlign: 'center' }}>
            {t('onboarding.debtsIntro.title')}
          </H1>

          <Paragraph
            color="$color11"
            fontSize="$5"
            lineHeight={28}
            style={{ textAlign: 'center' }}
          >
            {t('onboarding.debtsIntro.subtitle')}
          </Paragraph>
        </YStack>

        <YStack flex={1} />

        <Button
          theme="accent"
          size="$5"
          rounded="$4"
          mb="$3"
          onPress={() => router.push('/onboarding/debts')}
        >
          {t('onboarding.debtsIntro.cta')}
        </Button>
      </YStack>
    </SafeAreaView>
  );
}
