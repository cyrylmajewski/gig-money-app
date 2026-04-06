import { defaultConfig } from '@tamagui/config/v5';
import { createTamagui } from 'tamagui';
import { bodyFont, headingFont } from './theme/fonts';
import { mintDark, darkGray, focusBorder } from './theme/colors';

// ── Build a value replacement map ───────────────────────────────────────────
// The original dark theme uses HSL grays. We map each to our darkGray scale.

const hslToDarkGray: Record<string, string> = {
  'hsla(0, 0%, 4%, 1)': darkGray.gray1,
  'hsla(0, 0%, 8%, 1)': darkGray.gray2,
  'hsla(0, 0%, 10%, 1)': darkGray.gray3,
  'hsla(0, 0%, 14%, 1)': darkGray.gray4,
  'hsla(0, 0%, 20%, 1)': darkGray.gray5,
  'hsla(0, 0%, 27%, 1)': darkGray.gray6,
  'hsla(0, 0%, 40%, 1)': darkGray.gray7,
  'hsla(0, 0%, 47%, 1)': darkGray.gray8,
  'hsla(0, 0%, 52%, 1)': darkGray.gray9,
  'hsla(0, 0%, 67%, 1)': darkGray.gray10,
  'hsla(0, 0%, 80%, 1)': darkGray.gray11,
  'hsla(0, 0%, 100%, 1)': darkGray.gray12,
};

// Also map the original dark green scale to our mint
const hslToMint: Record<string, string> = {
  'hsla(151, 55%, 42%, 1)': mintDark.green9,
  'hsla(152, 56%, 39%, 1)': mintDark.green10,
  'hsla(154, 60%, 32%, 1)': mintDark.green11,
  'hsla(155, 40%, 16%, 1)': mintDark.green12,
};

// Merge all replacements
const valueMap: Record<string, string> = { ...hslToDarkGray, ...hslToMint };

// Also handle alpha/opacity variants of the grays
const alphaMap: Record<string, string> = {};
for (const [hsl, hex] of Object.entries(hslToDarkGray)) {
  // Extract the lightness, create alpha variants
  const match = hsl.match(/hsla\(0, 0%, (\d+)%, 1\)/);
  if (match) {
    const l = match[1];
    for (const a of ['0.8', '0.6', '0.4', '0.2', '0.1', '0.075', '0.05', '0.025', '0.02', '0.01']) {
      alphaMap[`hsla(0, 0%, ${l}%, ${a})`] = hex + Math.round(parseFloat(a) * 255).toString(16).padStart(2, '0');
    }
  }
}

const fullMap = { ...valueMap, ...alphaMap };

/** Replace all known HSL values in a theme with our custom palette. */
function remapTheme(theme: Record<string, any>): Record<string, any> {
  const patched: Record<string, any> = {};
  for (const [key, val] of Object.entries(theme)) {
    if (typeof val === 'string' && fullMap[val]) {
      patched[key] = fullMap[val];
    } else {
      patched[key] = val;
    }
  }
  return patched;
}

// ── Build themes ────────────────────────────────────────────────────────────

const originalThemes = defaultConfig.themes as Record<string, Record<string, any>>;
const themes: Record<string, Record<string, any>> = {};

for (const [name, theme] of Object.entries(originalThemes)) {
  if (name.startsWith('dark')) {
    // Remap all HSL values in dark themes to our palette
    themes[name] = remapTheme(theme);
  } else {
    // Keep light themes as-is (unused but required by Tamagui)
    themes[name] = { ...theme };
  }
}

// Override the root dark theme
themes['dark'] = {
  ...themes['dark'],
  background: darkGray.gray1,
  backgroundHover: darkGray.gray2,
  backgroundPress: darkGray.gray3,
  backgroundFocus: darkGray.gray3,
  borderColor: darkGray.gray5,
  borderColorHover: darkGray.gray6,
  borderColorFocus: focusBorder,
  outlineColor: focusBorder,
};

// Make <Theme name="green"><Button> actually bright green
if (themes['dark_green_Button']) {
  themes['dark_green_Button'] = {
    ...themes['dark_green_Button'],
    background: mintDark.green9,       // #4ADE80
    backgroundHover: mintDark.green10, // #6EE7A0
    backgroundPress: mintDark.green8,  // #40B87A
    backgroundFocus: mintDark.green9,
    color: darkGray.gray1,             // dark text on green
    colorHover: darkGray.gray1,
    colorPress: darkGray.gray1,
    borderColor: mintDark.green8,
  };
}

// Also fix the green base theme's accent colors
if (themes['dark_green']) {
  themes['dark_green'] = {
    ...themes['dark_green'],
    color9: mintDark.green9,
    color10: mintDark.green10,
    color11: mintDark.green11,
    color12: mintDark.green12,
  };
}

// ── Assemble config ─────────────────────────────────────────────────────────

const tamaguiConfig = createTamagui({
  ...defaultConfig,
  settings: {
    ...defaultConfig.settings,
    defaultFont: 'body',
  },
  fonts: {
    body: bodyFont,
    heading: headingFont,
  },
  themes: themes as typeof defaultConfig.themes,
});

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
