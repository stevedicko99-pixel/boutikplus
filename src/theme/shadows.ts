// Élévations — Boutikplus
// Ombres douces et cohérentes (mobile + web) pour un rendu plus premium.

import { Platform, type ViewStyle } from 'react-native';

function elevation(
  height: number,
  blur: number,
  opacity: number,
  androidElevation: number,
): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B1220',
      shadowOffset: { width: 0, height },
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
    android: { elevation: androidElevation },
    default: {
      boxShadow: `0px ${height}px ${blur}px rgba(11, 18, 32, ${opacity})`,
    } as ViewStyle,
  })!;
}

export const shadows = {
  none: {} as ViewStyle,
  sm: elevation(2, 8, 0.06, 2),
  md: elevation(6, 18, 0.08, 4),
  lg: elevation(12, 28, 0.12, 8),
  primary: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#FF6B00',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 14,
    },
    android: { elevation: 5 },
    default: { boxShadow: '0px 6px 16px rgba(255, 107, 0, 0.28)' } as ViewStyle,
  })!,
} as const;

export type AppShadows = typeof shadows;
