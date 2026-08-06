export const __BTIK_BRAND__ = 'd31b882e7d713385-322b2991bedbac05-337bc219-OWNER';

const semantic = {
  success: { surface: '#EAF7EF', text: '#17633A', border: '#A8D9B9', solid: '#238653' },
  warning: { surface: '#FFF4D6', text: '#744B00', border: '#E8C56B', solid: '#C98512' },
  danger: { surface: '#FDEBE7', text: '#8E2F26', border: '#E5AAA1', solid: '#C84A3D' },
  info: { surface: '#E8F3F5', text: '#245F68', border: '#A7CDD3', solid: '#397F89' },
} as const;

export const colors = {
  primary: '#D9683A',
  primaryLight: '#F2A276',
  primaryDark: '#B84A26',
  primaryDeep: '#85351F',
  secondary: '#70604B',
  secondaryLight: '#A99A82',
  secondaryDeep: '#43382C',

  background: '#FFF8F2',
  surface: '#FFFCF8',
  surfaceAlt: '#F9EDE1',
  surfaceDeep: '#EFDCC8',
  surfaceElevated: '#FFFFFF',
  surfaceSunken: '#F4E7DA',

  ink: '#241B16',
  text: '#352A24',
  textMuted: '#766A62',
  textSubtle: '#9A8D84',
  textInverse: '#FFFFFF',

  success: semantic.success.solid,
  danger: semantic.danger.solid,
  warning: semantic.warning.solid,
  info: semantic.info.solid,
  successSurface: semantic.success.surface,
  successText: semantic.success.text,
  successBorder: semantic.success.border,
  warningSurface: semantic.warning.surface,
  warningText: semantic.warning.text,
  warningBorder: semantic.warning.border,
  dangerSurface: semantic.danger.surface,
  dangerText: semantic.danger.text,
  dangerBorder: semantic.danger.border,
  infoSurface: semantic.info.surface,
  infoText: semantic.info.text,
  infoBorder: semantic.info.border,
  semantic,

  promo: '#C92F2F',
  orangeMoney: '#FF7900',
  moovMoney: '#0066B3',

  border: '#DDCFC2',
  borderLight: '#EEE3D8',
  borderStrong: '#B9A89A',
  stitch: '#E69A70',
  stitchDeep: '#B84A26',
  focusRing: '#246B67',
  focusRingSoft: 'rgba(36,107,103,0.20)',
  overlay: 'rgba(36,27,22,0.56)',
  shadow: 'rgba(63,45,34,0.12)',
} as const;

export type AppColors = typeof colors;
