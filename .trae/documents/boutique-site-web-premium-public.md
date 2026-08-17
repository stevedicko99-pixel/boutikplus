# Plan : Boutique = Site Web Premium Public & Indépendant

## Contexte

Aujourd'hui, quand un vendeur partage le lien de sa boutique (`https://boutikplus.app/s/shop-xxx`), l'URL ne fonctionne **pas** : aucun deep-linking n'est configuré sur `NavigationContainer`, et `ShopDetail` n'est pas dans `PUBLIC_ROUTES`. Un visiteur non connecté qui ouvre le lien tombe sur l'écran de Login. De plus, l'écran boutique actuel ([ShopDetailScreen.tsx](file:///c:/Users/steve/Nouveau%20dossier%20(3)/src/screens/home/ShopDetailScreen.tsx)) est basique : pas de horaires, contact, réseaux sociaux, ni design "premium".

**Objectif** : chaque boutique devient un site web premium complet et indépendant, partageable par URL, accessible sans connexion, avec un design de niveau LVMH/Shopify — responsive sur tous les appareils, mettant en valeur la personnalité de la boutique, ses produits et toutes ses infos pratiques.

## Approche recommandée

On **redessine `ShopDetailScreen`** lui-même (pas un écran duplicata) pour qu'il serve à la fois de page boutique in-app ET de site web public. On l' rend public, on active le deep-linking, on étend le modèle `Shop` (horaires, contact, réseaux sociaux), et on le transforme en une page premium multi-sections responsive.

## Étapes d'implémentation

### 1. Migration DB — Étendre le modèle `shops`
Créer `supabase/V6__shop_public_page.sql` :
```sql
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS slogan TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
COMMENT ON COLUMN shops.opening_hours IS 'Format: {"mon":{"open":"08:00","close":"18:00","closed":false}, ...}';
COMMENT ON COLUMN shops.social_links IS 'Format: {"instagram":"@handle","tiktok":"@handle","facebook":"url","snapchat":"url"}';
```
- Ajouter les policies RLS SELECT publiques sur ces colonnes (les boutiques sont visibles publiquement — vérifier que la policy SELECT existante sur `shops` couvre déjà les visiteurs non authentifiés ; sinon l'étendre avec `USING (status = 'active')`).
- Mettre à jour `supabase/schema.sql` (DDL de référence) avec les mêmes colonnes pour rester cohérent.

### 2. Types TypeScript
- [src/types/models.ts](file:///c:/Users/steve/Nouveau%20dossier%20(3)/src/types/models.ts#L59-L72) — étendre l'interface `Shop` :
  ```ts
  slogan: string | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  address: string | null;
  opening_hours: ShopOpeningHours | null;
  social_links: ShopSocialLinks | null;
  ```
  + définir `ShopOpeningHours` (`{ mon?: DayHours; tue?: ...; ... }` avec `DayHours = { open: string; close: string; closed?: boolean }`) et `ShopSocialLinks` (`{ instagram?: string; tiktok?: string; facebook?: string; snapchat?: string }`).
- [src/types/database.ts](file:///c:/Users/steve/Nouveau%20dossier%20(3)/src/types/database.ts) — étendre le Row/Insert/Update de `shops` avec les mêmes champs JSONB typés. Conserver `Relationships: []` sur la table (règle projet).

### 3. Données démo riches
[src/data/demoData.ts](file:///c:/Users/steve/Nouveau%20dossier%20(3)/src/data/demoData.ts#L51-L142) — enrichir les 6 `DEMO_SHOPS` avec : slogan, phone, whatsapp, email, address, opening_hours réalistes (ex. `{"mon":{"open":"08:00","close":"19:00"},...,"sun":{"closed":true}}`), social_links (instagram/tiktok handles). Donner une personnalité distincte à chaque boutique.

### 4. Saisie côté vendeur — `CreateShopScreen`
[src/screens/seller/CreateShopScreen.tsx](file:///c:/Users/steve/Nouveau%20dossier%20(3)/src/screens/seller/CreateShopScreen.tsx) — ajouter des champs optionnels (tous facultatifs pour ne pas freiner l'MVP) :
- Slogan (Input court)
- Téléphone + WhatsApp (Inputs `phone-pad`)
- Réseaux sociaux (Instagram, TikTok — Inputs simples, handles ou URLs)
- Horaires : version simplifiée = un sélecteur "Ouvert aujourd'hui ?" + horaires génériques (ouverture/fermeture identiques tous les jours) pour ne pas surcharger l'UI jeune. Les horaires détaillées par jour pourront venir plus tard.
Passer ces données à `createShop()`. Mettre à jour `dataService.createShop` pour les inclure dans l'insert Supabase.

### 5. Deep-linking — Activer le routing par URL
[src/navigation/RootNavigator.tsx](file:///c:/Users/steve/Nouveau%20dossier%20(3)/src/navigation/RootNavigator.tsx#L59-L62) — ajouter un objet `linking` au `NavigationContainer` :
```ts
const linking = {
  prefixes: [
    'https://boutikplus.vercel.app',
    'https://boutikplus.app',
    'boutikplus://',  // scheme natif (déjà dans app.json)
  ],
  config: {
    screens: {
      ShopDetail: 's/:shopId',
      ProductDetail: 'p/:productId',
      // les autres écrans sans path public = non accessibles par URL directe
    },
  },
};
```
Ajouter `ShopDetail` et `ProductDetail` à `PUBLIC_ROUTES` ([RootNavigator.tsx:25](file:///c:/Users/steve/Nouveau%20dossier%20(3)/src/navigation/RootNavigator.tsx#L25)) pour qu'un visiteur non connecté atterrissant sur `/s/{id}` ne soit pas redirigé vers Login.

**Cas cold-start** : React Navigation `linking` parse `getInitialURL()` automatiquement et construit l'état initial — un visiteur qui ouvre `https://boutikplus.vercel.app/s/shop-1` arrive directement sur la boutique, sans auth.

### 6. Redesign premium de `ShopDetailScreen`
Transformation complète de [src/screens/home/ShopDetailScreen.tsx](file:///c:/Users/steve/Nouveau%20dossier%20(3)/src/screens/home/ShopDetailScreen.tsx) en une page multi-sections premium. Layout responsive via `Dimensions.get('window').width` + `Platform.select` (grille 2 cols mobile, 3-4 desktop, conteneur max 1200px centré sur web).

Sections (de haut en bas) :
1. **Top bar flottante glassmorphism** — back, partager, WhatsApp (sticky, se compacte au scroll).
2. **Hero plein écran** — banner avec légère parallaxe (Animated sur `onScroll`), logo flottant en overlay, nom boutique (typo large), slogan, badges (ville, catégorie, vérifiée, note moyenne).
3. **Barre CTA principale** — Suivre (toggle), Contacter (WhatsApp), Appeler (tel:). Si visiteur non connecté : Suivre → Alert "Connectez-vous" ; WhatsApp/Appeler → marchent sans auth (via `openWhatsApp` / `tel:`).
4. **Section "À propos"** éditoriale — description riche, accent typographique.
5. **Section "Infos pratiques"** — grille 2 cols : horaires d'ouverture (par jour, badge "Ouvert maintenant"/"Fermé" calculé), adresse, paiements Mobile Money (badges OM/Moov), email, réseaux sociaux (icônes cliquables vers profils).
6. **Section "Catalogue"** — barre de filtres (tri prix, recherche par nom) + grille produits premium réutilisant `ProductCard`. Grille responsive.
7. **Section "Avis clients"** — note moyenne grande, distribution étoiles (barres), avis individuels.
8. **Footer** — nom boutique, slogan, "Propulsé par Boutikplus", année, liens sociaux.
9. **Sticky bottom CTA** (mobile) — bouton WhatsApp/Contacter toujours visible.

Animations : `Animated.ScrollView` avec `onScroll` → fade-in par section (interpoler `opacity`/`translateY`), parallaxe banner, sticky header compaction. Utiliser `useRef(new Animated.Value(0))`.

Réutiliser : `ProductCard`, `Rating`, `Button`, `EmptyState`, `LoadingSpinner`, `TrustBadges`/`calculateTrustBadges`, `formatFCFA`, `getCategoryName`, `openWhatsApp` (safeLinking), `openExternalLink`. **Ne pas dupliquer** ces composants.

Gestion non-auth : `useAuth().profile` peut être `null` — tous les CTA "panier/achat" vérifient `profile` et proposent Login si absent. Les CTA "contact/WhatsApp/appel" fonctionnent sans auth.

### 7. URL de partage cohérente
[src/screens/growth/ShareableShopScreen.tsx:83](file:///c:/Users/steve/Nouveau%20dossier%20(3)/src/screens/growth/ShareableShopScreen.tsx#L83) — remplacer l'URL hardcodée `https://boutikplus.app/s/shop-${shopId}` par une constante `PUBLIC_APP_URL` (définir dans `src/constants/config.ts` ou `helpContent.ts`) = `https://boutikplus.vercel.app`, et construire `${PUBLIC_APP_URL}/s/${shopId}`. Le message de partage inclut déjà le nom + logo (conserver). Avec le linking activé (étape 5), ce lien ouvre désormais réellement la boutique.

### 8. Meta tags dynamiques (scope limité)
SPA client-side : impossible d'injecter des OG tags par boutique sans SSR. Solution pragmatique :
- Conserver les OG tags génériques dans `dist/index.html` (déjà faits).
- Le message de partage (WhatsApp/SMS) contient déjà nom + description + URL — c'est ce qui s'affiche dans les previews WhatsApp/TikTok.
- **Non inclus maintenant** (futur enhancement) : une Edge Function Vercel `/api/shop-og?shopId=...` qui renvoie du HTML avec OG tags dynamiques pour les crawlers, via un rewrite conditionnel sur User-Agent bot. Trop complexe pour cette itération.

## Fichiers modifiés (résumé)

| Fichier | Action |
|---|---|
| `supabase/V6__shop_public_page.sql` | Créer (migration ALTER TABLE) |
| `supabase/schema.sql` | Mettre à jour DDL `shops` (référence) |
| `src/types/models.ts` | Étendre `Shop` + nouveaux types |
| `src/types/database.ts` | Étendre Row/Insert/Update `shops` |
| `src/data/demoData.ts` | Enrichir les 6 DEMO_SHOPS |
| `src/screens/seller/CreateShopScreen.tsx` | Ajouter champs contact/horaires/réseaux |
| `src/lib/dataService.ts` | `createShop`/`getShop` incluent nouveaux champs |
| `src/navigation/RootNavigator.tsx` | `linking` config + `PUBLIC_ROUTES` étendu |
| `src/screens/home/ShopDetailScreen.tsx` | **Redesign premium complet** |
| `src/screens/growth/ShareableShopScreen.tsx` | URL de partage via `PUBLIC_APP_URL` |
| `src/constants/config.ts` (nouveau) ou `helpContent.ts` | Constante `PUBLIC_APP_URL` |

## Vérification end-to-end

1. **Build web** : `npx expo export --platform web --output-dir dist` — doit réussir sans erreur TS.
2. **Lint types** : `npx tsc --noEmit` — 0 erreur.
3. **Démo local web** : `npx expo start --web --port 8082` → ouvrir `http://localhost:8082/s/shop-1` → la boutique "Faso Fashion" s'affiche **sans connexion** (page premium complète).
4. **Parcours non-auth** : sur la page boutique, vérifier que "Contacter" (WhatsApp) et "Appeler" fonctionnent sans login, et que "Suivre"/"Ajouter au panier" proposent Login.
5. **Responsive** : redimensionner le navigateur (mobile 375px, tablette 768px, desktop 1200px) — la grille produits passe de 2 → 3 → 4 colonnes, le layout reste lisible.
6. **Deep link produit** : depuis la boutique, taper un produit → `ProductDetail` s'ouvre (public).
7. **Share** : depuis une boutique connectée, ouvrir "Partager" → l'URL copiée est `https://boutikplus.vercel.app/s/{id}` → en la collant dans un onglet incognito elle ouvre la boutique.
8. **App native** : `npx expo start` (Expo Go) → navigation in-app vers ShopDetail fonctionne toujours (params `shopId`).
9. **Migration Supabase** : appliquer `V6__shop_public_page.sql` via le SQL editor Supabase ; vérifier `SELECT slogan, phone_number, opening_hours, social_links FROM shops LIMIT 1` ne casse pas les requêtes existantes (toutes les nouvelles colonnes sont nullable/default).

## Notes / hors scope

- Pas d'Edge Function OG dynamique (étape 8) — laissé en enhancement futur.
- Pas de modification du système admin/log (règle projet).
- Les horaires détaillées par jour côté vendeur sont simplifiées (horaires génériques) pour rester MVP-friendly ; structure JSON complète quand même stockée pour permettre l'évolution.
