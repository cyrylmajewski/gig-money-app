import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, H1, Paragraph, Text, Theme, YStack } from 'tamagui';

import { useAppStore } from '@/store';

export default function CelebrationScreen() {
  const { t } = useTranslation();
  const { dismissAll, replace } = useRouter();
  const params = useLocalSearchParams<{ debtLabel: string; debtType: string }>();

  function handleCelebrate() {
    useAppStore.getState().updateSettings({ lastCelebrationDebtId: params.debtLabel });
    dismissAll();
    replace('/(tabs)');
  }

  return (
    <YStack flex={1} bg="$color1">
      <SafeAreaView style={styles.container}>
        <YStack flex={1} justify="center" items="center" px="$5" gap="$4">
          <LottieView
            source={require('@/assets/animations/confetti.json')}
            autoPlay
            loop
            resizeMode="contain"
            style={styles.lottie}
          />

          <H1
            text="center"
            fontSize="$10"
            fontWeight="800"
            letterSpacing={-1}
            color="$color12"
          >
            {t('triggers.celebration.screen.title')}
          </H1>

          <Text
            text="center"
            fontSize="$6"
            color="$accent11"
            fontWeight="600"
          >
            {t('triggers.celebration.screen.subtitle', { label: params.debtLabel })}
          </Text>

          <Paragraph
            text="center"
            fontSize="$4"
            color="$color11"
            maxW={320}
            opacity={0.9}
          >
            {t('triggers.celebration.screen.body')}
          </Paragraph>

          {params.debtType === 'credit_card' && (
            <Theme name="warning">
              <YStack
                bg="$color3"
                borderWidth={1}
                borderColor="$color7"
                rounded="$5"
                p="$4"
                maxW={320}
              >
                <Paragraph text="center" fontSize="$3" color="$color11">
                  {t('triggers.celebration.screen.creditCardExtra')}
                </Paragraph>
              </YStack>
            </Theme>
          )}
        </YStack>

        <YStack px="$4" pb="$4">
          <Button
            bg="$accent9"
            size="$6"
            rounded="$6"
            pressStyle={{ bg: '$accent10' }}
            onPress={handleCelebrate}
          >
            <Button.Text color="$color1" fontSize="$5" fontWeight="700">
              {t('triggers.celebration.screen.cta')}
            </Button.Text>
          </Button>
        </YStack>
      </SafeAreaView>
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lottie: {
    width: 220,
    height: 220,
  },
});
