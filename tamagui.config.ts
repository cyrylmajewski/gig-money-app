import { defaultConfig } from '@tamagui/config/v5';
import { createAnimations } from '@tamagui/animations-react-native';
import { createTamagui } from 'tamagui';
import { themes } from './themes';

const animations = createAnimations({
  fast: { type: 'spring', damping: 20, mass: 1.2, stiffness: 250 },
  medium: { type: 'spring', damping: 10, mass: 0.9, stiffness: 100 },
  slow: { type: 'spring', damping: 20, stiffness: 60 },
});

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  animations,
  themes: {
    ...themes,
  },
});

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
