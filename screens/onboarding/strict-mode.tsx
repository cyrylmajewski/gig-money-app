import {
  Bell,
  CalendarCheck,
  Phone,
  ShieldCheck,
} from '@tamagui/lucide-icons-2';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, H2, Paragraph, Text, XStack, YStack } from 'tamagui';

import { useAppStore } from '@/store';

const FEATURES = [
  { icon: Phone, titleKey: 'feature1Title', descKey: 'feature1Desc', theme: 'error' as const },
  { icon: ShieldCheck, titleKey: 'feature2Title', descKey: 'feature2Desc', theme: 'warning' as const },
  { icon: CalendarCheck, titleKey: 'feature3Title', descKey: 'feature3Desc', theme: undefined },
  { icon: Bell, titleKey: 'feature4Title', descKey: 'feature4Desc', theme: 'error' as const },
];

export default function StrictModeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const updateSettings = useAppStore((s) => s.updateSettings);

  function handleEnable() {
    updateSettings({ strictMode: true });
    router.push('/onboarding/ready');
  }

  function handleSkip() {
    updateSettings({ strictMode: false });
    router.push('/onboarding/ready');
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack flex={1} px="$5" pt="$4" pb="$5" gap="$5">
          <YStack gap="$2">
            <H2>{t('onboarding.strictMode.title')}</H2>
            <Paragraph color="$color9">
              {t('onboarding.strictMode.subtitle')}
            </Paragraph>
          </YStack>

          <Paragraph color="$color11" fontSize="$3">
            {t('onboarding.strictMode.description')}
          </Paragraph>

          <YStack gap="$3">
            {FEATURES.map(({ icon: IconComponent, titleKey, descKey, theme: featureTheme }) => (
              <XStack
                key={titleKey}
                bg="$color2"
                borderWidth={1}
                borderColor="$color4"
                rounded="$6"
                p="$3"
                gap="$3"
                items="flex-start"
              >
                <YStack
                  theme={featureTheme}
                  bg={featureTheme ? '$color3' : '$accent3'}
                  rounded="$4"
                  p="$2"
                  mt="$0.5"
                >
                  <IconComponent
                    size={16}
                    color={featureTheme ? '$color9' : '$accent11'}
                  />
                </YStack>
                <YStack flex={1} gap="$0.5">
                  <Text color="$color12" fontWeight="600" fontSize="$3">
                    {t(`onboarding.strictMode.${titleKey}`)}
                  </Text>
                  <Text color="$color9" fontSize="$2">
                    {t(`onboarding.strictMode.${descKey}`)}
                  </Text>
                </YStack>
              </XStack>
            ))}
          </YStack>

          {/* Spacer pushes buttons to bottom when content is short */}
          <YStack flex={1} />

          <YStack gap="$3">
            <Button
              size="$5"
              bg="$accent9"
              pressStyle={{ bg: '$accent10' }}
              onPress={handleEnable}
            >
              <Button.Text color="$color12">
                {t('onboarding.strictMode.enable')}
              </Button.Text>
            </Button>
            <Button size="$4" chromeless onPress={handleSkip}>
              <Button.Text color="$color8">
                {t('onboarding.strictMode.skip')}
              </Button.Text>
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
