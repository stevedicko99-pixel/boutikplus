# TODO — Activation paiement Mobile Money + Message au vendeur

## 📋 Informations rassemblées
- `PaymentScreen.tsx` utilise un ID acheteur en dur `'demo-buyer'` → ne retrouve
  pas la commande réelle de l'utilisateur connecté → écran de preuve inaccessible
  lorsqu'on est connecté à son compte.
- La messagerie (`findOrCreateConversation`, `sendMessage`) et les notifications
  (`notifyNewMessage`) existent déjà dans `dataService.ts` / `notifications.ts`.
- Le vendeur peut déjà valider/refuser via `SellerOrdersScreen.tsx`.

## ✅ Étapes à réaliser

### Étape 1 — Corriger `PaymentScreen.tsx` (rendre le paiement actif)
- [x] Importer `useAuth` depuis `@/context/AuthContext`
- [x] Récupérer le profil / l'ID acheteur (`profile?.id ?? 'demo-buyer'`)
- [x] Utiliser cet ID dans `getBuyerOrders(buyerId)` et l'ordre fallback
- [x] Ajouter `buyerId` aux dépendances du `useEffect`

### Étape 2 — Envoyer un message au vendeur à chaque preuve
- [x] Importer `findOrCreateConversation`, `sendMessage`, `notifyNewMessage`,
      `PAYMENT_OPERATORS`
- [x] Dans `handleSubmit`, après succès de `uploadPaymentProof`,
      créer/retrouver la conversation et envoyer le message au vendeur
- [x] Déclencher `notifyNewMessage` vers le vendeur

## 🔍 Vérification
- [x] Compilation TypeScript (`npx tsc --noEmit`) — aucune erreur sur PaymentScreen

