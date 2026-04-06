import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text, H2, Paragraph, Button } from 'tamagui';
import { Lock } from 'lucide-react-native';

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

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <YStack
      flex={1}
      bg={C.bg}
      pt={insets.top}
      pb={insets.bottom}
      px="$5"
    >
      {/* App title */}
      <YStack pt="$6">
        <H2
          color={C.accent}
          fontSize={40}
          fontWeight="700"
          letterSpacing={-0.5}
        >
          {t('common.appName')}
        </H2>
      </YStack>

      {/* Flex spacer */}
      <YStack flex={1} />

      {/* Subtitle */}
      <YStack mb="$6">
        <Paragraph
          color={C.text}
          fontSize={22}
          lineHeight={32}
          fontWeight="600"
        >
          {t('onboarding.welcome.subtitle')}
        </Paragraph>
      </YStack>

      {/* Privacy promise card */}
      <YStack
        bg={C.card}
        borderWidth={1}
        borderColor={C.border}
        rounded="$4"
        p="$4"
        mb="$6"
      >
        <XStack items="flex-start" gap="$3">
          <Lock size={20} color={C.accent} style={{ marginTop: 2 }} />
          <Text
            color={C.textSec}
            fontSize={14}
            lineHeight={20}
            flex={1}
          >
            {t('onboarding.welcome.privacy')}
          </Text>
        </XStack>
      </YStack>

      {/* CTA button */}
      <Button
        size="$5"
        bg={C.accent}
        color={C.bg}
        fontWeight="700"
        pressStyle={{ bg: C.accentPress }}
        mb="$3"
        onPress={() => router.push('/onboarding/needs')}
      >
        {t('onboarding.welcome.cta')}
      </Button>
    </YStack>
  );
}
