import { useRef, useState } from 'react';
import { useRouter, Stack as ExpoStack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView, Platform, Pressable, TextInput } from 'react-native';
import {
  YStack,
  XStack,
  Text,
  Input,
  Button,
  Label,
  Paragraph,
  View,
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
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [amountError, setAmountError] = useState(false);

  function handleAmountChange(raw: string) {
    const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    // Prevent multiple dots
    const parts = cleaned.split('.');
    let value = parts[0]!.slice(0, 7); // max 7 integer digits (9 999 999)
    if (parts.length > 1) {
      value += '.' + parts[1]!.slice(0, 2); // max 2 decimal places
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
              <Text color={C.accent} fontSize="$4">
                {t('common.cancel')}
              </Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <YStack
          flex={1}
          px="$5"
          pt="$4"
          pb={insets.bottom + 24}
        >
          {/* Subtitle */}
          <Paragraph color={C.textSec} fontSize="$4" textAlign="center">
            {t('income.new.subtitle')}
          </Paragraph>

          {/* Hero amount – tap anywhere to focus hidden input */}
          <Pressable
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => inputRef.current?.focus()}
          >
            <XStack items="baseline" justify="center" gap="$3">
              <Text
                fontSize={fontSize}
                fontWeight="800"
                color={amount ? C.text : C.muted}
                letterSpacing={-1}
              >
                {displayAmount || '0'}
              </Text>
              <Text fontSize={fontSize / 2} fontWeight="700" color={C.textSec}>
                {t('common.currency')}
              </Text>
            </XStack>

            {amountError && (
              <Paragraph color={C.error} fontSize="$3" mt="$2">
                {t('income.new.amountError')}
              </Paragraph>
            )}
          </Pressable>

          {/* Hidden native input – drives the decimal keyboard */}
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
            <Label htmlFor="source-input" fontSize="$3" color={C.muted} fontWeight="600">
              {t('income.new.source').toUpperCase()}
            </Label>
            <Input
              id="source-input"
              fontSize="$5"
              py="$3"
              px="$4"
              rounded="$4"
              bg={C.card}
              borderWidth={1}
              borderColor={C.border}
              color={C.text}
              placeholderTextColor={C.muted}
              placeholder={t('income.new.sourcePlaceholder')}
              value={source}
              onChangeText={setSource}
              returnKeyType="done"
              accessibilityLabel={t('income.new.source')}
            />
          </YStack>

          <Button
            size="$5"
            bg={!amount ? C.border : C.accent}
            color={!amount ? C.muted : C.bg}
            pressStyle={{ bg: C.accentPress }}
            onPress={handleContinue}
            disabled={!amount}
            accessibilityRole="button"
          >
            {t('income.new.cta')}
          </Button>
        </YStack>
      </KeyboardAvoidingView>
    </>
  );
}
