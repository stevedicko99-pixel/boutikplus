import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Hook pour définir dynamiquement le titre de la page (SEO) sur Web.
 * Sur mobile (iOS/Android), ce hook est un no-op (pas de document).
 *
 * @example
 * useDocumentTitle('Boutikplus — Accueil');
 * useDocumentTitle(`Produit | ${product.name}`);
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof document !== 'undefined') {
      document.title = title;
    }
  }, [title]);
}
