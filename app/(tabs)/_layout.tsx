import { ChartBar, CreditCard, Home, Settings } from '@tamagui/lucide-icons-2';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { HapticTab } from '@/components/haptic-tab';

function tabIcon(Icon: typeof Home) {
  return ({ color, size }: { color: string; size: number }) => (
    <Icon size={size} color={color as never} />
  );
}

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon(Home) }}
      />
      <Tabs.Screen
        name="debts"
        options={{ title: t('tabs.debts'), tabBarIcon: tabIcon(CreditCard) }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: t('tabs.progress'), tabBarIcon: tabIcon(ChartBar) }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t('tabs.settings'), tabBarIcon: tabIcon(Settings) }}
      />
    </Tabs>
  );
}
