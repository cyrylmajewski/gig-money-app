import '../i18n';
import { useEffect } from 'react';
import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { TamaguiProvider } from 'tamagui';
import { useFonts } from 'expo-font';
import { Jersey25_400Regular } from '@expo-google-fonts/jersey-25';
import 'react-native-reanimated';

import tamaguiConfig from '../tamagui.config';
import { GigDarkNavTheme } from '../theme/navigation';
import { useAppStore } from '@/store';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);

  const [fontsLoaded, fontError] = useFonts({
    Jersey25_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="dark">
      <ThemeProvider value={GigDarkNavTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="income" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="debt" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </TamaguiProvider>
  );
}
