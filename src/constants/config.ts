// Configuration globale de l'application — Boutikplus
// Constantes partagées (URL publique, identité, etc.)

/**
 * URL publique de l'application web (déploiement Vercel).
 * Utilisée pour construire les liens partageables des boutiques et produits :
 *   - Page boutique : `${PUBLIC_APP_URL}/s/${shopId}`
 *   - Page produit  : `${PUBLIC_APP_URL}/p/${productId}`
 *
 * Ces chemins sont mappés aux écrans `ShopDetail` / `ProductDetail` via la
 * config `linking` de React Navigation (voir src/navigation/RootNavigator.tsx)
 * et le SPA rewrite de vercel.json. Un visiteur non connecté qui ouvre le
 * lien arrive directement sur la page concernée.
 */
export const PUBLIC_APP_URL = 'https://boutikplus.vercel.app';

/** URL publique d'une boutique partageable. */
export const shopPublicUrl = (shopId: string): string =>
  `${PUBLIC_APP_URL}/s/${shopId}`;

/** URL publique d'un produit partageable. */
export const productPublicUrl = (productId: string): string =>
  `${PUBLIC_APP_URL}/p/${productId}`;
