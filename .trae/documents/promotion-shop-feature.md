# Plan — Système de promotion de boutique pour vendeurs

## Contexte

Les vendeurs Boutikplus n'ont actuellement qu'un partage basique (URL statique sans tracking, Alert.alert au lieu d'un vrai partage) et des promotions texte simples sans code de réduction ni analytique. L'objectif est de fournir une suite complète : liens de partage traçables, codes de réduction, offres spéciales, partage social réel, et tableau de bord de performance — le tout accessible depuis un hub centralisé intuitif.

## Architecture

Suit le pattern dual-mode existant (Demo + Supabase) de `deliveryService.ts` et `dataService.ts`. Aucune dépendance native nouvelle en V1 (QR code via API image, partage social via `Linking.openURL`).

---

## 1. Types — `src/types/models.ts`

Étendre `Promotion` avec champs optionnels rétro-compatibles + 4 nouvelles interfaces :

- `PromotionType = 'announcement' | 'special_offer' | 'discount_code'` — ajouté à `Promotion` en champ optionnel
- `ShareLink` — id, shop_id, owner_id, slug, label, source, medium, campaign, target_url, is_active, created_at + agrégats (views_count, clicks_count, conversions_count, revenue_total)
- `DiscountCode` — id, shop_id, code, discount_type (percentage/fixed), discount_value, min_order_amount, max_uses, uses_count, expires_at, status
- `CampaignEvent` — id, shop_id, share_link_id, promotion_id, discount_code_id, event_type (view/click/conversion), buyer_id, amount, order_id, city, source, medium, created_at
- `CampaignAnalyticsSummary` — total_views, total_clicks, total_conversions, conversion_rate, click_through_rate, total_revenue, by_medium[], timeseries[]
- `CampaignComparison` — id, label, type, views, clicks, conversions, conversion_rate, revenue
- `DiscountValidationResult` — valid, discount_amount, new_total, error, discount_code

## 2. Base de données — `src/types/database.ts` + `supabase/schema.sql`

3 nouvelles tables (toutes avec `Relationships: []`) :
- `share_links` — slug UNIQUE, source/medium CHECK, target_url, is_active
- `discount_codes` — UNIQUE(shop_id, code), discount_type/value CHECK, max_uses, uses_count, expires_at
- `campaign_events` — event_type CHECK, FK vers share_links/promotions/discount_codes

Étendre `promotions` avec colonnes optionnelles : promotion_type, discount_code_id, share_link_id, image_url, original_price, discounted_price.

Index sur shop_id, slug, code, event_type, created_at. RLS policies : owner CRUD sur ses données, INSERT public pour campaign_events view/click (tracking anonyme web).

## 3. Service — `src/lib/promotionService.ts` (nouveau)

Imite `deliveryService.ts` : `useDemo`, `delay()`, caches mémoire mutables `let demoShareLinks/demoDiscountCodes/demoCampaignEvents`.

**Helpers purs :** `buildShareUrl(slug)`, `generateSlug(shopName)`, `generateCode(prefix)`

**Share links CRUD :** `getShareLinks(shopId)`, `getShareLinkBySlug(slug)`, `createShareLink(params)`, `updateShareLink(id, params)`, `deleteShareLink(id)`

**Tracking :** `trackShareEvent(params)` — fire-and-forget, pousse dans campaign_events + met à jour les compteurs agrégés

**Analytics :** `getShareLinkAnalytics(linkId, period)`, `getShopAnalytics(shopId, period)`, `getCampaignComparison(shopId)`

**Discount codes CRUD :** `getDiscountCodes(shopId)`, `createDiscountCode(params)`, `updateDiscountCode(id, params)`, `deleteDiscountCode(id)`

**Validation :** `validateDiscountCode({code, shopId, cartTotal, buyerId})` → `DiscountValidationResult`, `redeemDiscountCode({code, shopId, orderId, buyerId, amount})`

**Promotions étendues :** `getShopPromotions(shopId, filters)`, `updatePromotion(id, params)`, `deletePromotion(id)`, `pausePromotion(id)`, `reactivatePromotion(id)`

## 4. Composants UI — `src/components/promotion/` (nouveau dossier)

- `ShareLinkCard.tsx` — Card avec icône medium, label, badge statut, 3 mini-stats (vues/clics/conversions), bouton copier
- `DiscountCodeCard.tsx` — Card avec code en grand, badge type, barre de progression uses/max, date expiration
- `QRCodeView.tsx` — Image expo-image via `api.qrserver.com` (V1, pas de dépendance native)
- `AnalyticsChart.tsx` — Graphique à barres groupées (vues/clics/conversions) réutilisant le pattern chart de SellerStatsScreen
- `PromotionTypePicker.tsx` — 3 boutons icônes (annonce/offre/code)
- `index.ts` — barrel exports

## 5. Écrans

### Nouveaux écrans

1. **`src/screens/seller/PromotionHubScreen.tsx`** — Hub centralisé avec 4 cartes d'action (Liens partagés, Codes promo, Annonces & offres, Statistiques) + aperçu rapide KPI 7j + recommandations
2. **`src/screens/growth/ShareLinkManagementScreen.tsx`** — Liste ShareLinkCard + total agrégé + modal création (label, medium, campaign) → ouvre ShareableShopScreen après création
3. **`src/screens/seller/DiscountCodeManagementScreen.tsx`** — Liste DiscountCodeCard + modal création (code auto-générable, type, valeur, min, max, durée)
4. **`src/screens/growth/CampaignAnalyticsScreen.tsx`** — Sélecteur période + 4 KPI cards + AnalyticsChart + breakdown par canal + comparaison campagnes + top liens

### Écrans modifiés

5. **`src/screens/growth/ShareableShopScreen.tsx`** — Vrai partage via `Linking.openURL` (wa.me, facebook sharer), clipboard via expo-clipboard, section QR code, création auto d'un lien traçable, tracking des clics, mini-récap des vues
6. **`src/screens/seller/PromotionsScreen.tsx`** — PromotionTypePicker dans le modal, champs conditionnels (prix original/promo pour special_offer, sélection code pour discount_code), badges contextuels par type, menu actions (pause/supprimer)
7. **`src/screens/seller/SellerDashboardScreen.tsx`** — Quick action "Promotions" → PromotionHub (au lieu de Promotions), bouton share-2 → ShareLinkManagement
8. **`src/screens/cart/CheckoutScreen.tsx`** — Input code promo + validation + affichage réduction dans le récap + redeem à la commande

## 6. Navigation — `src/navigation/AppNavigator.tsx`

4 nouvelles routes dans `AppStackParamList` :
- `ShareLinkManagement: undefined`
- `CampaignAnalytics: { linkId?: string } | undefined`
- `PromotionHub: undefined`
- `DiscountCodeManagement: undefined`

Imports + enregistrement dans les blocs "Croissance" et "Vendeur" du Stack.Navigator.

## 7. Données de démo — `src/data/demoData.ts`

- `DEMO_SHARE_LINKS` — 4 liens réalistes (Faso Fashion WhatsApp/QR, Karité Naturel Facebook, Délices Insta) avec compteurs pré-calculés
- `DEMO_DISCOUNT_CODES` — 3 codes (WAX20 %, KARITE1000 fixe, GATEAU15 %)
- `DEMO_CAMPAIGN_EVENTS` — ~35 événements sur 14 jours (ratio view:click:conversion ≈ 10:4:1) avec villes burkinabè et montants FCFA

## 8. Séquencement

1. **Types + DB + service** — models.ts, database.ts, schema.sql, promotionService.ts, demoData.ts
2. **Composants UI** — 5 composants + barrel
3. **Écrans de gestion** — PromotionHub, ShareLinkManagement, DiscountCodeManagement, CampaignAnalytics + navigation
4. **Partage réel** — réécriture ShareableShopScreen
5. **Promotions étendues + checkout** — PromotionsScreen modifié, CheckoutScreen code promo
6. **Vérification** — ts:check, tests navigateur

## Vérification

1. `npx tsc --noEmit` — 0 erreur de typage
2. Démarrer Metro `npx expo start --web --clear --port 8085`
3. Login démo Vendeur → Dashboard → Quick action "Promotions" → hub s'ouvre
4. Hub → "Liens partagés" → créer un lien → ShareableShopScreen s'ouvre avec vrai partage + QR
5. Hub → "Codes promo" → créer un code WAX20 → visible dans la liste
6. Hub → "Statistiques" → KPIs et graphique affichés avec données démo
7. PromotionsScreen → créer une offre spéciale avec prix barré
8. CheckoutScreen → entrer code promo → réduction appliquée
9. Console : 0 erreur, 0 warning
