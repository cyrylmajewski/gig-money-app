import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { Platform, StyleSheet, View } from 'react-native';

const DEFAULT_EXTRA_HEIGHT = 14;

type TopSafeAreaScrimProps = {
  topInset: number;
  extraHeight?: number;
};

export function TopSafeAreaScrim({
  topInset,
  extraHeight = DEFAULT_EXTRA_HEIGHT,
}: TopSafeAreaScrimProps) {
  const height = topInset + extraHeight;
  const style = [styles.scrim, { height }];
  const canUseGlass =
    Platform.OS === 'ios' &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable();

  if (canUseGlass) {
    return (
      <GlassView
        pointerEvents="none"
        glassEffectStyle="regular"
        tintColor="rgba(18, 18, 22, 0.78)"
        style={style}
      />
    );
  }

  return <View pointerEvents="none" style={[style, styles.fallback]} />;
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  fallback: {
    backgroundColor: 'rgba(18, 18, 22, 0.94)',
  },
});
