import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Alert } from 'react-native';
import { YStack, H2, Button } from 'tamagui';
import { useAppStore } from '@/store';

const C = {
  bg: '#0F1419',
  card: '#1A2029',
  border: '#2A3140',
  text: '#ECEFF3',
  muted: '#7C8594',
  error: '#FB7185',
} as const;

export default function SettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const resetState = useAppStore((s) => s.resetState);

  function handleReset() {
    Alert.alert(
      t('settings.deleteData'),
      t('settings.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            resetState();
            router.replace('/onboarding/welcome');
          },
        },
      ],
    );
  }

  return (
    <YStack flex={1} px="$4" pt={insets.top + 16} pb={insets.bottom + 16} gap="$5">
      <H2 fontWeight="800" color={C.text}>{t('settings.title')}</H2>

      <YStack flex={1} />

      <Button
        size="$5"
        bg={C.card}
        color={C.error}
        borderWidth={1}
        borderColor={C.border}
        pressStyle={{ bg: C.border }}
        onPress={handleReset}
      >
        {t('settings.deleteData')}
      </Button>
    </YStack>
  );
}
