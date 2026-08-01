// Palette de couleurs Boutikplus — inspirée de Jumia
// Orange vibrant en primaire, violet en secondaire, vert fonctionnel

export const colors = {
  // Primaires (Jumia-like)
  primary: '#FF6B00',
  primaryLight: '#FF8533',
  primaryDark: '#E55A00',
  secondary: '#6B2D8E',
  secondaryLight: '#8B3DAE',

  // Fonds
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F3F5',

  // Texte
  text: '#1A1A2E',
  textMuted: '#6C757D',
  textInverse: '#FFFFFF',

  // Fonctionnels
  success: '#00A859',
  danger: '#DC3545',
  warning: '#FFC107',
  info: '#0DCAF0',

  // Opérateurs Mobile Money
  orangeMoney: '#FF7900',
  moovMoney: '#0066B3',

  // Bordures & états
  border: '#E9ECEF',
  borderLight: '#F1F3F5',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.08)',
} as const;

export type AppColors = typeof colors;
