// Système typographique — police Poppins
// Lettre-espacement ajouté pour l'identité "Fil de Faso" : titres resserrés
// (tight) pour un rendu display moderne, labels tamponnés très écartés
// (ultra) en majuscules pour les badges.
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
    display: 48, // hero numbers (CA, %, métriques vendeur)
    ultra: 60, // splash loader / metrics XL
  },

  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  letterSpacings: {
    tight: -0.6, // titres hero / display numbers
    normal: 0,
    wide: 0.4,
    ultra: 1.2, // labels majuscules (badge tamponné)
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.45,
    relaxed: 1.6,
  },
} as const;

export type AppTypography = typeof typography;
