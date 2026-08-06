export const typography = {
  fontFamily: 'Poppins',
  fontFamilyFallback: 'System',
  sizes: {
    caption: 11,
    small: 13,
    body: 15,
    subtitle: 17,
    title: 20,
    heading: 24,
    hero: 30,
    mega: 38,
    display: 48,
    ultra: 60,
  },
  responsiveSizes: {
    title: { compact: 20, wide: 22 },
    heading: { compact: 24, wide: 30 },
    hero: { compact: 30, wide: 40 },
    display: { compact: 40, wide: 52 },
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  letterSpacings: { tight: -0.5, normal: 0, wide: 0.35, ultra: 1.1 },
  lineHeights: { tight: 1.2, normal: 1.45, relaxed: 1.6 },
  lineHeightPx: { caption: 16, small: 19, body: 22, subtitle: 25, title: 28, heading: 32, hero: 38 },
} as const;

export type AppTypography = typeof typography;
