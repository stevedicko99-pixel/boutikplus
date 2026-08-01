// Système d'espacement — échelle 4px
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 56,
} as const;

export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
  circle: 9999,
} as const;

export const layout = {
  screenWidth: '100%' as const,
  cardPadding: 16,
  sectionGap: 24,
  tabBarHeight: 64,
  headerHeight: 56,
  productCardWidth: 165,
} as const;

export type AppSpacing = typeof spacing;
export type AppRadius = typeof radius;
