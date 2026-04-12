import { ShieldCheck, TrendingDown, Wallet } from '@tamagui/lucide-icons-2';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, H1, Paragraph, XStack, YStack } from 'tamagui';

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <XStack items="center" gap="$3.5">
      <YStack
        width={44}
        height={44}
        rounded="$4"
        bg="$accent3"
        items="center"
        justify="center"
      >
        {icon}
      </YStack>
      <Paragraph flex={1} fontSize="$4" lineHeight={22} color="$color11">
        {text}
      </Paragraph>
    </XStack>
  );
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} px="$5" pb="$4">
        {/* Hero — animation + title */}
        <YStack flex={3} justify="center" items="center" gap="$3">
          <LottieView
            source={require('@/assets/animations/wallet.json')}
            autoPlay
            loop
            style={{ width: 200, height: 200 }}
          />
          <H1 fontSize="$10" letterSpacing={-1}>
            {t('common.appName')}
          </H1>
        </YStack>

        {/* Feature highlights */}
        <YStack flex={2} justify="center" gap="$5" px="$2">
          <FeatureRow
            icon={<Wallet color="$accent11" size={22} />}
            text={t('onboarding.welcome.feature1')}
          />
          <FeatureRow
            icon={<TrendingDown color="$accent11" size={22} />}
            text={t('onboarding.welcome.feature2')}
          />
          <FeatureRow
            icon={<ShieldCheck color="$accent11" size={22} />}
            text={t('onboarding.welcome.privacy')}
          />
        </YStack>

        {/* CTA */}
        <Button
          theme="accent"
          size="$5"
          rounded="$4"
          onPress={() => router.push('/onboarding/needs-intro')}
        >
          {t('onboarding.welcome.cta')}
        </Button>
      </YStack>
    </SafeAreaView>
  );
}
