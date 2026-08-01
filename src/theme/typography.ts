// Système typographique — police Poppins
export const typography = {
  fontFamily: 'Poppins',

  sizes: {
    caption: 11,
    small: 13,
    body: 15,
    subtitle: 17,
    title: 20,
    heading: 24,
    hero: 30,
    mega: 38,
  },

  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.45,
    relaxed: 1.6,
  },
} as const;

export type AppTypography = typeof typography;
