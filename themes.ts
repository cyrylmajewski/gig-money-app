import {
  green,
  greenDark,
  red,
  redDark,
  yellow,
  yellowDark,
} from '@tamagui/colors';
import { createV5Theme, defaultChildrenThemes } from '@tamagui/config/v5';
import { v5ComponentThemes } from '@tamagui/themes/v5';

const darkPalette = [
  'hsla(240, 12%, 5%, 1)',
  'hsla(240, 10%, 9%, 1)',
  'hsla(240, 9%, 13%, 1)',
  'hsla(240, 8%, 18%, 1)',
  'hsla(240, 7%, 23%, 1)',
  'hsla(240, 7%, 29%, 1)',
  'hsla(240, 6%, 36%, 1)',
  'hsla(240, 6%, 44%, 1)',
  'hsla(240, 5%, 52%, 1)',
  'hsla(240, 5%, 62%, 1)',
  'hsla(240, 7%, 88%, 1)',
  'hsla(240, 12%, 98%, 1)',
];
const lightPalette = [
  'hsla(240, 20%, 99%, 1)',
  'hsla(240, 16%, 97%, 1)',
  'hsla(240, 14%, 95%, 1)',
  'hsla(240, 12%, 92%, 1)',
  'hsla(240, 10%, 86%, 1)',
  'hsla(240, 8%, 78%, 1)',
  'hsla(240, 7%, 68%, 1)',
  'hsla(240, 6%, 56%, 1)',
  'hsla(240, 6%, 44%, 1)',
  'hsla(240, 7%, 34%, 1)',
  'hsla(240, 10%, 20%, 1)',
  'hsla(240, 12%, 7%, 1)',
];

// Your custom accent color theme
const accentLight = {
  accent1: 'hsla(250, 80%, 99%, 1)',
  accent2: 'hsla(250, 76%, 97%, 1)',
  accent3: 'hsla(250, 72%, 94%, 1)',
  accent4: 'hsla(250, 68%, 90%, 1)',
  accent5: 'hsla(250, 64%, 85%, 1)',
  accent6: 'hsla(250, 60%, 78%, 1)',
  accent7: 'hsla(250, 58%, 70%, 1)',
  accent8: 'hsla(250, 56%, 64%, 1)',
  accent9: 'hsla(250, 56%, 62%, 1)',
  accent10: 'hsla(250, 54%, 56%, 1)',
  accent11: 'hsla(250, 46%, 40%, 1)',
  accent12: 'hsla(250, 80%, 98%, 1)',
};

const accentDark = {
  accent1: 'hsla(250, 50%, 35%, 1)',
  accent2: 'hsla(250, 50%, 38%, 1)',
  accent3: 'hsla(250, 50%, 41%, 1)',
  accent4: 'hsla(250, 50%, 43%, 1)',
  accent5: 'hsla(250, 50%, 46%, 1)',
  accent6: 'hsla(250, 50%, 49%, 1)',
  accent7: 'hsla(250, 50%, 52%, 1)',
  accent8: 'hsla(250, 50%, 54%, 1)',
  accent9: 'hsla(250, 50%, 57%, 1)',
  accent10: 'hsla(250, 50%, 60%, 1)',
  accent11: 'hsla(250, 50%, 90%, 1)',
  accent12: 'hsla(250, 50%, 95%, 1)',
};

const builtThemes = createV5Theme({
  darkPalette,
  lightPalette,
  componentThemes: v5ComponentThemes,
  accent: {
    light: accentLight,
    dark: accentDark,
  },
  childrenThemes: {
    // Include default color themes (blue, red, green, yellow, etc.)
    ...defaultChildrenThemes,

    // Semantic color themes for warnings, errors, and success states
    warning: {
      light: yellow,
      dark: yellowDark,
    },
    error: {
      light: red,
      dark: redDark,
    },
    success: {
      light: green,
      dark: greenDark,
    },
  },
});

export type Themes = typeof builtThemes;

// the process.env conditional here is optional but saves web client-side bundle
// size by leaving out themes JS. tamagui automatically hydrates themes from CSS
// back into JS for you, and the bundler plugins set TAMAGUI_ENVIRONMENT. so
// long as you are using the Vite, Next, Webpack plugins this should just work,
// but if not you can just export builtThemes directly as themes:
export const themes: Themes =
  process.env.TAMAGUI_ENVIRONMENT === 'client' &&
  process.env.NODE_ENV === 'production'
    ? ({} as any)
    : (builtThemes as any);
