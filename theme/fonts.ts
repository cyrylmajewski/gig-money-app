import { createFont } from 'tamagui';

/**
 * All fonts use Jersey 25 — pixelated display font for gamified feel.
 */

const jerseyFace = {
  200: { normal: 'Jersey25_400Regular' },
  300: { normal: 'Jersey25_400Regular' },
  400: { normal: 'Jersey25_400Regular' },
  500: { normal: 'Jersey25_400Regular' },
  600: { normal: 'Jersey25_400Regular' },
  700: { normal: 'Jersey25_400Regular' },
  800: { normal: 'Jersey25_400Regular' },
  900: { normal: 'Jersey25_400Regular' },
} as const;

export const bodyFont = createFont({
  family: 'Jersey25',
  size: {
    1: 14, 2: 15, 3: 16, 4: 17, 5: 18, 6: 20, 7: 24, 8: 28,
    9: 32, 10: 42, 11: 48, 12: 54, 13: 62, 14: 72, 15: 88, 16: 104,
    true: 17,
  },
  lineHeight: {
    1: 20, 2: 21, 3: 22, 4: 24, 5: 26, 6: 28, 7: 32, 8: 36,
    9: 42, 10: 52, 11: 58, 12: 66, 13: 74, 14: 86, 15: 102, 16: 122,
    true: 24,
  },
  letterSpacing: {
    1: 0.5, 2: 0.5, 3: 0.5, 4: 0.5, 5: 0.5, 6: 0.5, 7: 0.5, 8: 0.5,
    9: 0.5, 10: 0.5, 11: 0.5, 12: 0.5, 13: 0.5, 14: 0.5, 15: 0.5, 16: 0.5,
    true: 0.5,
  },
  weight: {
    1: '400', 2: '400', 3: '400', 4: '400', 5: '400', 6: '400',
    7: '400', 8: '400', 9: '400', 10: '400', 11: '400', 12: '400',
    13: '400', 14: '400', 15: '400', 16: '400', true: '400',
  },
  face: jerseyFace,
});

export const headingFont = createFont({
  family: 'Jersey25',
  size: {
    1: 14, 2: 16, 3: 18, 4: 20, 5: 22, 6: 26, 7: 32, 8: 38,
    9: 44, 10: 56, 11: 64, 12: 72, 13: 84, 14: 96, 15: 112, 16: 128,
    true: 20,
  },
  lineHeight: {
    1: 18, 2: 20, 3: 22, 4: 24, 5: 26, 6: 30, 7: 36, 8: 42,
    9: 48, 10: 60, 11: 68, 12: 78, 13: 90, 14: 104, 15: 120, 16: 136,
    true: 24,
  },
  letterSpacing: {
    1: 0.5, 2: 0.5, 3: 0.5, 4: 0.5, 5: 0.5, 6: 0.5, 7: 0.5, 8: 0.5,
    9: 0.5, 10: 0.5, 11: 0.5, 12: 0.5, 13: 0.5, 14: 0.5, 15: 0.5, 16: 0.5,
    true: 0.5,
  },
  weight: {
    1: '400', 2: '400', 3: '400', 4: '400', 5: '400', 6: '400',
    7: '400', 8: '400', 9: '400', 10: '400', 11: '400', 12: '400',
    13: '400', 14: '400', 15: '400', 16: '400', true: '400',
  },
  face: jerseyFace,
});
