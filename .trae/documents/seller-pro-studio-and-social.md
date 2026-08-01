# Plan : Studio Photo/Vidéo, Partage TikTok/Snapchat & Centre d'Aide

## Contexte

Boutikplus aide les vendeurs informels burkinabè à transformer leurs stratégies de vente WhatsApp/TikTok/Snapchat en un catalogue structuré type Shopify/Jumia, gratuit et léger. L'audit du codebase révèle que la gestion catalogue, le suivi des ventes et le paiement existent déjà, mais **trois lacunes critiques** freinent les vendeurs :

1. **Pas de capture/édition photo professionnelle** — `AddEditProductScreen` n'utilise que la galerie (`pickAndCompressImage(false)`), aucun crop/rotation, pas de caméra directe. `expo-image-manipulator` est installé mais sous-exploité (compression seule).
2. **Aucun support vidéo** — or l'utilisateur a confirmé que "leur commerce repose sur ces vidéos et photos comme sur Shopify". Décision : support combiné (lien externe TikTok/YouTube/Snapchat + upload natif avec `expo-video`).
3. **Canaux TikTok/Snapchat absents** du partage social (seulement WhatsApp/FB/Instagram).
4. **Aucune aide/support** pour les vendeurs débutants.

L'objectif : livrer un studio photo/vidéo intégré, étendre le partage aux canaux où les vendeurs sont déjà actifs, et fournir un centre d'aide accessible — tout en restant léger pour appareils low-end.

## Approche

Quatre workstreams indépendants, socle commun (types/DB/navigation) mutualisé. On respecte les patterns existants : dual-mode demo/supabase (`useDemo = !isSupabaseConfigured`), thème `@/theme`, icônes Feather, `Relationships: []` obligatoire sur chaque table Supabase. **Une seule nouvelle dépendance** : `expo-video` (lecteur natif + web HTML5, ~50KB bundle).

## Workstream A — Studio Photo (capture + édition)

### Nouveaux fichiers
- **`src/lib/photoStudio.ts`** — helpers de manipulation réutilisant `expo-image-manipulator` :
  - `pickForEdit(useCamera, aspect)` : lance `ImagePicker.launchCameraAsync`/`launchImageLibraryAsync` avec `allowsEditing: true` + `aspect` (crop natif 1:1, 4:3, 16:9).
  - `applyEdits(uri, opts)` : applique rotate/flip/resize/quality via `manipulateAsync`. HD = 1600px/JPEG 0.92, standard = 800px/JPEG 0.7 (réutilise `compressImage` de `storage.ts`).
  - Types : `AspectRatio = '1:1'|'4:3'|'16:9'|'free'`, `EditOptions = { aspect, rotate: 0|90|180|270, flipH, flipV, hd }`.
- **`src/screens/seller/PhotoStudioScreen.tsx`** — écran modal :
  - Params : `initialUri?`, `aspect?`, `editIndex?`, `returnTo`.
  - Flow : si pas d'`initialUri` → choix Caméra/Galerie (via `Alert.alert` natif) → crop natif → écran d'édition (preview grand + barre rotate-cw/rotate-ccw/flip/HD/ratio) → "Terminer" → `applyEdits` → retour URI via `navigation.navigate(returnTo, { editedImageUri, editIndex })`.

### Modifications
- **`src/screens/seller/AddEditProductScreen.tsx`** :
  - `handleAddImage` → `navigation.navigate('PhotoStudio', { returnTo: 'AddEditProduct', aspect: '1:1' })` au lieu de `pickAndCompressImage(false)`.
  - `useEffect` écoute `route.params?.editedImageUri` : ajoute à `images` (ou remplace à `editIndex` si fourni), puis nettoie le param.
  - Longue-pression sur une image → rouvre `PhotoStudio` avec `initialUri` + `editIndex`.
  - Section "Vidéo" (voir Workstream B).
- **`app.json`** : ajouter `cameraPermission` au plugin `expo-image-picker`.

## Workstream B — Vidéo (lien externe + upload natif)

### Décision data model : nouvelle table `product_videos`
Séparation propre (ne pollue pas `product_images`), permet N vidéos, respecte `Relationships: []`.

### Nouveaux fichiers
- **`src/lib/videoService.ts`** — service dual-mode :
  - `addProductVideo`, `deleteProductVideo`, `getProductVideos` (pattern `demoShareLinks` du `promotionService.ts`).
  - `pickVideoForUpload()` : `ImagePicker.launchImageLibraryAsync({ mediaTypes: Videos, videoMaxDuration: 30, videoQuality: 2 })`.
  - `uploadVideo(uri, prefix)` : upload vers bucket `product-videos` (réutilise pattern `uploadImage` de `storage.ts`).
  - `detectExternalSource(url)` : regex tiktok.com/youtu.be/snapchat.com → `'tiktok'|'youtube'|'snapchat'|'other'`.
  - `validateVideoAsset(asset)` : taille ≤ 25MB, durée ≤ 30s (utilise `asset.fileSize`/`asset.duration`).
  - Constantes : `MAX_VIDEO_DURATION_SEC = 30`, `MAX_VIDEO_SIZE_MB = 25`.
- **`src/lib/videoPlayer.tsx`** — wrapper `<AppVideoPlayer source poster style>` via `expo-video` (`useVideoPlayer` + `VideoView`), `autoPlay: false` (économise batterie low-end).
- **`src/components/product/ProductVideoCard.tsx`** : upload → `<AppVideoPlayer>` ; external → vignette + badge source + bouton "Ouvrir" (`Linking.openURL`).
- **`src/components/product/MediaCarousel.tsx`** — carrousel unifié images+vidéos triés par `position`, remplace `ImageCarousel` dans `ProductDetailScreen`. Dots indicateurs conservés.
- **`src/screens/seller/ProductVideoPickerScreen.tsx`** (modal) : champ URL (coller via `expo-clipboard`) + détection auto source + bouton upload natif. MVP : 1 vidéo/produit.

### Modifications
- **`src/types/models.ts`** : ajouter `ProductVideo` interface + `videos?: ProductVideo[]` sur `ProductWithImages`.
- **`src/types/database.ts`** : table `product_videos` avec `Relationships: []` + enums `product_video_type`, `external_video_source`.
- **`src/lib/dataService.ts`** : `getProduct`/`getProducts`/`getProductsByShop` → ajouter `videos:product_videos(*)` au select. `createProduct` → accepter `videoInput?`. `deleteProduct` → supprimer vidéos d'abord.
- **`src/screens/home/ProductDetailScreen.tsx`** : remplacer `<ImageCarousel images={images} />` (ligne 83) par `<MediaCarousel media={...} />`.
- **`src/components/product/ProductCard.tsx`** : badge "Vidéo" si `product.videos?.length`.
- **`src/screens/seller/AddEditProductScreen.tsx`** : section vidéo (URL externe en création ; upload natif en édition après enregistrement produit).
- **`src/data/demoData.ts`** : étendre `makeProduct` avec `_videos?`, ajouter 1 vidéo externe TikTok sur un produit démo.
- **`supabase/schema.sql`** : table `product_videos` + RLS (owner_all via join shops, public_read) + bucket `product-videos`.

## Workstream C — Partage TikTok + Snapchat

### Modifications de types (3 fichiers)
- **`src/types/models.ts`** + **`src/types/database.ts`** : `ShareLinkSource` += `'tiktok' | 'snapchat'` (4 occurrences : share_links Row/Insert, campaign_events Row/Insert + enum `share_link_source`).
- **`supabase/schema.sql`** : `ALTER TYPE share_link_source ADD VALUE IF NOT EXISTS 'tiktok';` (+ snapchat). Hors transaction.

### UI de partage
- **`src/screens/growth/ShareableShopScreen.tsx`** : ajouter `handleShareTikTok` et `handleShareSnapchat` sur le pattern Instagram (copier lien + `openShareUrl` avec deep link `snssdk1233://`/`snapchat://`, fallback web). 2 boutons `ShareOption` supplémentaires (icônes Feather `video` pour TikTok noir, `camera` pour Snapchat jaune).
- **`src/data/demoData.ts`** : 1-2 share links démo `source: 'tiktok'`/`'snapchat'`.

`promotionService.ts` (`buildShareUrl`, `createShareLink`) propage déjà les sources sans validation stricte — fonctionne tel quel.

## Workstream D — Centre d'Aide

### Nouveaux fichiers
- **`src/constants/helpContent.ts`** — données statiques : `HELP_FAQ_SECTIONS` (5 sections : Démarrage, Produits, Paiements, Livraison, Promotion), `HELP_TUTORIALS` (4-6 tutos : créer boutique, 1er produit, recevoir paiement, partager), `SUPPORT_WHATSAPP_URL`.
- **`src/screens/help/HelpCenterScreen.tsx`** — recherche locale + accordéon FAQ + cartes tutoriels + bouton support WhatsApp (`Linking.openURL`).
- **`src/screens/help/HelpTutorialScreen.tsx`** — timeline verticale des étapes (réutiliser le pattern visuel de `DeliveryTimeline.tsx`).
- **`src/components/help/FaqAccordion.tsx`** — accordéon réutilisable (toggle simple, `Animated` natif).

### Modifications
- **`src/navigation/AppNavigator.tsx`** : routes `HelpCenter`, `HelpTutorial`.
- **`src/screens/profile/SettingsScreen.tsx`** : étendre `SettingRow` avec `onPress?` + câbler "Aide & support" (ligne 35) vers `HelpCenter`. Étendre le type `navigation` à `navigate`.
- **`src/screens/profile/ProfileScreen.tsx`** : ajouter `{ icon: 'help-circle', label: 'Aide & support', screen: 'HelpCenter', color: colors.success }` dans `menuItems` (ligne 15).

## Navigation consolidée (`AppNavigator.tsx`)
Ajouter à `AppStackParamList` + enregistrer 4 `<Stack.Screen>` :
```ts
PhotoStudio: { initialUri?: string; aspect?: AspectRatio; editIndex?: number; returnTo?: 'AddEditProduct' | 'CreateShop' };
ProductVideoPicker: { productId?: string; returnTo?: 'AddEditProduct' };
HelpCenter: undefined;
HelpTutorial: { tutorialId: string };
```

## Ordre d'implémentation
1. **Socle** : `npx expo install expo-video` + `app.json` (permissions caméra).
2. **Workstream C** (TikTok/Snapchat) — indépendant, valeur immédiate, peu risqué.
3. **Workstream D** (Centre d'aide) — indépendant, aucun backend, livrable en parallèle.
4. **Workstream A** (Photo Studio) — `photoStudio.ts` → `PhotoStudioScreen` → câblage `AddEditProductScreen`.
5. **Workstream B** (Vidéo) — DB/types → `videoService` → `videoPlayer` → composants → câblage. Le plus long (dépend de types+DB+dataService).

## Risques & mitigations
- **Vidéo lourde sur low-end** : limites strictes 30s/25MB, `videoQuality: 2` (medium), `autoPlay: false`, 1 vidéo/produit MVP. UI met le lien externe en avant (les vendeurs ont déjà leurs vidéos TikTok).
- **Web** : caméra masquée sur web (Picker non supporté) → seulement galerie + coller URL. `expo-video` supporte web (HTML5). Deep links `snapchat://` échouent sur web → fallback copie géré par `openShareUrl` existant.
- **Migration ENUM Postgres** : `ALTER TYPE ... ADD VALUE` hors transaction.
- **iOS caméra** : `NSCameraUsageDescription` requis (via `cameraPermission` dans `app.json`) sinon crash.
- **Icônes Feather** : pas d'icône TikTok/Snapchat/flip → `video`/`camera` colorés + `rotate-cw`/`rotate-ccw`/`corner-up-left`/`corner-up-right` pour flip.
- **`Relationships: []`** : obligatoire sur `product_videos` (sinon Schema=never, voir leçon apprise).

## Vérification
- **Photo Studio** : `AddEditProduct` → "Ajouter" → choix caméra/galerie → crop natif → édition rotate/flip/HD → image dans la grille. Longue-pression → réédition. Web : caméra masquée.
- **Vidéo** : coller URL TikTok → badge source → enregistrer → `ProductDetail` affiche la vidéo. Upload >30s/25MB → erreur claire. Mode démo : vidéo visible sans Supabase.
- **TikTok/Snapchat** : 6 boutons de partage. Clic TikTok → ouvre app ou copie. `CampaignAnalytics` montre les clics TikTok/Snapchat. `tsc --noEmit` sans erreur sur les nouveaux union members.
- **Centre d'aide** : depuis Profile + Settings → `HelpCenter`. Accordéon FAQ, recherche, tutoriel timeline, bouton WhatsApp. Fonctionne offline (statique).
- **TypeScript** : `npx tsc --noEmit` — 0 nouvelle erreur liée à ces workstreams (les erreurs préexistantes codebase-wide restent hors périmètre).
