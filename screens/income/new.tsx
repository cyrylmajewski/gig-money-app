import { Stack as ExpoStack, useRouter } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Paragraph, Text, XStack, YStack } from 'tamagui';
import { useForm } from '@tanstack/react-form';

export default function NewIncomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const form = useForm({
    defaultValues: {
      amount: '',
      source: '',
    },
    onSubmit: ({ value }) => {
      Keyboard.dismiss();
      const parsed = parseFloat(value.amount.replace(',', '.'));
      router.push({
        pathname: '/income/allocate',
        params: {
          amount: parsed.toString(),
          source: value.source.trim(),
        },
      });
    },
  });

  function handleAmountChange(raw: string) {
    const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let integer = (parts[0] ?? '').replace(/^0+/, '') || '';
    integer = integer.slice(0, 7);
    let value = integer;
    if (parts.length > 1) {
      value += '.' + parts[1]!.slice(0, 2);
    }
    form.setFieldValue('amount', value);
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
            <form.Field
              name="amount"
              validators={{
                onSubmit: ({ value }) => {
                  const parsed = parseFloat(value.replace(',', '.'));
                  if (!value || isNaN(parsed) || parsed <= 0) {
                    return t('income.new.amountError');
                  }
                  return undefined;
                },
              }}
            >
              {(field) => {
                const displayAmount = field.state.value
                  ? field.state.value.replace('.', ',')
                  : '0';
                const hasError = field.state.meta.errors.length > 0;

                return (
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
                        color={field.state.value ? '$color12' : '$color6'}
                      >
                        {displayAmount}
                      </Text>
                      <Text fontSize="$6" color="$color9">
                        {t('common.currency')}
                      </Text>
                    </XStack>

                    {hasError && (
                      <Paragraph
                        theme="error"
                        color="$color9"
                        mt="$2"
                        style={{ textAlign: 'center' }}
                      >
                        {field.state.meta.errors[0]}
                      </Paragraph>
                    )}
                  </Pressable>
                );
              }}
            </form.Field>

            {/* Hidden native input */}
            <form.Subscribe selector={(s) => s.values.amount}>
              {(amount) => (
                <TextInput
                  ref={inputRef}
                  style={{ position: 'absolute', opacity: 0, height: 0 }}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={handleAmountChange}
                  autoFocus
                  accessibilityLabel={t('income.new.amount')}
                />
              )}
            </form.Subscribe>

            {/* Source field */}
            <form.Field name="source">
              {(field) => (
                <YStack
                  bg="$color3"
                  borderWidth={1}
                  borderColor="$color4"
                  rounded="$6"
                  p="$4"
                  gap="$2"
                  mb="$4"
                >
                  <Text
                    color="$color9"
                    fontSize="$2"
                    textTransform="uppercase"
                    letterSpacing={0.5}
                  >
                    {t('income.new.source')}
                  </Text>
                  <Input
                    unstyled
                    placeholder={t('income.new.sourcePlaceholder')}
                    placeholderTextColor="$color7"
                    value={field.state.value}
                    onChangeText={field.handleChange}
                    returnKeyType="done"
                    fontSize="$5"
                    fontWeight="500"
                    color="$color12"
                    accessibilityLabel={t('income.new.source')}
                  />
                </YStack>
              )}
            </form.Field>

            <form.Subscribe selector={(s) => s.values.amount}>
              {(amount) => (
                <Button
                  size="$5"
                  bg="$accent9"
                  pressStyle={{ bg: '$accent10' }}
                  onPress={() => form.handleSubmit()}
                  opacity={!amount ? 0.5 : 1}
                  accessibilityRole="button"
                >
                  <Button.Text color="$color12">
                    {t('income.new.cta')}
                  </Button.Text>
                </Button>
              )}
            </form.Subscribe>
          </YStack>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
