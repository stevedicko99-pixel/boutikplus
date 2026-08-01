# Guide de déploiement Boutikplus

Propriétaire : DICKO Steve · Mise à jour : 1er août 2026

Trois voies de distribution, classées par coût (du gratuit au payant).

---

## 🟢 Voie 1 — APK Android direct (GRATUIT, recommandé pour démarrer)

Distribue l'app aux vendeurs **sans Google Play**, par partage direct (WhatsApp, lien web).
Aucun compte store requis. Idéal pour la cible (Android majoritaire au Faso).

### Prérequis (gratuits)
- Un compte Expo : https://expo.dev/signup (gratuit, sans CB)
- EAS CLI : `npm install -g eas-cli`

### Étapes
```bash
# 1. Connexion Expo
eas login

# 2. Initialiser le projet EAS (génère le projectId à reporter dans app.json > extra.eas.projectId)
eas init

# 3. Renseigner votre username Expo dans app.json > "owner"

# 4. Builder l'APK (profil preview = APK installable par sideloading)
eas build --profile preview --platform android

# 5. Télécharger l'APK et le partager (lien EAS ou upload sur Google Drive / WhatsApp)
```

### Installation par les vendeurs (sideloading)
Sur Android : Paramètres → Sécurité → « Sources inconnues » → ouvrir l'APK.
Aucun compte requis côté utilisateur.

> ⚠️ Limite du plan Free EAS : 15 builds Android/mois. Suffisant pour itérer.

---

## 🟢 Voie 2 — Web app / PWA (GRATUIT, accès immédiat)

L'app a un target web (`expo start --web`). Déployée sur Vercel, elle est accessible
depuis tout navigateur — ordinateur ou mobile.

### Déploiement Vercel (gratuit)
```bash
# 1. Installer Vercel CLI
npm install -g vercel

# 2. Build web
npx expo export --platform web

# 3. Déployer
vercel
```
La privacy policy est disponible à `/privacy-policy.html` (fichier `public/`).

---

## 🔵 Voie 3 — Google Play Store (25 $ unique, quand budget disponible)

### Prérequis
- Compte Google Play Console : https://play.google.com/console/signup (25 $ une fois)
- EAS CLI + compte Expo

### Étapes
```bash
# 1. Builder l'AAB (format store Android)
eas build --profile production --platform android

# 2. Soumettre au Play Store
eas submit --platform android --profile production
#    (nécessite une clé de compte de service Google Play — EAS peut la générer)

# 3. Compléter la fiche Play Store : description, captures, catégorie,
#    classification contenu, URL privacy policy (https://<votre-site>/privacy-policy.html)
```

---

## 🔵 Voie 4 — Apple App Store (99 $/an, quand budget disponible)

### Prérequis
- Apple Developer Program : https://developer.apple.com/programs/enroll/ (99 $/an)
- Compte Expo + EAS

### Étapes
```bash
# 1. Renseigner dans eas.json > submit.production.ios :
#      appleId, ascAppId, appleTeamId

# 2. Builder l'IPA
eas build --profile production --platform ios

# 3. Soumettre à App Store Connect
eas submit --platform ios --profile production

# 4. Compléter la fiche App Store Connect : description, captures,
#    URL privacy policy, classification contenu
```

> ⚠️ Sans compte Apple payant : vous pouvez seulement installer l'app sur votre propre
> iPhone (certificat 7 jours). Aucune distribution publique possible.

---

## 📋 Checklist finale avant toute distribution

| Tâche | Statut | Fait par |
|-------|--------|----------|
| Retirer les refs Firebase de eas.json | ✅ Fait | Assistant |
| Privacy policy créée (`public/privacy-policy.html`) | ✅ Fait | Assistant |
| Renseigner `owner` dans app.json (username Expo) | ⬜ À faire | Vous |
| Renseigner `eas.projectId` via `eas init` | ⬜ À faire | Vous + `eas init` |
| Tester l'app en mode démo sur un vrai appareil | ⬜ À faire | Vous |
| Captures d'écran stores (quand applicable) | ⬜ À faire | Vous |
| Email de support + téléphone dans privacy policy | ⬜ À faire | Vous |
| Secrets CinetPay/Genius Code (quand paiement auto activé) | ⬜ Plus tard | Vous |

## 📐 Stratégie recommandée (sans budget)
1. **Maintenant** : Voie 1 (APK) + Voie 2 (Web) → vos vendeurs utilisent l'app et vous vendez.
2. **Dès que possible** : Voie 3 (Play Store, 25 $) → visibilité + confiance + mises à jour auto.
3. **Plus tard** : Voie 4 (App Store, 99 $/an) → audience iOS.
