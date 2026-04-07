import { useRef, useState } from 'react';
import { useRouter, Stack as ExpoStack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable, TextInput } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Button,
  Paragraph,
} from 'tamagui';

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

export default function NewIncomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [amountError, setAmountError] = useState(false);

  function handleAmountChange(raw: string) {
    const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let value = parts[0]!.slice(0, 7);
    if (parts.length > 1) {
      value += '.' + parts[1]!.slice(0, 2);
    }
    setAmount(value);
    setAmountError(false);
  }

  const displayAmount = amount ? amount.replace('.', ',') : '';
  const fontSize = displayAmount.length > 7 ? 36 : 56;

  function handleContinue() {
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setAmountError(true);
      return;
    }
    router.push({
      pathname: '/income/allocate',
      params: {
        amount: parsed.toString(),
        source: source.trim(),
      },
    });
  }

  return (
    <>
      <ExpoStack.Screen
        options={{
          title: t('income.new.title'),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text fontFamily="$body" color={C.accent} fontSize="$4">
                {t('common.cancel')}
              </Text>
            </Pressable>
          ),
        }}
      />

      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
        <YStack
          flex={1}
          px="$5"
          pt="$4"
          pb="$5"
        >
          {/* Subtitle */}
          <Paragraph fontFamily="$body" color={C.textSec} fontSize="$4" style={{ textAlign: 'center' }}>
            {t('income.new.subtitle')}
          </Paragraph>

          {/* Hero amount */}
          <Pressable
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => inputRef.current?.focus()}
          >
            <XStack items="baseline" justify="center" gap="$3">
              <Text
                fontFamily="$body"
                fontSize={fontSize}
                fontWeight="800"
                color={amount ? C.text : C.muted}
                letterSpacing={-1}
              >
                {displayAmount || '0'}
              </Text>
              <Text fontFamily="$body" fontSize={fontSize / 2} fontWeight="700" color={C.textSec}>
                {t('common.currency')}
              </Text>
            </XStack>

            {amountError && (
              <Paragraph fontFamily="$body" color={C.error} fontSize="$3" mt="$2">
                {t('income.new.amountError')}
              </Paragraph>
            )}
          </Pressable>

          {/* Hidden native input */}
          <TextInput
            ref={inputRef}
            style={{ position: 'absolute', opacity: 0, height: 0 }}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={handleAmountChange}
            autoFocus
            accessibilityLabel={t('income.new.amount')}
          />

          {/* Source field */}
          <YStack gap="$2" mb="$4">
            <Text
              fontFamily="$body"
              fontSize="$3"
              color={C.muted}
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing={0.5}
            >
              {t('income.new.source').toUpperCase()}
            </Text>
            <XStack
              bg={C.card}
              borderWidth={1}
              borderColor={C.border}
              rounded="$4"
              items="center"
              px="$4"
              height={52}
            >
              <TextInput
                style={{ flex: 1, fontSize: 18, color: C.text, fontFamily: 'Jersey25_400Regular', paddingVertical: 8 }}
                placeholderTextColor={C.muted}
                placeholder={t('income.new.sourcePlaceholder')}
                value={source}
                onChangeText={setSource}
                returnKeyType="done"
                accessibilityLabel={t('income.new.source')}
              />
            </XStack>
          </YStack>

          <Button
            size="$5"
            bg={!amount ? C.border : C.accent}
            pressStyle={{ bg: C.accentPress }}
            onPress={handleContinue}
            disabled={!amount}
            accessibilityRole="button"
          >
            <Text fontFamily="$body" color={!amount ? C.muted : C.bg} fontWeight="700">
              {t('income.new.cta')}
            </Text>
          </Button>
        </YStack>
      </SafeAreaView>
    </>
  );
}
