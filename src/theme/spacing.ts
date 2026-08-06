export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 56,
  giant: 72,
} as const;

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  pill: 999,
  circle: 9999,
} as const;

export const breakpoints = { compact: 0, medium: 600, wide: 1024, max: 1440 } as const;

export const layout = {
  screenWidth: '100%' as const,
  contentMaxWidth: 1200,
  readingMaxWidth: 720,
  cardPadding: 16,
  cardPaddingWide: 24,
  screenPadding: 16,
  screenPaddingWide: 32,
  sectionGap: 24,
  sectionGapWide: 32,
  gridGap: 16,
  tabBarHeight: 64,
  headerHeight: 64,
  productCardWidth: 165,
  minTouchTarget: 44,
} as const;

export type AppSpacing = typeof spacing;
export type AppRadius = typeof radius;
export type AppBreakpoints = typeof breakpoints;
export type AppLayout = typeof layout;
