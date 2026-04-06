import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const setOnboardingCompleted = useAppStore((s) => s.setOnboardingCompleted);

  function handlePress() {
    setOnboardingCompleted(true);
    router.replace('/(tabs)');
  }

  return (
    <YStack
      flex={1}
      bg={C.bg}
      pt={insets.top}
      pb={insets.bottom}
      px="$5"
    >
      {/* Flex spacer — push content to center */}
      <YStack flex={1} />

      {/* Centered content */}
      <YStack items="center" gap="$5">
        <H2
          color={C.accent}
          fontSize={40}
          fontWeight="700"
          letterSpacing={-0.5}
          textAlign="center"
        >
          {t('onboarding.ready.title')}
        </H2>

        <Text
          color={C.text}
          fontSize={22}
          lineHeight={32}
          fontWeight="600"
          textAlign="center"
        >
          {t('onboarding.ready.commitment')}
        </Text>
      </YStack>

      {/* Flex spacer — push button to bottom */}
      <YStack flex={1} />

      {/* CTA */}
      <Button
        size="$5"
        bg={C.accent}
        color={C.bg}
        fontWeight="700"
        pressStyle={{ bg: C.accentPress }}
        mb="$3"
        onPress={handlePress}
      >
        {t('onboarding.ready.cta')}
      </Button>
    </YStack>
  );
}
