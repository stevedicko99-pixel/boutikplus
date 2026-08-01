# Boutikplus — Backend Supabase

Documentation complète du backend pour la marketplace Boutikplus.
Propriétaire : DICKO Steve · Version : 1.0.0

---

## 📋 Sommaire

1. [Architecture](#architecture)
2. [Installation](#installation)
3. [Structure des fichiers](#structure-des-fichiers)
4. [Schéma de données](#schéma-de-données)
5. [Sécurité (RLS)](#sécurité-rls)
6. [Triggers](#triggers)
7. [Fonctions RPC](#fonctions-rpc)
8. [Edge Functions](#edge-functions)
9. [Storage](#storage)
10. [Realtime](#realtime)
11. [Variables d'environnement](#variables-denvironnement)
12. [Déploiement](#déploiement)

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Application React Native          │
│                   (Expo SDK 52, TypeScript)         │
└───────────────┬─────────────────────────────────────┘
                │
                │  supabase-js (anon key, RLS-protected)
                │
┌───────────────▼─────────────────────────────────────┐
│                  Supabase Project                   │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌───────────┐  │
│  │ Postgres│ │  Auth    │ │Storage │ │ Realtime  │  │
│  │  (RLS)  │ │ (JWT)    │ │ (5 bkt)│ │ (6 tables)│  │
│  └────┬────┘ └────┬─────┘ └───┬────┘ └─────┬─────┘  │
│       │           │           │            │        │
│  ┌────▼────┐ ┌────▼──────────▼────┐ ┌─────▼─────┐  │
│  │Triggers │ │ Edge Functions     │ │  pg_cron  │  │
│  │ (9)     │ │ (4: payment, push) │ │ (cleanup) │  │
│  └─────────┘ └────────────────────┘ └───────────┘  │
└─────────────────────────────────────────────────────┘
```

## Installation

### Prérequis
- Node.js 18+ et npm
- CLI Supabase : `npm install -g supabase`
- Un compte Supabase (https://supabase.com)

### Étapes

```bash
# 1. Lier le projet Supabase
supabase link --project-ref <votre-project-ref>

# 2. Appliquer le schéma (tables, enums, indexes)
supabase db push

# 3. Ou en local pour développer :
supabase start          # démarre le stack local
supabase db reset       # ré-applique schema + policies + triggers + seed

# 4. Configurer les secrets des Edge Functions
#    (Paiement manuel par défaut — les secrets CinetPay/Genius Code
#     sont OPTIONNELS, à configurer quand le checkout automatisé sera activé)
supabase secrets set CINETPAY_NOTIFY_URL=https://<projet>.supabase.co/functions/v1/payment-webhook
supabase secrets set APP_URL=https://boutikplus.app
# Quand le checkout en ligne sera activé :
#   supabase secrets set CINETPAY_API_KEY=xxx
#   supabase secrets set CINETPAY_SITE_ID=xxx

# 5. Déployer les Edge Functions
supabase functions deploy create-checkout-session
supabase functions deploy payment-webhook
supabase functions deploy send-push-notification
supabase functions deploy cleanup-expired-data

# 6. Activer pg_cron et planifier le nettoyage quotidien
#    (approche directe SQL, sans dépendance à pg_net)
supabase db query --linked --file supabase/cron.sql
```

## Structure des fichiers

```
supabase/
├── config.toml                          # Configuration CLI Supabase
├── schema.sql                           # DDL : 24 tables, enums, indexes, FK, activation RLS
├── policies.sql                         # Row Level Security (politiques de toutes les tables)
├── triggers.sql                         # 7 triggers métier (slug, stock, rating, notif, campagne)
├── rpc.sql                              # 8 fonctions RPC (validate_discount, analytics, etc.)
├── storage.sql                          # 5 buckets + policies path-based sécurisées
├── seed.sql                             # Données de référence (catégories)
├── cron.sql                             # pg_cron : nettoyage quotidien (promotions/codes/notifs)
├── README.md                            # Ce fichier
└── functions/                           # Edge Functions (Deno/TypeScript)
    ├── deno.json                        # Config Deno (imports, types) pour les Edge Functions
    ├── create-checkout-session/         # Session paiement CinetPay
    │   └── index.ts
    ├── payment-webhook/                 # Webhook confirmation CinetPay (re-vérification API)
    │   └── index.ts
    ├── send-push-notification/          # Push Expo
    │   └── index.ts
    └── cleanup-expired-data/            # Cron de nettoyage (promotions, codes, notifs)
        └── index.ts
```

### Ordre d'exécution des fichiers SQL

Les fichiers doivent être appliqués dans cet ordre (via `supabase db reset` ou SQL Editor) :

1. `schema.sql` — création des tables, indexes, types, activation RLS, triggers structurels
2. `policies.sql` — politiques RLS (dépend des tables créées à l'étape 1)
3. `triggers.sql` — triggers métier (dépend des tables et de `handle_new_user`)
4. `rpc.sql` — fonctions RPC (dépend des tables)
5. `storage.sql` — buckets et politiques Storage
6. `seed.sql` — données de référence (catégories, villes)
7. `cron.sql` — active `pg_cron` et planifie le nettoyage quotidien

## Schéma de données

24 tables organisées en 5 domaines fonctionnels :

| Domaine | Tables | Description |
|---------|--------|-------------|
| **Auth & Profils** | `profiles` | Extension de `auth.users` (rôle, téléphone, ville, push_token) |
| **Catalogue** | `categories`, `shops`, `products`, `product_images`, `product_videos` | Boutiques, produits, photos, vidéos |
| **Commerce** | `cart_items`, `orders`, `order_items`, `payments`, `delivery_addresses`, `reviews` | Panier, commandes, paiements, avis |
| **Livraison** | `driver_profiles`, `delivery_requests`, `delivery_payments`, `delivery_reviews` | Profils livreurs, demandes, paiements, avis |
| **Promotion** | `promotions`, `share_links`, `discount_codes`, `campaign_events` | Publicités, liens traçables, codes promo, analytics |
| **Communication** | `conversations`, `messages`, `notifications`, `shop_follows`, `reports` | Chat, notifications, suivis, signalements |

### Types énumérés (16)

`user_role`, `shop_status`, `product_status`, `order_status`, `payment_operator`, `payment_status`, `delivery_status`, `vehicle_type`, `promotion_visibility`, `promotion_status`, `promotion_type`, `discount_code_status`, `share_link_source`, `share_link_medium`, `campaign_event_type`, `product_video_type`, `external_video_source`

## Sécurité (RLS)

**Row Level Security est activé sur TOUTES les tables.** Aucune donnée n'est accessible sans authentification (sauf lecture publique sur : catégories, boutiques actives, produits disponibles, avis, liens de partage actifs).

### Principes

| Table | Lecture | Écriture |
|-------|---------|----------|
| `profiles` | Public | Self only (`auth.uid() = id`) |
| `shops` | Active OU owner OU admin | Owner only |
| `products` | Available OU owner OU admin | Shop owner only |
| `orders` | Buyer OU seller OU admin | Buyer crée, buyer+seller updatent |
| `payments` | Participants de la commande | Buyer crée preuve, seller valide |
| `messages` | Participants de la conversation | Sender = `auth.uid()` |
| `notifications` | Owner only | Owner only (auto via triggers) |
| `delivery_requests` | Seller, driver assigné, ou driver disponible | Seller crée, parties updatent |
| `share_links` | Active = public, sinon owner | Owner only |
| `discount_codes` | Active = public, sinon owner | Owner only |
| `campaign_events` | Owner de la boutique | INSERT public (tracking anonyme) |

### Helper `is_admin()`

```sql
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

## Triggers

9 triggers automatiques (2 dans `schema.sql`, 7 dans `triggers.sql`) :

| Trigger | Table | Action |
|---------|-------|--------|
| `handle_new_user` | `auth.users` INSERT | Crée automatiquement un `profile` à l'inscription |
| `update_updated_at` | `orders`, `delivery_requests` UPDATE | Maintient `updated_at` |
| `share_links_generate_slug` | `share_links` INSERT | Génère un slug unique si non fourni |
| `order_items_decrement_stock` | `order_items` INSERT | Décrémente le stock produit + passe à `out_of_stock` si = 0 |
| `orders_restore_stock` | `orders` UPDATE | Remet le stock si commande annulée |
| `delivery_reviews_update_rating` | `delivery_reviews` INSERT/UPDATE | Recalcule `rating` et `total_deliveries` du livreur |
| `messages_notify_recipient` | `messages` INSERT | Crée une notification au destinataire |
| `campaign_events_increment_usage` | `campaign_events` INSERT | Incrémente `uses_count` + passe à `exhausted` si max atteint |
| `campaign_events_update_counters` | `campaign_events` INSERT | MAJ `views_count`, `clicks_count`, `conversions_count`, `revenue_total` sur `share_links` |

## Fonctions RPC

8 fonctions dans `rpc.sql` :

| Fonction | Usage |
|----------|------|
| `validate_discount_code(code, shop_id, amount)` | Valide un code promo et calcule la réduction |
| `get_shop_analytics(shop_id, days)` | Agrège vues/clics/conversions/revenu sur N jours |
| `get_seller_dashboard_stats(seller_id)` | Stats tableau de bord vendeur |
| `search_products(query, category, city, limit, offset)` | Recherche full-text produits |
| `cleanup_expired_promotions()` | Marque `expired` les promotions passées |
| `cleanup_expired_discount_codes()` | Marque `expired` les codes promo passés |
| `get_unread_message_count(user_id)` | Compte messages non lus |
| `mark_conversation_read(conv_id, user_id)` | Marque conversation comme lue |

## Stratégie de paiement

Boutikplus adopte une **stratégie de paiement manuel prioritaire** :

1. **Paiement manuel (mode par défaut, actif)** — Mobile Money (Orange Money / Moov Money)
   - L'acheteur voit les numéros du vendeur (champs `shops.orange_money_number` / `moov_money_number`)
   - L'acheteur effectue le transfert, téléverse une capture d'écran comme preuve
   - La preuve est stockée dans le bucket `payment-proofs` (isolé par `{userId}/`)
   - Une ligne `payments` est créée (`status = 'pending'`), la commande passe à `proof_uploaded`
   - Le vendeur valide ou refuse (`payments.status → validated/rejected`, commande → `payment_validated`)
   - RLS : seul l'acheteur insère la preuve, seul le vendeur la valide

2. **Checkout automatisé (désactivé, prêt pour activation)** — CinetPay / Genius Code
   - Les Edge Functions `create-checkout-session` et `payment-webhook` sont déployées
   - `isCheckoutAvailable()` retourne `false` tant que le prestataire n'est pas intégré
   - Activation : configurer les secrets serveur (`CINETPAY_API_KEY`, `CINETPAY_SITE_ID`)
     et passer `isCheckoutAvailable()` à `true`

Cycle de vie d'une commande :
```
pending_payment → proof_uploaded → payment_validated → in_delivery → delivered
                                                                ↘ cancelled
```

## Edge Functions

4 Edge Functions (Deno/TypeScript) :

### `create-checkout-session`
- **JWT requis** : oui
- **Rôle** : crée une session de paiement CinetPay pour une commande
- **Sécurité** : vérifie que l'orderId appartient à l'utilisateur connecté + cohérence du montant
- **Retour** : `{ paymentUrl, transactionId }`

### `payment-webhook`
- **JWT requis** : non (appelé par CinetPay)
- **Rôle** : confirme un paiement via re-vérification API CinetPay (anti-falsification)
- **Actions** : MAJ `payments.status = 'validated'`, `orders.status = 'payment_validated'`, notifications acheteur + vendeur

### `send-push-notification`
- **JWT requis** : oui
- **Rôle** : envoie une notification push via Expo Push API
- **Sécurité** : lit `profiles.push_token` côté serveur (jamais exposé côté client)

### `cleanup-expired-data`
- **JWT requis** : non (cron)
- **Rôle** : nettoie promotions/codes expirés + notifications lues > 90 jours
- **Planification** : via `pg_cron` à 03:00 UTC quotidiennement

## Storage

5 buckets publics en lecture :

| Bucket | Usage | Limite | Écriture |
|--------|-------|--------|----------|
| `shop-logos` | Logos de boutiques | — | Owner (`{userId}/file`) |
| `product-images` | Photos produits | — | Owner (`{userId}/file`) |
| `payment-proofs` | Captures de paiement | — | Owner (acheteur) |
| `delivery-proofs` | Preuves de livraison | — | Owner (vendeur) |
| `product-videos` | Vidéos uploadées | 25MB | Owner (`{userId}/file`) |

**Sécurité path-based** : chaque upload est préfixé par `{userId}/`. Les politiques Storage vérifient `(storage.foldername(name))[1] = auth.uid()::text`, garantissant qu'un utilisateur ne peut écrire que dans son propre dossier.

## Realtime

6 tables exposées en Realtime (via `ALTER PUBLATION supabase_realtime`) :

- `messages` — chat temps réel
- `orders` — suivi commande en direct
- `payments` — notification de validation
- `notifications` — badge de notification live
- `delivery_requests` — suivi livraison
- `delivery_payments` — confirmation paiement livraison

## Variables d'environnement

### Côté client (`.env`, préfixées `EXPO_PUBLIC_`)

Seules ces variables sont embarquées dans le bundle client. Elles sont sûres car protégées par RLS.

```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

> ⚠️ La `anon key` est embarquée dans le bundle client mais protégée par RLS.
> La `service_role key` ne JAMAIS l'exposer côté client — elle contourne RLS.

### Côté serveur (Supabase Dashboard > Edge Functions > Secrets)

Ces variables ne sont **jamais** exposées côté client. Elles sont configurées via :
```bash
supabase secrets set CINETPAY_API_KEY=xxx
supabase secrets set CINETPAY_SITE_ID=xxx
supabase secrets set CINETPAY_NOTIFY_URL=https://xxx.supabase.co/functions/v1/payment-webhook
supabase secrets set APP_URL=https://boutikplus.app
```

| Variable | Usage | Configurée via |
|----------|-------|----------------|
| `CINETPAY_API_KEY` | Clé API CinetPay (secret serveur) | `supabase secrets set` |
| `CINETPAY_SITE_ID` | ID marchand CinetPay | `supabase secrets set` |
| `CINETPAY_NOTIFY_URL` | URL du webhook de paiement | `supabase secrets set` |
| `APP_URL` | URL de l'app pour redirects paiement | `supabase secrets set` |
| `SUPABASE_URL` | URL du projet (auto-injectée par Supabase) | automatique |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service_role (auto-injectée) | automatique |

> ⚠️ **JAMAIS** de clé API CinetPay ou de `service_role key` dans les variables `EXPO_PUBLIC_*`.

## Déploiement

```bash
# 1. Push du schéma
supabase db push

# 2. Déploiement des Edge Functions
supabase functions deploy create-checkout-session
supabase functions deploy payment-webhook
supabase functions deploy send-push-notification
supabase functions deploy cleanup-expired-data

# 3. Configuration du cron pg_cron (SQL Editor)
# Voir section Installation ci-dessus

# 4. Vérification
# - Test d'inscription : un profile doit être créé automatiquement
# - Test RLS : un utilisateur ne doit voir que ses propres données
# - Test Storage : un utilisateur ne doit pouvoir uploader que dans son dossier
# - Test paiement : le webhook doit valider la commande
```

---

*Boutikplus — La marketplace des jeunes vendeurs informels du Faso. 🇧🇫*
