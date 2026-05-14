import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'tamagui';

export default function TabLayout() {
  const { t } = useTranslation();
  const theme = useTheme();

  const bg = theme.background.val;
  const accent = theme.accent9.val;
  const muted = theme.color8.val;

  return (
    <NativeTabs
      minimizeBehavior="never"
      backgroundColor={bg}
      tintColor={accent}
      iconColor={{
        default: muted,
        selected: accent,
      }}
      labelStyle={{
        default: { color: muted, fontSize: 10 },
        selected: { color: accent, fontSize: 10, fontWeight: '600' },
      }}
      blurEffect="systemChromeMaterialDark"
      indicatorColor={theme.accent3.val}
      labelVisibilityMode="labeled"
      rippleColor={theme.accent4.val}
      shadowColor="transparent"
    >
      <NativeTabs.Trigger name="index" options={{ backgroundColor: bg }}>
        <Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="home" />}
          selectedColor={accent}
        />
        <Label>{t('tabs.home')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="debts" options={{ backgroundColor: bg }}>
        <Icon
          sf={{ default: 'creditcard', selected: 'creditcard.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="credit-card" />}
          selectedColor={accent}
        />
        <Label>{t('tabs.debts')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history" options={{ backgroundColor: bg }}>
        <Icon
          sf={{ default: 'clock', selected: 'clock.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="history" />}
          selectedColor={accent}
        />
        <Label>{t('tabs.history')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" options={{ backgroundColor: bg }}>
        <Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          androidSrc={<VectorIcon family={MaterialIcons} name="settings" />}
          selectedColor={accent}
        />
        <Label>{t('tabs.settings')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
