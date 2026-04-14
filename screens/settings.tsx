import {
  ChevronRight,
  Download,
  Globe,
  Receipt,
  Trash2,
} from '@tamagui/lucide-icons-2';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { GlassView } from 'expo-glass-effect';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Share, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { H2, Separator, Text, XStack, YStack } from 'tamagui';

import i18n from '@/i18n';
import { useAppStore } from '@/store';

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

          {/* General section */}
          <GlassView
            glassEffectStyle="regular"
            style={styles.card}
          >
            <YStack bg="$color2" rounded="$6" overflow="hidden">
              <Pressable onPress={handleEditNeeds} accessibilityRole="button">
                <XStack px="$4" py="$3.5" items="center" gap="$3">
                  <Receipt size={18} color="$accent9" />
                  <Text flex={1}>{t('settings.editNeeds')}</Text>
                  <ChevronRight size={16} color="$color8" />
                </XStack>
              </Pressable>

              <Separator borderColor="$color4" />

              <Pressable onPress={handleExportData} accessibilityRole="button">
                <XStack px="$4" py="$3.5" items="center" gap="$3">
                  <Download size={18} color="$accent9" />
                  <Text flex={1}>{t('settings.exportData')}</Text>
                  <ChevronRight size={16} color="$color8" />
                </XStack>
              </Pressable>
            </YStack>
          </GlassView>

          {/* Language section */}
          <YStack gap="$2">
            <XStack items="center" gap="$2" px="$1">
              <Globe size={14} color="$color9" />
              <Text
                color="$color9"
                fontSize="$2"
                textTransform="uppercase"
                letterSpacing={0.5}
              >
                {t('settings.language')}
              </Text>
            </XStack>
            <GlassView glassEffectStyle="regular" style={styles.card}>
              <XStack bg="$color2" rounded="$6" overflow="hidden">
                {LOCALES.map(({ code, label }, index) => {
                  const isActive = currentLocale === code;
                  const isLast = index === LOCALES.length - 1;
                  return (
                    <XStack key={code} flex={1}>
                      <Pressable
                        style={{ flex: 1 }}
                        onPress={() => handleLanguageChange(code)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isActive }}
                      >
                        <YStack
                          py="$3"
                          items="center"
                          bg={isActive ? '$accent3' : 'transparent'}
                        >
                          <Text
                            fontWeight={isActive ? '700' : '400'}
                            color={isActive ? '$accent11' : '$color11'}
                          >
                            {label}
                          </Text>
                        </YStack>
                      </Pressable>
                      {!isLast && <Separator vertical borderColor="$color4" />}
                    </XStack>
                  );
                })}
              </XStack>
            </GlassView>
          </YStack>

          {/* Danger zone */}
          <GlassView glassEffectStyle="regular" style={styles.card}>
            <YStack theme="error" bg="$color2" rounded="$6" overflow="hidden">
              <Pressable onPress={handleReset} accessibilityRole="button">
                <XStack px="$4" py="$3.5" items="center" gap="$3">
                  <Trash2 size={18} color="$color9" />
                  <Text flex={1} color="$color9">
                    {t('settings.resetData')}
                  </Text>
                  <ChevronRight size={16} color="$color8" />
                </XStack>
              </Pressable>
            </YStack>
          </GlassView>

          {/* App version */}
          <Text color="$color8" fontSize="$2" style={{ textAlign: 'center' }}>
            {t('settings.version')} {appVersion}
          </Text>
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});
