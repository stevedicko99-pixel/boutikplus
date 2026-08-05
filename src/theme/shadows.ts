// Ombres teintées corail en couches — signature "Fil de Faso".
// Chaque preset expose une ombre native (iOS shadowColor / Android elevation)
// ET un équivalent web (box-shadow CSS double-couche) via Platform.select,
// pour rester compatible RN Web 0.19+ sans polyfill.
//
// Teinter les ombres en corail (au lieu du noir générique) est l'un des marqueurs
// du langage : ça réchauffe la profondeur et lie visuellement toutes les cartes.
import type { ImageStyle, ViewStyle } from 'react-native';
import { Platform } from 'react-native';

type NativeShadow = {
  color: string;
  offsetH: number;
  opacity: number;
  radius: number;
  elevation: number;
  webBox: string;
};

// Type d'ombre compatible à la fois avec ViewStyle et ImageStyle.
// Sur web, `boxShadow` (string) est une extension RN Web non typée
// dans ViewStyle/ImageStyle de base — on l'ajoute explicitement pour
// pouvoir appliquer les ombres aussi bien sur <View> que sur <Image>.
export type ShadowStyle = ViewStyle & ImageStyle & { boxShadow?: string };

const build = (s: NativeShadow): ShadowStyle => {
  if (Platform.OS === 'web') {
    return { boxShadow: s.webBox } as ShadowStyle;
  }
  return {
    shadowColor: s.color,
    shadowOffset: { width: 0, height: s.offsetH },
    shadowOpacity: s.opacity,
    shadowRadius: s.radius,
    elevation: s.elevation,
  } as ShadowStyle;
};

export const shadows = {
  // Carte standard — douce, corail, hauteur modérée
  fani: build({
    color: '#FF8A5C',
    offsetH: 8,
    opacity: 0.1,
    radius: 16,
    elevation: 3,
    webBox: '0 12px 28px -14px rgba(255,138,92,0.22), 0 2px 6px -2px rgba(42,34,48,0.05)',
  }),
  // Carte au survol web — s'élève, ombre plus marquée
  faniHover: build({
    color: '#FF8A5C',
    offsetH: 14,
    opacity: 0.18,
    radius: 22,
    elevation: 6,
    webBox: '0 22px 40px -16px rgba(255,138,92,0.32), 0 4px 10px -3px rgba(42,34,48,0.08)',
  }),
  // Badge tamponné — offset volontaire de 1px (effet encre/tampon)
  stamped: build({
    color: '#E66A3A',
    offsetH: 1,
    opacity: 0.35,
    radius: 0,
    elevation: 1,
    webBox: '1px 1px 0 rgba(192,73,30,0.35)',
  }),
  // Carte hero (AI dashboard, en-tête vendeur) — profonde, accent profond
  hero: build({
    color: '#C0491E',
    offsetH: 18,
    opacity: 0.16,
    radius: 28,
    elevation: 8,
    webBox: '0 24px 48px -18px rgba(192,73,30,0.30), 0 6px 14px -4px rgba(42,34,48,0.10)',
  }),
} as const;

export type AppShadows = typeof shadows;
