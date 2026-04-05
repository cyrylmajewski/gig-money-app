import { YStack, Text, Button } from 'tamagui';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$4">
      <Text fontSize="$8" fontWeight="bold">{t('home.greeting')}</Text>
      <Button size="$5" theme="active" onPress={() => router.push('/income/new')}>
        {t('home.cta.receivedMoney')}
      </Button>
    </YStack>
  );
}
