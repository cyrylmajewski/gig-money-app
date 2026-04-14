import { useRef, useState } from 'react';
import { useRouter, Stack as ExpoStack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
} from 'react-native';
import { YStack, XStack, Text, Button, Input, Paragraph } from 'tamagui';

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

  const displayAmount = amount ? amount.replace('.', ',') : '0';

  function handleContinue() {
    Keyboard.dismiss();
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
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Text color="$color11">{t('common.cancel')}</Text>
            </Pressable>
          ),
        }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
        >
          <YStack flex={1} px="$5" pt="$4" pb="$5">
            {/* Subtitle */}
            <Paragraph color="$color9" style={{ textAlign: 'center' }}>
              {t('income.new.subtitle')}
            </Paragraph>

            {/* Hero amount */}
            <Pressable
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => {
                if (inputRef.current?.isFocused()) {
                  Keyboard.dismiss();
                } else {
                  inputRef.current?.focus();
                }
              }}
            >
              <XStack items="baseline" justify="center" gap="$2">
                <Text
                  fontSize={56}
                  fontWeight="700"
                  letterSpacing={-2}
                  color={amount ? '$color12' : '$color6'}
                >
                  {displayAmount}
                </Text>
                <Text fontSize="$6" color="$color9">
                  {t('common.currency')}
                </Text>
              </XStack>

              {amountError && (
                <Paragraph
                  theme="error"
                  color="$color9"
                  mt="$2"
                  style={{ textAlign: 'center' }}
                >
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
                color="$color9"
                fontSize="$2"
                textTransform="uppercase"
                letterSpacing={0.5}
              >
                {t('income.new.source')}
              </Text>
              <XStack
                bg="$color2"
                borderWidth={1}
                borderColor="$color4"
                rounded="$4"
                items="center"
                px="$3"
                height={48}
              >
                <Input
                  unstyled
                  flex={1}
                  placeholder={t('income.new.sourcePlaceholder')}
                  placeholderTextColor="$color8"
                  value={source}
                  onChangeText={setSource}
                  returnKeyType="done"
                  fontSize="$4"
                  color="$color11"
                  accessibilityLabel={t('income.new.source')}
                />
              </XStack>
            </YStack>

            <Button
              size="$5"
              bg="$accent9"
              pressStyle={{ bg: '$accent10' }}
              onPress={handleContinue}
              opacity={!amount ? 0.5 : 1}
              accessibilityRole="button"
            >
              <Button.Text color="$color12">
                {t('income.new.cta')}
              </Button.Text>
            </Button>
          </YStack>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
