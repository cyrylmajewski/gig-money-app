import { defaultConfig } from '@tamagui/config/v5';
import { createTamagui } from 'tamagui';
import { themes } from './themes';

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  themes: {
    ...themes,
  },
});

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
