# Fonctionnalité : Commande de livreurs intra-plateforme

## Contexte

Les vendeurs de Boutikplus utilisent aujourd'hui des livreurs externes (informels) pour livrer leurs commandes, sans traçabilité ni paiement sécurisé. La présente fonctionnalité permet à un vendeur inscrit de **commander un livreur lui aussi inscrit sur la plateforme**, avec recherche temps réel, processus de commande structuré, acceptation par le livreur, suivi de statut, paiement Mobile Money sécurisé, et remboursement.

L'objectif est double : (1) résoudre un problème concret des jeunes entrepreneurs burkinabè (logistique fiable et traçable) ; (2) rester 100 % compatible avec l'existant (commandes, base utilisateurs, notifications, paiement Mobile Money).

### Décisions clés (validées par lecture du code)

1. **Table `delivery_payments` séparée** — La table `payments` existante a `order_id UUID NOT NULL UNIQUE` (`supabase/schema.sql:140`). La réutiliser casserait le flux `uploadPaymentProof`/`getSellerOrders`. On crée donc une table `delivery_payments` miroir mais liée à `delivery_id`.
2. **Pas d'extension de `UserRole`** — `user_role` est un ENUM PostgreSQL avec un trigger (`schema.sql:13,275`). Un vendeur doit pouvoir être aussi livreur (cas fréquent au Burkina). On ajoute donc une table `driver_profiles` (1:1 avec `profiles.user_id`). Tout utilisateur (buyer/seller) peut créer un profil livreur.
3. **Temps réel = polling + notifications** — L'app n'utilise aucune subscription Supabase Realtime côté React Native aujourd'hui ; tout est `refresh()` + pull-to-refresh. On garde ce pattern, avec une subscription realtime optionnelle (gardée par `!useDemo`) uniquement sur l'écran de suivi.
4. **Statuts** : `pending → accepted → in_progress → delivered | cancelled | refunded` (6 états, conforme à l'énoncé « en attente, en cours, livré, annulé » + refunded pour le remboursement).

---

## Architecture (par phase)

### Phase A — Fondations (types, constantes, schéma)

**`src/types/models.ts`** (ajouter à la fin, ne PAS modifier `UserRole`) :
- `DeliveryStatus = 'pending' | 'accepted' | 'in_progress' | 'delivered' | 'cancelled' | 'refunded'`
- `VehicleType = 'moto' | 'velo' | 'voiture' | 'tricycle' | 'camion'`
- `DriverProfile` { id, user_id, vehicle_type, city, is_available, rating, total_deliveries, base_rate, per_km_rate, max_weight, orange_money_number, moov_money_number, current_lat, current_lng, license_number, created_at }
- `DeliveryRequest` { id, seller_id, driver_id (nullable), pickup_address, pickup_city, destination_address, destination_city, package_weight, package_length, package_width, package_height, preferred_date, preferred_time, description, price, distance_km, status, cancellation_reason, created_at, updated_at, accepted_at, delivered_at, driver?, seller? }
- `DeliveryPayment` (miroir de `Payment` mais avec `delivery_id` au lieu de `order_id`)
- `DeliveryReview` { id, delivery_id, reviewer_id, rating, comment, created_at }

**`supabase/schema.sql`** (ajouter après la table `notifications`) : 2 enums (`delivery_status`, `vehicle_type`), 4 tables (`driver_profiles`, `delivery_requests`, `delivery_payments`, `delivery_reviews`) avec conventions existantes (UUID PK, INT pour FCFA, `CHECK >= 0`, `ON DELETE CASCADE`, trigger `updated_at`). Index sur `seller_id`, `driver_id`, `status`. `ALTER PUBLICATION supabase_realtime ADD TABLE delivery_requests, delivery_payments`.

**`supabase/policies.sql`** + **`supabase/storage.sql`** : RLS pour les 4 tables + bucket `delivery-proofs`.

**`src/lib/storage.ts:6`** : étendre l'union `StorageBucket` avec `'delivery-proofs'`.

**`src/constants/delivery.ts`** (nouveau) : `VEHICLE_TYPES` (Record comme `PAYMENT_OPERATORS`), `VEHICLE_LIST`, `PACKAGE_SIZE_BUCKETS`, `DELIVERY_FILTERS`.

**`src/lib/deliveryStatus.ts`** (nouveau, clone de `src/lib/orderStatus.ts`) : `DELIVERY_STATUS` Record avec `{label, shortLabel, color, bgColor, step}`, `getDeliveryStatusInfo()`, `DELIVERY_TIMELINE = ['pending','accepted','in_progress','delivered']`, helpers `canCancelDelivery`, `canRefundDelivery`, `isValidTransition`.

### Phase B — Couche données

**`src/data/demoData.ts`** (ajouter) : `DEMO_DRIVER_PROFILES` (5 livreurs dont un `user_id: 'demo-seller'`), `DEMO_DELIVERY_REQUESTS` (4 entrées couvrant tous les statuts), `DEMO_DELIVERY_PAYMENTS`, `DEMO_DRIVER_REVIEWS`.

**`src/lib/deliveryService.ts`** (nouveau, clone du pattern `dataService.ts:34-36` : `useDemo`/`delay`/DEMO + Supabase) :
- `calculateDeliveryFee({vehicleType, distanceKm, weightKg, baseRate, perKmRate})` → **pure** (testable) : `base + perKm*distance + surcharge_poids`, arrondi au 50 FCFA supérieur.
- `getAvailableDrivers(filters)` — filtres ville/véhicule/note min/tarif max/disponibilité (pattern `getShops`).
- `getDriverProfile(userId)`, `createDriverProfile`, `updateDriverAvailability`.
- `getSellerDeliveries`, `getDriverDeliveries`, `getDelivery`.
- `createDeliveryRequest(params)` — valide poids>0, dims>0, date non passée, poids ≤ driver.max_weight ; déclenche `notifyNewDeliveryRequest`.
- `acceptDelivery(deliveryId, driverId)` — verrou optimiste `.eq('status','pending')` (anti double-acceptation) ; déclenche `notifyDeliveryAccepted`.
- `updateDeliveryStatus(deliveryId, status, role)` — utilise `isValidTransition` ; driver : accepted→in_progress→delivered ; seller : annulation.
- `cancelDelivery`, `requestRefund` (statut → 'refunded', payment → 'rejected').
- `uploadDeliveryPaymentProof`, `validateDeliveryPayment`, `rejectDeliveryPayment` (miroir de `uploadPaymentProof`/`validatePayment`/`rejectPayment` mais table `delivery_payments`).
- `getDeliveryReviews`, `addDeliveryReview`.

**`src/lib/notifications.ts`** (étendre) : ajouter à `NotificationType` : `DELIVERY_REQUEST_NEW`, `DELIVERY_ACCEPTED`, `DELIVERY_IN_PROGRESS`, `DELIVERED`, `DELIVERY_CANCELLED`, `DELIVERY_PAYMENT_VALIDATED`, `DELIVERY_REFUNDED` + 7 fonctions `notifyDelivery*` (pattern `notifyNewOrder`).

**`src/context/NotificationContext.tsx`** : ajouter les 7 types aux maps `getNotificationIcon` (lignes 127-138) et `getNotificationColor` (lignes 142-153) ; ajouter `unreadDeliveries`.

**`src/context/AuthContext.tsx`** : exporter `DEMO_DRIVER_PROFILE` (user_id `demo-seller`). **Aucun** changement à `UserRole`/`DEMO_PROFILES`/`switchToDemo`.

### Phase C — Composants UI (`src/components/delivery/`)

- `DeliveryStatusBadge.tsx` — clone de `OrderStatusBadge.tsx`.
- `DriverCard.tsx` — avatar/initiale, nom, véhicule, ville, `Rating`, nb livraisons, tarif `formatFCFA`, `Badge` dispo.
- `DeliveryTimeline.tsx` — stepper horizontal 4 points (pattern `ORDER_TIMELINE`).
- `PackageSizePicker.tsx` — 3 chips Petit/Moyen/Grand.
- `DriverFilters.tsx` — panneau repliable (clone `SearchScreen` filtres).
- `DeliveryFeeEstimate.tsx` — Card appelant `calculateDeliveryFee` (pure), affiche détail + total.

### Phase D — Écrans (`src/screens/delivery/`)

Tous suivent la structure existante : `SafeAreaView edges={['top']}` + header (back + titre + spacer) + `ScrollView`/`FlatList` + barre bouton bas. Props typées en lâche `{ navigation: { navigate, goBack }, route? }` (pattern `SellerDashboardScreen:15-17`).

- `DeliverySearchScreen.tsx` — recherche debounce 300ms (clone `SearchScreen:42-45`) + `DriverFilters` + `FlatList` de `DriverCard`. Tap → `CreateDeliveryScreen`.
- `CreateDeliveryScreen.tsx` — formulaire multi-étapes (clone `PaymentScreen:107-164`) : (1) enlèvement, (2) destination, (3) colis (`PackageSizePicker` + inputs numériques), (4) créneau, (5) tarif (`DeliveryFeeEstimate`). Validation complète. Submit → `createDeliveryRequest` → `navigate('DeliveryPayment')`.
- `DeliveryPaymentScreen.tsx` — clone de `PaymentScreen.tsx`, réutilise `MobileMoneyInfo` + `PaymentProofUpload` (inchangés), paie au numéro MM du **livreur**. Appelle `uploadDeliveryPaymentProof`. → `DeliveryTrackingScreen`.
- `DeliveryTrackingScreen.tsx` — `DeliveryTimeline` + adresses + `DriverCard` compact + `DeliveryStatusBadge` + prix. Pull-to-refresh + subscription realtime (gardée `!useDemo`). Boutons par rôle (clone `SellerOrdersScreen:154-167` + `Alert.alert` lignes 47-56) : driver « Accepter/Confirmer enlèvement/Marquer livrée » ; seller « Annuler/Demander remboursement ».
- `SellerDeliveriesScreen.tsx` — liste (clone `SellerOrdersScreen`: header + chips filtre + FlatList).
- `DriverDashboardScreen.tsx` — stats (clone `StatCard`), toggle dispo, livraisons en attente dans la ville + actives. `EmptyState` + CTA « Devenir livreur » si pas de profil.
- `DriverRegistrationScreen.tsx` — formulaire (clone `CreateShopScreen`) : véhicule, ville, tarifs, poids max, numéros MM, permis.

### Phase E — Câblage

**`src/navigation/AppNavigator.tsx`** : ajouter à `AppStackParamList` (lignes 40-72) : `DeliverySearch`, `CreateDelivery: { driverId?: string }`, `DeliveryPayment: { deliveryId: string }`, `DeliveryTracking: { deliveryId: string }`, `SellerDeliveries`, `DriverDashboard`, `DriverRegistration`. Ajouter imports + 7 `<Stack.Screen>` dans une section `{/* Livraisons */}` après ligne 149.

**`src/screens/seller/SellerDashboardScreen.tsx`** : ajouter `QuickAction` (lignes 107-113) icon `'truck'`, label `'Commander\nlivraison'`, color `colors.info`, `onPress → navigate('DeliverySearch')`.

**`src/screens/profile/ProfileScreen.tsx`** : ajouter carte parallèle au bloc vendeur (lignes 48-69) : si `getDriverProfile(profile.id)` existe → « Espace livreur » → `DriverDashboard` ; sinon → « Devenir livreur » → `DriverRegistration`.

### Phase F — Tests

**`package.json`** : devDeps `jest`, `jest-expo`, `@testing-library/react-native`, `@types/jest` ; script `"test": "jest"`.

**`jest.config.js`** (nouveau) : `preset: 'jest-expo'`.

Tests (dossiers `__tests__/`) :
- `src/lib/__tests__/deliveryService.test.ts` — `calculateDeliveryFee` (distance 0, surcharge poids, arrondi 50, négatifs), `isValidTransition`, `canCancelDelivery`, `canRefundDelivery`, double-acceptation (mock), validation `createDeliveryRequest` (champs manquants, date passée, poids > max), transitions par rôle illégales, `requestRefund` sans paiement validé.
- `src/lib/__tests__/deliveryStatus.test.ts` — métadonnées par statut, fallback, timeline ordre, cancelled/refunded step -1.
- `src/components/delivery/__tests__/DeliveryStatusBadge.test.tsx` — libellé + bgColor par statut.
- `src/components/delivery/__tests__/DriverCard.test.tsx` — rendu + onPress + état indispo.
- `src/screens/delivery/__tests__/CreateDeliveryScreen.test.tsx` — intégration : submit désactivé tant que incomplet, estimation tarif, erreur surpoids, navigation vers `DeliveryPayment` avec `deliveryId`.

---

## Fichiers critiques

- `src/lib/deliveryService.ts` (nouveau — cœur : moteur tarifaire + CRUD + transitions ; plus risqué)
- `src/lib/dataService.ts` (référence — pattern demo/Supabase à cloner)
- `src/lib/orderStatus.ts` (référence — pattern exact à cloner pour `deliveryStatus.ts`)
- `src/screens/cart/PaymentScreen.tsx` + `src/screens/seller/SellerOrdersScreen.tsx` (références — patterns formulaire paiement + liste commandes/boutons statut)
- `supabase/schema.sql` (étendre — 4 tables, 2 enums, realtime)
- `src/types/models.ts` (étendre — nouveaux types)

## Vérification

1. `npx tsc --noEmit` (script `ts:check`) — aucune erreur de type.
2. `npm test` — tous les tests unitaires/intégration passent.
3. Démo manuelle (mode démo) : Dashboard vendeur → « Commander livraison » → recherche livreurs → filtres → création demande → paiement Mobile Money (capture) → suivi statut (livreur accepte → enlève → livre) → annulation + remboursement.
4. Vérifier qu'aucun écran existant n'est cassé (commandes, paiements, notifications) — la table `payments` et le flux `uploadPaymentProof` restent intacts.
5. Vérifier les notifications : chaque transition de statut crée une notification visible dans le centre de notifications avec le bon icône/couleur.
