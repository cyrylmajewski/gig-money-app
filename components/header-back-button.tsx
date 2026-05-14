import { ArrowLeft } from '@tamagui/lucide-icons-2';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

type HeaderBackButtonProps = {
  onPress: () => void;
};

export function HeaderBackButton({ onPress }: HeaderBackButtonProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      hitSlop={8}
      style={styles.button}
    >
      <ArrowLeft size={22} color="$color11" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
