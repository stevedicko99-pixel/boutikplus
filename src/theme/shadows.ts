import type { ImageStyle, ViewStyle } from 'react-native';
import { Platform } from 'react-native';

type NativeShadow = { color: string; offsetH: number; opacity: number; radius: number; elevation: number; webBox: string };
export type ShadowStyle = ViewStyle & ImageStyle & { boxShadow?: string };

const build = (shadow: NativeShadow): ShadowStyle => Platform.OS === 'web'
  ? ({ boxShadow: shadow.webBox } as ShadowStyle)
  : ({
      shadowColor: shadow.color,
      shadowOffset: { width: 0, height: shadow.offsetH },
      shadowOpacity: shadow.opacity,
      shadowRadius: shadow.radius,
      elevation: shadow.elevation,
    } as ShadowStyle);

export const shadows = {
  subtle: build({ color: '#3F2D22', offsetH: 2, opacity: 0.06, radius: 6, elevation: 1, webBox: '0 2px 8px rgba(63,45,34,0.06)' }),
  fani: build({ color: '#3F2D22', offsetH: 6, opacity: 0.09, radius: 14, elevation: 3, webBox: '0 8px 24px rgba(63,45,34,0.09)' }),
  faniHover: build({ color: '#3F2D22', offsetH: 10, opacity: 0.12, radius: 18, elevation: 5, webBox: '0 14px 32px rgba(63,45,34,0.12)' }),
  stamped: build({ color: '#85351F', offsetH: 1, opacity: 0.25, radius: 0, elevation: 1, webBox: '1px 1px 0 rgba(133,53,31,0.25)' }),
  hero: build({ color: '#3F2D22', offsetH: 14, opacity: 0.13, radius: 24, elevation: 7, webBox: '0 20px 44px rgba(63,45,34,0.13)' }),
  focus: Platform.OS === 'web' ? ({ boxShadow: '0 0 0 3px rgba(36,107,103,0.20)' } as ShadowStyle) : ({} as ShadowStyle),
} as const;

export type AppShadows = typeof shadows;
