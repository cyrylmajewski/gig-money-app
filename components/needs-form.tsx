import { parseAmount, sanitiseDecimal, formatAmount } from '@/lib/format';
import type { MonthlyNeeds } from '@/types/models';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';
import { Keyboard } from 'react-native';
import { Button, H3, Input, Paragraph, Text, XStack, YStack } from 'tamagui';

interface NeedsField {
  key: keyof MonthlyNeeds;
  labelKey: string;
  placeholder: string;
}

const FIELDS: NeedsField[] = [
  { key: 'housing', labelKey: 'onboarding.needs.housing', placeholder: 'onboarding.needs.housingPlaceholder' },
  { key: 'food', labelKey: 'onboarding.needs.food', placeholder: 'onboarding.needs.foodPlaceholder' },
  { key: 'transport', labelKey: 'onboarding.needs.transport', placeholder: 'onboarding.needs.transportPlaceholder' },
  { key: 'other', labelKey: 'onboarding.needs.other', placeholder: 'onboarding.needs.otherPlaceholder' },
];

export interface NeedsFormValues {
  housing: string;
  food: string;
  transport: string;
  other: string;
}

interface NeedsFormProps {
  defaultValues: NeedsFormValues;
  onSubmit: (parsed: MonthlyNeeds) => void;
  submitLabel: string;
}

export function NeedsForm({ defaultValues, onSubmit, submitLabel }: NeedsFormProps) {
  const { t } = useTranslation();
  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => {
      Keyboard.dismiss();
      const parsed: MonthlyNeeds = {
        housing: parseAmount(value.housing),
        food: parseAmount(value.food),
        transport: parseAmount(value.transport),
        other: parseAmount(value.other),
      };
      onSubmit(parsed);
    },
  });

  return (
    <YStack gap="$4">
      <form.Subscribe selector={(s) => s.values}>
        {(values) => {
          const total =
            parseAmount(values.housing) +
            parseAmount(values.food) +
            parseAmount(values.transport) +
            parseAmount(values.other);

          return (
            <>
              <YStack gap="$3">
                {FIELDS.map(({ key, labelKey, placeholder }) => (
                  <form.Field
                    key={key}
                    name={key}
                    validators={{
                      onSubmit: ({ value }) => {
                        // Validated at form level, not per-field
                        return undefined;
                      },
                    }}
                  >
                    {(field) => (
                      <YStack gap="$2">
                        <Text
                          color="$color9"
                          fontSize="$2"
                          textTransform="uppercase"
                          letterSpacing={0.5}
                        >
                          {t(labelKey)}
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
                            keyboardType="decimal-pad"
                            value={field.state.value}
                            onChangeText={(raw) =>
                              field.handleChange(sanitiseDecimal(raw))
                            }
                            placeholder={t(placeholder)}
                            placeholderTextColor="$color7"
                            fontSize="$4"
                            color="$color11"
                          />
                          <Text color="$color9" fontSize="$3">
                            {t('common.currency')}
                          </Text>
                        </XStack>
                      </YStack>
                    )}
                  </form.Field>
                ))}
              </YStack>

              {/* Running total */}
              <XStack
                justify="space-between"
                items="center"
                bg="$color3"
                borderWidth={1}
                borderColor="$color5"
                rounded="$4"
                px="$4"
                py="$3.5"
              >
                <Text color="$color11" fontSize="$4">
                  {t('onboarding.needs.total')}
                </Text>
                <XStack items="baseline" gap="$1.5">
                  <H3 fontWeight="700">{formatAmount(total)}</H3>
                  <Text color="$color11" fontSize="$3">
                    {t('common.currency')}
                  </Text>
                </XStack>
              </XStack>
            </>
          );
        }}
      </form.Subscribe>

      {/* Validation error */}
      <form.Subscribe selector={(s) => s.submissionAttempts}>
        {(attempts) => {
          if (attempts === 0) return null;
          return (
            <form.Subscribe selector={(s) => s.values}>
              {(values) => {
                const total =
                  parseAmount(values.housing) +
                  parseAmount(values.food) +
                  parseAmount(values.transport) +
                  parseAmount(values.other);
                if (total > 0) return null;
                return (
                  <Paragraph
                    theme="error"
                    color="$color9"
                    style={{ textAlign: 'center' }}
                  >
                    {t('onboarding.needs.validationError')}
                  </Paragraph>
                );
              }}
            </form.Subscribe>
          );
        }}
      </form.Subscribe>

      {/* Submit */}
      <Button
        size="$5"
        bg="$accent9"
        pressStyle={{ bg: '$accent10' }}
        onPress={() => {
          // Check total before submitting
          const values = form.state.values;
          const total =
            parseAmount(values.housing) +
            parseAmount(values.food) +
            parseAmount(values.transport) +
            parseAmount(values.other);
          if (total <= 0) {
            // Trigger submission attempt counter for error display
            form.handleSubmit();
            return;
          }
          form.handleSubmit();
        }}
      >
        <Button.Text color="$color12">{submitLabel}</Button.Text>
      </Button>
    </YStack>
  );
}
