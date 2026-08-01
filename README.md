# 🛍️ Boutikplus

La marketplace communautaire mobile des jeunes du Burkina Faso — un mini-Shopify adapté au contexte local et au paiement par Mobile Money (Orange Money / Moov Money).

## ✨ Fonctionnalités

- **3 rôles** : Acheteur, Vendeur, Admin
- **Création de boutique** en moins de 3 minutes (aucun statut légal requis)
- **Paiement Mobile Money manuel** : l'acheteur transfère vers le numéro du vendeur, téléverse une capture d'écran, le vendeur valide manuellement
- **Messagerie temps réel** acheteur ↔ vendeur (négociation, questions)
- **Panier multi-vendeurs** : commande scindée par vendeur (paiement individuel)
- **Promotions** mises en avant sur l'accueil
- **Suivi de commande** : 5 statuts (paiement → validation → préparation → livraison → livraison)
- **Devise FCFA**, interface 100% en français, design léger pour téléphones d'entrée de gamme

## 🚀 Démarrage rapide

### 1. Installer les dépendances
```bash
npm install
```

### 2. Mode démonstration (sans backend)
L'application fonctionne **immédiatement en mode démo** avec des données fictives.
```bash
npm start
```
Sur l'écran de connexion, choisissez un rôle de démo (Acheteur / Vendeur / Admin).

### 3. Brancher Supabase (optionnel, pour de vraies données)
1. Créez un projet sur [supabase.com](https://supabase.com)
2. Dans le SQL Editor, exécutez dans l'ordre :
   - `supabase/schema.sql`
   - `supabase/policies.sql`
   - `supabase/storage.sql`
3. Copiez `.env.example` en `.env` et renseignez :
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon-ici
   ```
4. Redémarrez l'app — elle bascule automatiquement vers Supabase

## 📱 Lancer l'app

```bash
npm start          # Expo Dev Tools
npm run android    # Émulateur/device Android
npm run ios        # iOS (macOS requis)
```

Scannez le QR code avec l'app **Expo Go** sur votre téléphone.

## 🏗️ Architecture

```
boutikplus/
├── App.tsx                    # Entrée + Providers
├── src/
│   ├── navigation/            # Navigateurs (Stack + tab bar)
│   ├── screens/               # 26 écrans (auth/home/cart/messages/profile/seller/admin)
│   ├── components/            # UI réutilisable (Button, Card, ProductCard, MobileMoneyInfo...)
│   ├── context/               # AuthContext, CartContext, NotificationContext
│   ├── lib/                   # supabase, dataService, format, storage, orderStatus
│   ├── theme/                 # couleurs, espacement, typographie
│   ├── types/                 # models, navigation, database
│   ├── constants/             # villes, catégories, opérateurs Mobile Money
│   └── data/                  # données de démonstration
├── supabase/                  # schema.sql, policies.sql, storage.sql, seed.sql
└── assets/
```

## 💰 Flux de paiement Mobile Money

```
Acheteur passe commande
   ↓
Statut : "En attente de paiement"
   ↓
Acheteur voit le numéro du vendeur (Orange/Moov Money) → copie
   ↓
Acheteur effectue le transfert depuis son app Mobile Money
   ↓
Acheteur téléverse la capture d'écran de confirmation
   ↓
Statut : "Preuve envoyée, en attente de validation"
   ↓
Vendeur reçoit une notification → vérifie la capture → "Confirmer le paiement reçu"
   ↓
Statut : "Paiement confirmé, en préparation" → En livraison → Livrée
```

## 🎨 Design

Inspiré de Jumia : orange vibrant `#FF6B00` en primaire, violet `#6B2D8E` en secondaire, vert `#00A859` fonctionnel. Police Poppins, cartes arrondies, micro-interactions.

## 🛠️ Stack technique

- **React Native + Expo** (TypeScript)
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
- **React Navigation** v6
- Context API + hooks (sans Redux, pour la légèreté)
- expo-image-picker + expo-image-manipulator (compression images)

## 📄 Licence

Projet de démonstration — Fait avec ❤️ au Faso.
