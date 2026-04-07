import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { YStack, Text, H2, Button } from 'tamagui';
import { useAppStore } from '@/store';

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

export default function ReadyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setOnboardingCompleted = useAppStore((s) => s.setOnboardingCompleted);

  function handlePress() {
    setOnboardingCompleted(true);
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
      <YStack
        flex={1}
        px="$5"
      >
      <YStack flex={1} />

      <YStack items="center" gap="$5">
        <H2
          fontFamily="$body"
          color={C.accent}
          fontSize={40}
          fontWeight="700"
          style={{ textAlign: 'center' }}
        >
          {t('onboarding.ready.title')}
        </H2>

        <Text
          fontFamily="$body"
          color={C.text}
          fontSize={22}
          lineHeight={32}
          fontWeight="600"
          style={{ textAlign: 'center' }}
        >
          {t('onboarding.ready.commitment')}
        </Text>
      </YStack>

      <YStack flex={1} />

      <Button
        size="$5"
        bg={C.accent}
        pressStyle={{ bg: C.accentPress }}
        mb="$3"
        onPress={handlePress}
      >
        <Text fontFamily="$body" color={C.bg} fontWeight="700">{t('onboarding.ready.cta')}</Text>
      </Button>
      </YStack>
    </SafeAreaView>
  );
}
