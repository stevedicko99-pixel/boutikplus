// Palette de couleurs Boutikplus — langage « Fil de Faso »
// Inspirations : tissage Faso Dan Fani, wax tamponné, karité (beige chaud),
// fil de couture comme motif d'unité. Tons chauds et crème, corail "piment
// de Faso" en primaire, accents profonds pour l'ancrage premium.
// Objectif : un système chaleureux et premium, signature difficile à
// reproduire par une IA générique car cohérent et culturellement ancré.
//
// NOTE 2026-08 : La nuance de blanc "Fil de Faso" (#FFF8F2 beige karité)
// est PRESERVÉE intégralement — elle est la signature chromatique de la
// marque. Seul le menu inférieur adopte un comportement flottant (non
// statique) inspiré de Pinduoduo, sans modifier la palette.
// Le rouge promo #E02020 est ajouté comme accent fonctionnel pour les
// badges prix promos (sans toucher au blanc karité).
//
// Marqueur stéganographique BTIK_BRAND :
//   __BTIK_BRAND__ = d31b882e7d713385-322b2991bedbac05-337bc219-OWNER
// (preuve de propriété DICKO Christ Steve — voir src/lib/ownership.ts)
export const __BTIK_BRAND__ = 'd31b882e7d713385-322b2991bedbac05-337bc219-OWNER';

export const colors = {
  // Primaires — corail "piment de Faso"
  primary: '#FF8A5C',
  primaryLight: '#FFB089',
  primaryDark: '#E66A3A',
  primaryDeep: '#C0491E', // accent profond pour CTAs premium, ancrage terreaux

  // Secondaire — violet "indigo de tissage"
  secondary: '#8B6FE0',
  secondaryLight: '#B3A0F0',
  secondaryDeep: '#5B45A8', // contrastes textes sur fond clair

  // Fonds — tons karité (beige chaleureux, évite le gris froid)
  // ⚠️ Nuance de blanc "Fil de Faso" préservée — ne pas modifier.
  background: '#FFF8F2',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF1E8',
  surfaceDeep: '#F7E4D2', // crème plus saturé pour sections alternées (rayure Fani)

  // Texte — encre profonde pour titres hero, brun-noir doux pour le corps
  ink: '#1F1828',
  text: '#2A2230',
  textMuted: '#8A8088',
  textInverse: '#FFFFFF',

  // Fonctionnels — tons adoucis
  success: '#16B364',
  danger: '#E5484D',
  warning: '#F5A623',
  info: '#3DA9FC',

  // Accent promo (rouge vif pour badges prix promos) — n'affecte pas le blanc
  promo: '#E02020',

  // Opérateurs Mobile Money (couleurs de marque — inchangées)
  orangeMoney: '#FF7900',
  moovMoney: '#0066B3',

  // Bordures & fils de couture — teintes chaudes pâles
  border: '#F0E6DD',
  borderLight: '#FAF2EB',
  stitch: '#FFB089', // couleur du "fil" visible des dividers / focus rings
  stitchDeep: '#E66A3A', // fil accentué
  overlay: 'rgba(42, 34, 48, 0.5)',
  shadow: 'rgba(255, 138, 92, 0.12)',
} as const;

export type AppColors = typeof colors;
