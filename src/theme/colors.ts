export const __BTIK_BRAND__ = 'd31b882e7d713385-322b2991bedbac05-337bc219-OWNER';

// ── Palette v1.4 « Terracotta raffinée + Sarcelle » ─────────────────────────
// Direction : terracotta plus profonde et saturée (chaleur Faso conservée),
// accent sarcelle riche qui crée un duo complémentaire orange/bleu = énergie.
// Surfaces neutres (crème très subtile) — finit la teinte jaune fatigante.
// Sémantiques modernisées, dark mode corrigé (tons chauds, pas violets génériques).
const semantic = {
  success: { surface: '#E6F5EE', text: '#0F5132', border: '#A3D9C2', solid: '#1A8B5C' },
  warning: { surface: '#FFF6DC', text: '#6B3A00', border: '#F0CB6B', solid: '#D99100' },
  danger:  { surface: '#FCEAE7', text: '#7A2317', border: '#F0B4AB', solid: '#DC2D2D' },
  info:    { surface: '#E6F4F4', text: '#0A5C5B', border: '#A3D4D3', solid: '#0E7C7B' },
} as const;

export const colors = {
  /* ── Primary : Terracotta profonde et saturée (audacieuse) ── */
  primary: '#C24A1E',
  primaryLight: '#E8916B',
  primaryDark: '#9B3A18',
  primaryDeep: '#722A0F',

  /* ── Secondary : Brun chaud raffiné (pour fonds/surfaces alternatifs) ── */
  secondary: '#6B5D4A',
  secondaryLight: '#A0917D',
  secondaryDeep: '#3F3628',

  /* ── Accent : Sarcelle riche (nouveau — duo complémentaire orange/bleu) ── */
  accent: '#0E7C7B',
  accentLight: '#3AA6A5',
  accentDeep: '#0A5C5B',
  accentSurface: '#E6F4F4',
  accentText: '#0A5C5B',
  accentBorder: '#A3D4D3',

  /* ── Surfaces : crème neutre, plus raffinée (fini le jaune fatigant) ── */
  background: '#FBFAF7',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F1EB',
  surfaceDeep: '#E8E2D7',
  surfaceElevated: '#FFFFFF',
  surfaceSunken: '#F0EBE2',

  /* ── Ink/Text : plus profonds, plus contrastés ── */
  ink: '#1A1410',
  text: '#2A2218',
  textMuted: '#6B5F55',
  textSubtle: '#928578',
  textInverse: '#FFFFFF',

  /* ── Semantic (modernisées) ── */
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

  /* ── Paiement & marketing ── */
  promo: '#E94B3C',        // corail vif, plus distinctif que le rouge générique
  orangeMoney: '#FF7900',
  moovMoney: '#0066B3',

  /* ── Borders & accents structurels ── */
  border: '#E5DFD3',
  borderLight: '#F0EBE2',
  borderStrong: '#A89B8C',
  stitch: '#D68059',
  stitchDeep: '#9B3A18',
  focusRing: '#0E7C7B',           // sarcelle — cohérent avec accent
  focusRingSoft: 'rgba(14,124,123,0.22)',
  overlay: 'rgba(26,20,16,0.58)',
  shadow: 'rgba(58,42,30,0.14)',

  /* ── Premium Pro Max ───────────────────────────── */
  gold: '#D4A042',
  goldLight: '#F0D088',
  goldSurface: '#FBF2DC',
  glass: 'rgba(251,250,247,0.74)',
  glassStrong: 'rgba(251,250,247,0.88)',
  glassBorder: 'rgba(255,255,255,0.55)',
  glassDark: 'rgba(26,20,16,0.44)',
  glassDarkBorder: 'rgba(255,255,255,0.28)',
  inkSoft: 'rgba(26,20,16,0.06)',
  glow: 'rgba(194,74,30,0.30)',
  brandDeep: '#9B3A18',
  brandGradient: ['#E8916B', '#C24A1E', '#9B3A18'] as const,
  brandGradientDeep: ['#C24A1E', '#722A0F'] as const,
  /* Accent gradient pour éléments spéciaux (badges, livreur, etc.) */
  accentGradient: ['#3AA6A5', '#0E7C7B', '#0A5C5B'] as const,
} as const;

export type AppColors = typeof colors;
