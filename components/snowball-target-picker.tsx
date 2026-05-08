import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import {
  Button,
  ScrollView,
  Separator,
  Sheet,
  Text,
  XStack,
  YStack,
} from 'tamagui';

import { Badge } from '@/components/badge';
import { formatAmount } from '@/lib/format';
import type { Debt } from '@/types/models';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debts: Debt[];
  currentOverride: string | null;
  effectiveTargetId: string | null;
  onSelect: (debtId: string | null) => void;
}

export function SnowballTargetPicker({
  open,
  onOpenChange,
  debts,
  currentOverride,
  effectiveTargetId,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const currency = t('common.currency');

  const autoSelected = currentOverride === null;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[70]}
      dismissOnSnapToBottom
      modal
    >
      <Sheet.Overlay />
      <Sheet.Frame p="$5" gap="$4">
        <YStack gap="$1">
          <Text fontWeight="700" fontSize="$5">
            {t('debts.targetPicker.title')}
          </Text>
          <Text color="$color9" fontSize="$3">
            {t('debts.targetPicker.subtitle')}
          </Text>
        </YStack>

        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack gap="$2">
            <Pressable onPress={() => onSelect(null)}>
              <XStack
                bg={autoSelected ? '$accent3' : '$color3'}
                borderWidth={1}
                borderColor={autoSelected ? '$accent7' : '$color5'}
                rounded="$4"
                px="$4"
                py="$3"
                items="center"
                gap="$3"
              >
                <YStack
                  width={18}
                  height={18}
                  rounded="$10"
                  borderWidth={2}
                  borderColor={autoSelected ? '$accent9' : '$color7'}
                  bg={autoSelected ? '$accent9' : 'transparent'}
                />
                <YStack flex={1} gap="$0.5">
                  <Text
                    color={autoSelected ? '$accent11' : '$color11'}
                    fontSize="$3"
                    fontWeight="500"
                  >
                    {t('debts.targetPicker.useAuto')}
                  </Text>
                  {effectiveTargetId !== null && autoSelected ? (
                    <Text color="$accent9" fontSize="$2">
                      {debts.find((d) => d.id === effectiveTargetId)?.label ??
                        ''}
                    </Text>
                  ) : null}
                </YStack>
              </XStack>
            </Pressable>

            <Separator borderColor="$color4" my="$1" />

            {debts.map((debt) => {
              const selected = currentOverride === debt.id;
              const isCurrent = effectiveTargetId === debt.id && autoSelected;
              return (
                <Pressable key={debt.id} onPress={() => onSelect(debt.id)}>
                  <XStack
                    bg={selected ? '$accent3' : '$color3'}
                    borderWidth={1}
                    borderColor={selected ? '$accent7' : '$color5'}
                    rounded="$4"
                    px="$4"
                    py="$3"
                    items="center"
                    gap="$3"
                  >
                    <YStack
                      width={18}
                      height={18}
                      rounded="$10"
                      borderWidth={2}
                      borderColor={selected ? '$accent9' : '$color7'}
                      bg={selected ? '$accent9' : 'transparent'}
                    />
                    <YStack flex={1} gap="$0.5">
                      <Text
                        color={selected ? '$accent11' : '$color11'}
                        fontSize="$3"
                        numberOfLines={1}
                        fontWeight="500"
                      >
                        {debt.label}
                      </Text>
                      <Text
                        color={selected ? '$accent9' : '$color9'}
                        fontSize="$2"
                      >
                        {formatAmount(debt.remainingAmount)} {currency}
                      </Text>
                    </YStack>
                    <XStack items="center" gap="$2">
                      {isCurrent ? (
                        <Badge
                          label={t('debts.targetPicker.currentLabel')}
                          variant="accent"
                        />
                      ) : null}
                      <Badge label={t(`onboarding.debts.types.${debt.type}`)} />
                    </XStack>
                  </XStack>
                </Pressable>
              );
            })}
          </YStack>
        </ScrollView>

        <Button
          variant="outlined"
          size="$4"
          onPress={() => onOpenChange(false)}
        >
          <Button.Text>{t('debts.targetPicker.cancel')}</Button.Text>
        </Button>
      </Sheet.Frame>
    </Sheet>
  );
}
