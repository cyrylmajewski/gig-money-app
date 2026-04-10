// import { Button } from '@/components/button';
import { ShieldCheck, TrendingDown, Wallet } from '@tamagui/lucide-icons-2';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, H1, Text, XStack, YStack } from 'tamagui';

function FeatureRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <XStack items="center" gap="$3">
      <YStack
        width={40}
        height={40}
        rounded="$3"
        items="center"
        justify="center"
      >
        {icon}
      </YStack>
      <Text flex={1} fontSize="$4" lineHeight={22}>
        {text}
      </Text>
    </XStack>
  );
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <YStack flex={1} px="$5" pb="$4">
        {/* Top spacer — pushes logo to upper-third */}
        <YStack flex={2} justify="center" items="center" pb="$6">
          <H1>{t('common.appName')}</H1>
        </YStack>

        {/* Feature highlights */}
        <YStack flex={1} justify="center" gap="$4">
          <FeatureRow
            icon={<Wallet color="$accent10" size={20} />}
            text={t('onboarding.welcome.feature1')}
          />
          <FeatureRow
            icon={<TrendingDown color="$accent10" size={20} />}
            text={t('onboarding.welcome.feature2')}
          />
          <FeatureRow
            icon={<ShieldCheck color="$accent10" size={20} />}
            text={t('onboarding.welcome.privacy')}
          />
        </YStack>

        {/* CTA */}
        <Button
          theme="accent"
          size="$5"
          onPress={() => router.push('/onboarding/needs')}
        >
          {t('onboarding.welcome.cta')}
        </Button>
      </YStack>
    </SafeAreaView>
  );
}
