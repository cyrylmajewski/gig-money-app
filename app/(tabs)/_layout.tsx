import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
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
      minimizeBehavior="onScrollDown"
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
      shadowColor="transparent"
    >
      <NativeTabs.Trigger name="index" options={{ backgroundColor: bg }}>
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>{t('tabs.home')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="debts" options={{ backgroundColor: bg }}>
        <Icon sf={{ default: 'creditcard', selected: 'creditcard.fill' }} />
        <Label>{t('tabs.debts')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress" options={{ backgroundColor: bg }}>
        <Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
        <Label>{t('tabs.progress')}</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" options={{ backgroundColor: bg }}>
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <Label>{t('tabs.settings')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
