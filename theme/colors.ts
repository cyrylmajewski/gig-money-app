/**
 * GigMoney color palette — dark theme, gamified/friendly.
 *
 * Accent: bright mint green (#4ADE80)
 * Background: #0F1419 (deep blue-dark)
 * Cards: #1A2029
 * Gold: #FBBF24 (XP / rewards)
 *
 * 12-step Radix convention:
 *   1-2   backgrounds
 *   3-4   component backgrounds
 *   5-6   borders
 *   7-8   interactive / solid UI
 *   9-10  solid (the accent)
 *   11-12 text
 */

// ── Mint-green accent (bright, game-like) ───────────────────────────────────

export const mintDark = {
  green1: '#0B1F14',
  green2: '#0F2B1A',
  green3: '#143A24',
  green4: '#1A4D30',
  green5: '#22613E',
  green6: '#2D7A4E',
  green7: '#3B9963',
  green8: '#40B87A',
  green9: '#4ADE80',
  green10: '#6EE7A0',
  green11: '#A3F0C4',
  green12: '#E0FBE9',
} as const;

// ── Dark neutral base ───────────────────────────────────────────────────────

export const darkGray = {
  gray1: '#0F1419',
  gray2: '#151B22',
  gray3: '#1A2029',
  gray4: '#212834',
  gray5: '#2A3140',
  gray6: '#353D4B',
  gray7: '#454E5D',
  gray8: '#5F6878',
  gray9: '#7C8594',
  gray10: '#959DAA',
  gray11: '#B8BEC8',
  gray12: '#ECEFF3',
} as const;

/** Focus border — mint green at ~65% opacity */
export const focusBorder = '#4ADE80A6';

// ── Coral-pink (errors / damage) ────────────────────────────────────────────

export const coralDark = {
  red1: '#1F0F12',
  red2: '#2D1419',
  red3: '#421C23',
  red4: '#5A242E',
  red5: '#722F3B',
  red6: '#8F3B4A',
  red7: '#B34D60',
  red8: '#D9627A',
  red9: '#FB7185',
  red10: '#FC8D9E',
  red11: '#FDB5C1',
  red12: '#FEE2E8',
} as const;

// ── Gold / amber (XP, rewards, achievements) ────────────────────────────────

export const goldDark = {
  yellow1: '#1A1508',
  yellow2: '#241D0B',
  yellow3: '#352A10',
  yellow4: '#493A15',
  yellow5: '#5E4B1C',
  yellow6: '#785F24',
  yellow7: '#9A7B30',
  yellow8: '#C49A3A',
  yellow9: '#FBBF24',
  yellow10: '#FCD34D',
  yellow11: '#FDE68A',
  yellow12: '#FEF9C3',
} as const;
