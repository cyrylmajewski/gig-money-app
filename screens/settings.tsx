import i18n from '@/i18n';
import { useAppStore } from '@/store';
import { ChevronRight } from '@tamagui/lucide-icons-2';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, H2, Text, XStack, YStack } from 'tamagui';

const LOCALES = [
  { code: 'pl', label: 'PL' },
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
] as const;

type LocaleCode = 'pl' | 'en' | 'ru';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const resetState = useAppStore((s) => s.resetState);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const currentLocale = useAppStore((s) => s.settings.locale);

  const appVersion = Constants.expoConfig?.version ?? '—';

  function handleEditNeeds() {
    router.push('/settings/needs');
  }

  async function handleExportData() {
    const state = useAppStore.getState();
    const json = JSON.stringify(state, null, 2);
    const file = new File(Paths.cache, 'gigmoney-export.json');

    try {
      file.write(json);
      await Share.share({ url: file.uri, title: t('settings.exportData') });
    } catch {
      Alert.alert(t('settings.exportSuccess'));
    }
  }

  function handleLanguageChange(locale: LocaleCode) {
    i18n.changeLanguage(locale);
    updateSettings({ locale });
  }

  function handleReset() {
    Alert.alert(
      t('settings.resetConfirmTitle'),
      t('settings.resetConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.resetConfirmButton'),
          style: 'destructive',
          onPress: () => {
            resetState();
            router.replace('/onboarding/welcome');
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <YStack px="$4" pt="$4" gap="$5">
          <H2>{t('settings.title')}</H2>

          {/* Edit monthly needs */}
          <YStack borderWidth={1} rounded="$4" overflow="hidden">
            <Button
              unstyled
              onPress={handleEditNeeds}
              accessibilityRole="button"
            >
              <XStack px="$4" py="$4" items="center" justify="space-between">
                <Text>{t('settings.editNeeds')}</Text>
                <ChevronRight size={18} />
              </XStack>
            </Button>
          </YStack>

          {/* Language switcher */}
          <YStack gap="$2">
            <Text textTransform="uppercase" letterSpacing={0.5}>
              {t('settings.language')}
            </Text>
            <XStack borderWidth={1} rounded="$4" overflow="hidden">
              {LOCALES.map(({ code, label }, index) => {
                const isActive = currentLocale === code;
                const isLast = index === LOCALES.length - 1;
                return (
                  <XStack key={code} flex={1}>
                    <Button
                      unstyled
                      flex={1}
                      onPress={() => handleLanguageChange(code)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                    >
                      <YStack py="$3" items="center">
                        <Text>{label}</Text>
                      </YStack>
                    </Button>
                    {!isLast && <YStack width={1} />}
                  </XStack>
                );
              })}
            </XStack>
          </YStack>

          {/* Export data */}
          <YStack borderWidth={1} rounded="$4" overflow="hidden">
            <Button
              unstyled
              onPress={handleExportData}
              accessibilityRole="button"
            >
              <XStack px="$4" py="$4" items="center" justify="space-between">
                <Text>{t('settings.exportData')}</Text>
                <ChevronRight size={18} />
              </XStack>
            </Button>
          </YStack>

          {/* Reset data */}
          <YStack borderWidth={1} rounded="$4" overflow="hidden">
            <Button unstyled onPress={handleReset} accessibilityRole="button">
              <XStack px="$4" py="$4" items="center" justify="space-between">
                <Text>{t('settings.resetData')}</Text>
                <ChevronRight size={18} />
              </XStack>
            </Button>
          </YStack>

          {/* App version */}
          <Text style={{ textAlign: 'center' }}>
            {t('settings.version')} {appVersion}
          </Text>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}
