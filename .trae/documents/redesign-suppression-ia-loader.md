# Plan — Suppression IA + Redesign « Fil de Faso » + Loader animé

## Contexte

L'utilisateur a identifié 4 besoins :
1. Les solutions IA actuelles ne sont pas adaptées au marché burkinabè → **supprimer « Copilote Vendeur »** (`GlobalSellerAI`).
2. Certaines ne conviennent pas au site → **supprimer « Mots Justes »** (`WritingAI`).
3. Le design actuel n'est pas assez moderne → **redesign** dans une direction « soft coloré premium » MAIS avec une exigence forte : un **langage visuel jamais vu, non reproductible par une IA générique**.
4. Créer une **animation de chargement** pour les pages, style « marque animée » (orbe + wordmark shimmer).

L'AI Suite passe de 5 à 3 modules : Fiche Magique, Atelier Contenu, Boost Promo (conservés).

---

## Partie A — Suppression « Copilote Vendeur » (`GlobalSellerAI`)

### `src/lib/aiSuite.ts`
- Supprimer le bloc commentaire `// 1. 🌐 Copilote Vendeur` (≈ lignes 53-58).
- Supprimer l'interface `SellerDailyInsight` (≈ lignes 60-76).
- Supprimer la fonction `generateSellerDailyInsights()` (≈ lignes 78-194).
- Supprimer l'entrée `GlobalSellerAI` dans `AISuiteMeta` (ligne 770) et dans `AISuiteTaglines` (ligne 779).
- Renuméroter le header (1-12) : « 3 assistants IA », liste renumérotée 1. Fiche Magique / 2. Atelier Contenu / 3. Boost Promo.

### `src/screens/ai/AIGlobalDashboardScreen.tsx`
- Imports : retirer `generateSellerDailyInsights` et `type SellerDailyInsight`. Retirer `ActivityIndicator` (utilisé seulement par le bloc insights).
- Supprimer la constante `PRIORITY_STYLES` (lignes 35-40).
- `MODULE_ROUTES` : retirer la ligne `GlobalSellerAI`.
- Supprimer les states `insights` et `insightsLoading`.
- `loadShopAndInsights` → renommer `loadShop`, supprimer le bloc d'appel à `generateSellerDailyInsights` (lignes 77-91). Mise à jour du `useFocusEffect`.
- `handleModulePress` : supprimer le special-case `GlobalSellerAI` (lignes 106-109).
- Header subtitle `5 assistants` → `3 assistants`. EmptyState message `5 modules` → `3 modules`.
- Dans le `moduleKeys.map` : supprimer `const isFirst` et tout le bloc `{isFirst ? (<View style={styles.insightsWrap}>...</View>) : null}` (lignes 210-260).
- Styles : supprimer tous les styles liés aux insights (`insightsWrap`, `priorityChip`, `metricRow`, `deltaChip`, etc.).

### `src/screens/seller/SellerDashboardScreen.tsx`
⚠️ **Invariant critique** : préserver l'ordre des hooks (bug React #310 déjà fixé) — on supprime des hooks, on n'en ajoute JAMAIS après les early returns.
- Supprimer l'import `generateSellerDailyInsights, SellerDailyInsight` (ligne 19). Supprimer aussi `getCategoryName` (ligne 20) s'il n'est plus utilisé ailleurs (à vérifier).
- Supprimer les states `sellerInsightsLoading`, `sellerInsights` (lignes 35-36).
- Supprimer le callback `loadSellerInsights` (lignes 81-108) et le `useEffect` associé (lignes 116-120).
- Supprimer toute la section JSX `🤖 Recommandations IA du jour` (lignes 305-402) — bannière Copilote + refresh chip + skeleton + cartes insights + switch de navigation (qui contenait le `case 'communication': navigation.navigate('AIWritingAssistant')`).
- Supprimer les constantes `PRIORITY_COLORS` et `PRIORITY_LABELS` (utilisé uniquement par cette section).
- Supprimer les styles associés (`aiSection`, `aiCopilotBanner`, `insightCard`, `insightCta`, etc.).
- Vérifier l'usage restant de `Skeleton` ; si nul, supprimer l'import.

### Grep de confirmation (zéro résultat attendu)
`GlobalSellerAI | Copilote Vendeur | generateSellerDailyInsights | SellerDailyInsight | sellerInsights | PRIORITY_STYLES | PRIORITY_COLORS | PRIORITY_LABELS`

---

## Partie B — Suppression « Mots Justes » (`WritingAI`)

### `src/lib/aiSuite.ts`
- Supprimer les types `WritingTemplateKind`, `WritingTemplate` + la fonction `generateWritingTemplate()` (≈ lignes 405-585, avec son fallback).
- Supprimer l'entrée `WritingAI` dans `AISuiteMeta` (ligne 773) et `AISuiteTaglines` (ligne 782).

### `src/screens/ai/AIGlobalDashboardScreen.tsx`
- `MODULE_ROUTES` : retirer `WritingAI: 'AIWritingAssistant'`.

### `src/navigation/AppNavigator.tsx`
- Supprimer l'import `AIWritingAssistantScreen` (ligne 44).
- Supprimer `AIWritingAssistant` de `AppStackParamList`.
- Supprimer `<Stack.Screen name="AIWritingAssistant" ... />` (ligne 204).

### `src/types/navigation.ts`
- Supprimer `AIWritingAssistant` de `SellerStackParamList` (ligne 38).

### Suppression de fichier
- **Supprimer** `src/screens/ai/AIWritingAssistantScreen.tsx`.

### Deep-linking
- `RootNavigator.tsx` `linking.config.screens` ne référence pas `AIWritingAssistant` → rien à nettoyer (confirmé).

### Grep de confirmation (zéro résultat attendu)
`AIWritingAssistant | WritingAI | generateWritingTemplate | WritingTemplate | Mots Justes`

---

## Partie C — Redesign : langage « Fil de Faso »

### Dépendance à ajouter
`npx expo install expo-linear-gradient` (officiel, gratuit, ~30 Ko, web + Android low-end OK). Pas de `react-native-svg` (trop lourd, rendu prévisible). Pas de blur/glassmorphism (perf Burkina).

### Concept « Fil de Faso »
Inspirations : tissage **Faso Dan Fani**, **wax tamponné**, **karité** (beige chaud), **fil de couture** comme motif d'unité. Signature abstraite, pas de pastiche wax — difficile à reproduire par une IA générique car c'est un **système cohérent**, pas un template.

### 1. Palette — `src/theme/colors.ts` (préserver `__BTIK_BRAND__`)
Ajouts : `primaryDeep: '#C0491E'`, `secondaryDeep: '#5B45A8'`, `surfaceDeep: '#F7E4D2'`, `ink: '#1F1828'`, `stitch: '#FFB089'`, `stitchDeep: '#E66A3A'`. (Primaires/fonds actuels conservés.)

### 2. Nouveaux fichiers thème
- `src/theme/shadows.ts` : presets `fani` (carte standard), `faniHover` (web hover), `stamped` (badge, offset volontaire), `hero` (cartes hero). Shadows teintés corail en couches.
- `src/theme/index.ts` : réexporter `shadows`.

### 3. Motif signature « Fil » — nouveau `src/components/ui/ThreadDivider.tsx`
Row de 7 points carrés décroissants (3→6→3 px) en `borderRadius: pill`, `backgroundColor: stitch`, `opacity` interpolée (effet respiration). Variantes `horizontal` (dividers) et `vertical` (focus rings). Utilisé partout : séparateurs, bullets, focus inputs, footer de cartes.

### 4. Badge tamponné — nouveau `src/components/ui/StampBadge.tsx`
`View` rotate -1.5°, `backgroundColor: primaryDeep`, shadow `stamped` (offset 1px). Double impression intérieure décalée (opacity 0.85) → effet tampon encre réel. Texte uppercase, `letterSpacing: ultra`, extrabold. Remplace `Badge` pour tags premium/ratios.

### 5. Cartes « Fani » — rayons asymétriques + shadows
Pattern : `borderTopLeftRadius: 22`, autres à 14 → effet « coin pincé » (pli de tissu). Supprimer `borderWidth: 1`, utiliser `shadows.fani`. Appliquer à `Card.tsx`, `ProductCard.tsx`, `ShopCard.tsx`.

### 6. Typographie — `src/theme/typography.ts`
Ajouter `sizes.display: 48`, `sizes.ultra: 60` (hero numbers). Ajouter `letterSpacings: { tight: -0.6, normal: 0, wide: 0.4, ultra: 1.2 }`. Hero numbers : `display` + extrabold + `tight` + `color: ink` (StatCards, AI hero).

### 7. Composants à moderniser (pattern appliqué)
- `src/components/ui/Card.tsx`, `Badge.tsx`, `EmptyState.tsx`, `Button.tsx`, `Input.tsx` (focus ring = ThreadDivider vertical).
- `src/components/product/ProductCard.tsx` : coin pincé, shadow fani, prix en `primaryDeep` extrabold.
- `src/components/shop/ShopCard.tsx` : logo cerclé d'un « fil » (2 borders superposés stitch + primaryDeep).
- `src/screens/ai/AIGlobalDashboardScreen.tsx` : hero card en `shadows.hero` + `LinearGradient` corail→crème en arrière-plan du hero uniquement.
- `src/screens/home/HomeScreen.tsx` : header `letterSpacing: tight`, cat pills actifs en StampBadge.
- `src/screens/seller/SellerDashboardScreen.tsx` : StatCards en `display` size.

### 8. `app.json`
`splash.backgroundColor: "#FFF8F2"`, `web.themeColor: "#FF8A5C"` (au lieu de `#FF6B00`).

### Optionnel (différé si fichiers manquants)
Chargement réel de Poppins via `expo-font` + `useAppFonts` hook. Si les `.ttf` ne sont pas disponibles, on garde le fallback système (non bloquant).

---

## Partie D — Loader animé « Marque animée »

### Nouveaux fichiers
- `src/components/ui/BrandLoader.tsx`
- `src/components/ui/PageLoader.tsx`

### `BrandLoader` — props `size?: 'sm'|'md'|'lg'`, `label?: boolean`, `fullPage?: boolean`
Structure (centrée, verticale) :
1. **Orbe respirant** : `LinearGradient` `['#FFB089','#FF8A5C','#E66A3A']` dans un `View` cercle (overflow hidden). Anim `scale` 1→1.08→1 et `opacity` 0.92→1→0.92 sur 1.4s, `Easing.bezier(0.45,0,0.55,1)`.
2. **3 points fil** : row de 3 `View` ronds. Chacun `Animated.Value` indépendante, `opacity` 0.2→1→0.2 + `scale` 0.6→1→0.6, décalées de 220 ms. Durée 1.1s, `Easing.bezier(0.22,1,0.36,1)`.
3. **Wordmark « Boutikplus »** : `Text` extrabold, `letterSpacing: tight`, `color: ink`. Overlay `Animated.View` translaté en `translateX` -100%→+100% sur 1.6s avec dégradé `['transparent','rgba(255,255,255,0.7)','transparent']` (shimmer sweep).
4. **Fil dessiné** : `View` `height: 2`, `scaleX` 0→1 (transformOrigin left) sur 1.2s, `backgroundColor: stitch`. Effet « tracé de couture » sous le mot.

Cycle total ~2.4s, `useNativeDriver: true` partout (transform/opacity uniquement). Boucles `Animated.loop(Animated.sequence([...]))` démarrées ensemble au mount.

### `PageLoader`
Wrapper : `{ flex: 1, backgroundColor: colors.background, alignItems: center, justifyContent: center }` + `<BrandLoader size label />`.

### Branchements (remplacer `<LoadingSpinner />` au boot des écrans)
Pattern : `<LoadingSpinner />` → `<PageLoader />` sur l'écran de boot. À appliquer sur :
- `RootNavigator.tsx` (boot auth, `size="lg"`)
- `ProductDetailScreen.tsx`, `SellerDashboardScreen.tsx`, `AIGlobalDashboardScreen.tsx`, `SellerOrdersScreen.tsx`, `ProductManagementScreen.tsx`, `SellerStatsScreen.tsx`, `OrdersScreen.tsx` (profile), `ShopDetailScreen.tsx`, `AdminDashboardScreen.tsx`, `NotificationCenterScreen.tsx`.

**Ne pas remplacer** : `HomeScreen` (skeleton riche existant), listes longues (préférence skeleton), spinners inline de boutons (conserver `LoadingSpinner.tsx`).

---

## Partie E — Vérification

1. **Type-check** : `npm run ts:check` (0 erreur). Vigilance : `AISuiteMeta` à 3 clés propage aux `Record<keyof typeof AISuiteMeta, ...>` ; `AppStackParamList`/`SellerStackParamList` sans `AIWritingAssistant` ; import `expo-linear-gradient` résout.
2. **Preview web** : serveur Expo déjà lancé sur `localhost:8081`. Routes à vérifier : `/`, `/search`, `/p/:id` (PageLoader), login vendeur → `SellerDashboard` (aucune section insights, StatCards modernisées), `AIGlobalDashboard` (header « 3 assistants », 3 cartes, aucune insight inline), `AIProductAssistant`/`SmartContent`/`AILightningPush` (fonctionnels, restylés), boot logout/login (`PageLoader size="lg"`).
3. **Grep non-régression** (zéro résultat) : `AIWritingAssistant|WritingAI|generateWritingTemplate|WritingTemplate|Mots Justes|sellerInsights|SellerDailyInsight|generateSellerDailyInsights|GlobalSellerAI|Copilote Vendeur|PRIORITY_STYLES|PRIORITY_COLORS|PRIORITY_LABELS|5 assistants|5 modules`.
4. **Tests Jest** : `npm test` (aucun test ne référence les symboles supprimés).

## Risques & mitigations
| Risque | Mitigation |
|---|---|
| React Error #310 dans SellerDashboard | Invariant préservé : on supprime des hooks, on n'en ajoute pas après early returns. |
| Web compat `expo-linear-gradient` | Compatible RN Web 0.19+ (rendu CSS `linear-gradient`). |
| Perf Android low-end | `useNativeDriver: true` partout, pas de blur/SVG, LinearGradient = simple View peinte. |
| `getCategoryName` devenu inutilisé | Supprimer l'import si plus aucun usage. |
| Header « 5 → 3 » oublié | Grep `"5 assistants"` et `"5 modules"` doit renvoyer 0. |

## Ordre d'exécution recommandé
1. Partie A + B (suppressions) → `ts:check` → grep de confirmation.
2. `npx expo install expo-linear-gradient`.
3. Partie C (thème + nouveaux composants UI) → appliquer aux composants partagés.
4. Partie D (BrandLoader + PageLoader) → branchements.
5. Partie C suite : moderniser les écrans principaux (Home, Search, SellerDashboard, AIGlobalDashboard).
6. Vérification complète (E) + preview web.
