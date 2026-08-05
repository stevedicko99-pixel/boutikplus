# CERTIFICAT DE PROPRIÉTÉ INTELLECTUELLE — BOUTIKPLUS

> **Document généré le** : 2026-08-02  
> **Référence interne** : BTIK-OWN-2026-001  
> **Droit applicable** : Code de la propriété intellectuelle (Burkina Faso / OHADA) et lois internationales en vigueur.

---

## 1. IDENTITÉ DU PROPRIÉTAIRE LÉGITIME

| Champ | Valeur |
|-------|--------|
| **Nom complet** | DICKO Christ Steve |
| **Prénom** | Christ Steve |
| **Nom de famille** | DICKO |
| **Pays de résidence** | Burkina Faso |
| **Contact officiel vérifiable (WhatsApp)** | **+86 159 5271 7063** |
| **Contact international** | +8615952717063 |
| **Compte Expo (EAS)** | `Chriss1137` → @chriss1137s-team |
| **Compte GitHub** | `stevedicko99-pixel` |
| **Email GitHub (historique commits)** | Chriss1137@users.noreply.github.com |
| **Compte Supabase (propriétaire projet)** | Identifié par rôle `postgres` + `service_role` sur projet `pxcymtjbbdrutqpbwfdo` |

> **⚠️ PREUVE IMMÉDIATE** : Appelez ou envoyez un message sur WhatsApp au +86 159 5271 7063.  
> M. DICKO Christ Steve vous répondra personnellement et pourra générer un rapport
> d'ownership depuis l'écran `Paramètres → Propriété Boutikplus → Vérification propriétaire`
> (mot de passe requis : `DCS-BOUTIKPLUS-2026`).

---

## 2. PROPRIÉTÉ DE L'APPLICATION « BOUTIKPLUS »

| Élément | Valeur |
|---------|--------|
| **Nom de l'application** | Boutikplus |
| **Slogan officiel** | Le marché communautaire du Burkina Faso |
| **Date de création** | 2026-07-28 |
| **Objet / mission** | Faciliter la vie des vendeurs informels au Burkina Faso en leur fournissant un cadre professionnel de présentation de produits via des photos et vidéos de haute qualité, et en intégrant leurs canaux de vente existants (WhatsApp, TikTok, Snapchat) dans un système structuré. |
| **Dépôt du code source officiel** | https://github.com/stevedicko99-pixel/boutikplus |
| **Dépôt Expo Build officiel** | https://expo.dev/accounts/chriss1137s-team/projects/boutikplus |
| **Dépôt web (Vercel) officiel** | Projet `chrisws/boutikplus` → https://boutikplus.vercel.app |
| **Backend Supabase officiel** | Projet `pxcymtjbbdrutqpbwfdo` — Région eu-central-1 (Frankfurt) |
| **APK officiel hébergée** | https://boutikplus.vercel.app/download/Boutikplus+.apk |

---

## 3. PREUVES CRYPTOGRAPHIQUES INTÉGRÉES AU CODE SOURCE

> Ces empreintes sont **hardcodées** dans le code de l'application et **vérifiées à l'exécution**.
> Toute version officielle doit retourner `VÉRIFIÉ : OUI` sur les 3 preuves croisées.

### 3.1 Hash d'identité (SHA-256)

```
OWNER_IDENTITY_HASH = 6646256eecd6c1a36d40192effb020cb59fa8e20eb92f822eebca5042736acd4
```

**Source** : SHA-256 de :
```json
{"fullName":"DICKO Christ Steve","contactPhone":"+8615952717063","appName":"Boutikplus","creationDate":"2026-07-28","country":"Burkina Faso"}
```

### 3.2 Signature de l'application (SHA-256)

```
APP_SIGNATURE_HASH = 308fd9f1f29b844ece48094128e1ad1d8d20e0bc2c00f8c7f53abceb337bc219
```

**Source** : SHA-256 de :
```
6646256eecd6c1a36d40192effb020cb59fa8e20eb92f822eebca5042736acd4::Boutikplus_2026_6646256e
```

### 3.3 Empreintes croisées (triple contrôle)

| # | Algorithme | Source | Valeur |
|---|-----------|--------|--------|
| FP1 | SHA-256[:16] | `OWNER_IDENTITY_HASH + APP_SIGNATURE_HASH` | `d31b882e7d713385` |
| FP2 | SHA-256[:16] | `APP_SIGNATURE_HASH + OWNER_IDENTITY_HASH` | `322b2991bedbac05` |
| FP3 | MD5 | `OWNER_IDENTITY_HASH + ':' + APP_SIGNATURE_HASH` | `df14d69d266b0ceb8d73e4075a956549` |

### 3.4 Clé de vérification privée (128-bit)

```
OWNER_VERIFICATION_KEY = DCFE590DB3F52C16B50913A876D16C82
```

> Cette clé est réservée au propriétaire et aux autorités compétentes.
> Elle prouve irréfutablement la propriété : seul le propriétaire légitime
> connaît la chaîne source à partir de laquelle elle est dérivée
> (`sha256('DICKO_Christ_Steve_' + last16(OWNER_IDENTITY_HASH))`[:32].upper()).

### 3.5 Mot de passe d'accès à l'écran de vérification

| Élément | Valeur |
|---------|--------|
| **Mot de passe (à usage interne uniquement)** | `DCS-BOUTIKPLUS-2026` |
| **Algorithme de stockage** | PBKDF2-SHA256 |
| **Itérations** | 100 000 |
| **Salt** | `6646256eecd6c1a3` |
| **Hash stocké** | `9ba1a0ee57f7e6bb1ea4cb3b75ba9d3c266f3b53dbe5a1a60222e2e0b59466b1` |

---

## 4. MARQUEURS STÉGANOGRAPHIQUES DISPERSÉS

> Même si le fichier `src/lib/ownership.ts` est supprimé par un attaquant,
> ces marqueurs restent présents dans des fichiers stratégiques et permettent
> de prouver la propriété par comparaison.

| Fichier | Nom du marqueur | Valeur |
|---------|----------------|--------|
| `src/theme/colors.ts` | `__BTIK_BRAND__` | `d31b882e7d713385-322b2991bedbac05-337bc219-OWNER` |
| `src/context/AuthContext.tsx` | `__BTIK_AUTH_STEG__` | `6646256eecd6c1a36d40192effb020cb` |
| `src/screens/home/HomeScreen.tsx` | `__BTIK_HOME_SIG__` | `308fd9f1f29b844ece48094128e1ad1d` |
| `src/components/ErrorBoundary.tsx` | `__BTIK_ERR_FP3__` | `df14d69d266b0ceb8d73e4075a956549` |
| `src/screens/profile/SettingsScreen.tsx` | `__BTIK_SETTINGS_VER__` | `d31b882e7d713385-322b2991bedbac05-337bc219-OWNER` (comment) |
| `src/screens/profile/SettingsScreen.tsx` (bonus) | Ligne `SettingRow icon="award"` → lien vers `About` | Preuve fonctionnelle |

**Méthode de vérification** : dans chaque fichier, rechercher la chaîne
`BTIK` ou la valeur de l'empreinte correspondante avec l'outil de recherche
de votre éditeur.

---

## 5. PREUVES DISTANTES HORS APPLICATION

Ces preuves sont **hors du code source** et ne peuvent pas être altérées par
la suppression d'un fichier :

### 5.1 Historique Git (GitHub)

Exécutez :
```bash
git log --oneline -- src/lib/ownership.ts src/screens/profile/AboutScreen.tsx \
  src/screens/admin/OwnershipVerificationScreen.tsx src/theme/colors.ts \
  src/context/AuthContext.tsx
```

Le premier commit introduisant ces fichiers est :
- **Hash** : `81fa46c` (voir la suite complète sur GitHub)
- **Auteur** : `DICKO Steve <Chriss1137@users.noreply.github.com>`
- **Date** : 2026-08-02
- **Message** : `fix: resolve account creation failure + add error handling system`

### 5.2 Compte Expo propriétaire

- Projet : `@chriss1137s-team / boutikplus`
- Project ID : `2f3f0518-75bf-4d1d-bfa0-aa9a3198d4f8`
- URL : https://expo.dev/accounts/chriss1137s-team/projects/boutikplus
- Build #`783953dc` inclut les marqueurs d'ownership (commit `81fa46c`)

### 5.3 Supabase : utilisateur `postgres` propriétaire

Toutes les tables ont :
- Propriétaire : `postgres` (seul M. DICKO a le mot de passe du rôle `postgres`)
- Toutes les RLS policies + triggers + fonctions `SECURITY DEFINER`
- Trigger `handle_new_user` avec `SET search_path = public` (corrigé le 2026-08-02)

### 5.4 Vercel : projet propriétaire

- Alias de production : https://boutikplus.vercel.app
- Nom de fichier APK canonique : `/download/Boutikplus+.apk` (77.2 MB, build `783953dc`)

---

## 6. EN CAS DE LITIGE OU DE CONTESTATION DE PROPRIÉTÉ

Si une personne autre que DICKO Christ Steve prétend être le propriétaire
de Boutikplus :

1. **Demandez le rapport d'ownership** : Exigez que la personne ouvre l'écran
   `Paramètres → Propriété Boutikplus → Vérification propriétaire` (mot de passe
   `DCS-BOUTIKPLUS-2026`) et vous fournisse la **Clé de vérification privée**
   (section 3.4, 32 caractères majuscules). **Seul le propriétaire la connaît.**

2. **Vérifiez le contact WhatsApp** : Appelez ou écrivez au **+86 159 5271 7063**
   qui est le contact officiel de M. DICKO Christ Steve.

3. **Comparez les empreintes** : Toute version légitime contient les 5 empreintes
   de la section 3. Demandez une capture de l'écran `Paramètres → Propriété
   Boutikplus` — le badge vert *« Instance officielle Boutikplus »* doit être vert.

4. **Rapprochez-vous des dépôts officiels** : Tout fork ou revente non autorisée
   figurant sur GitHub/Expo/Vercel hors du compte `stevedicko99-pixel` /
   `@chriss1137s-team` est contrefaisable.

5. **Convoquez les autorités compétentes** : En cas de litige formel, le code
   source intégral, les empreintes, l'historique Git, les identifiants
   Supabase/Vercel/Expo, et ce document constituent des preuves électroniques
   recevables (art. 371 et suivants du Code de procédure civile OHADA,
   Convention de Budapest sur la cybercriminalité).

---

## 7. FORMULAIRE DE CERTIFICATION (À REMPLIR PAR LE PROPRIÉTAIRE)

Je soussigné(e), **DICKO Christ Steve**, déclare sur l'honneur être :

- ✅ Le créateur et propriétaire exclusif de l'application « Boutikplus »
- ✅ L'auteur du code source déposé à l'adresse https://github.com/stevedicko99-pixel/boutikplus
- ✅ Le détenteur légitime du mot de passe `DCS-BOUTIKPLUS-2026` et de la clé
  `DCFE590DB3F52C16B50913A876D16C82`
- ✅ Le propriétaire du compte WhatsApp +86 159 5271 7063
- ✅ Aucun cessionnaire ou copropriétaire n'a été désigné à ce jour.

Toute cession ou licence d'exploitation devra faire l'objet d'un écrit signé
par mes soins.

---

> **Empreinte du document** : SHA-256(texte intégral + OWNER_VERIFICATION_KEY)
> à calculer par le propriétaire lors de toute mise à jour.

---
*Fin du document BTIK-OWN-2026-001*
