/* ====================================================================
 * Boutikplus — Générateur de commande EAS Build APK Android (preview)
 * + Checklist signature / déploiement
 *
 * Mémoire projet — build APK précédente (3927dde5) — profil=preview :
 *   — Durée ~12 min (services cloud Expo)
 *   — APK signée par EAS, prête au déploiement interne
 * ==================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── 0. Intro ────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════');
console.log(' BOUTIKPLUS — EAS BUILD APK ANDROID (PREVIEW)');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

let errors = [];
let warnings = [];

const required = [
  'package.json',
  'eas.json',
  'app.json',
  '.npmrc',
  'supabase/config.toml',
];

// ── 1. Vérification fichiers critiques ──────────────────────────────
console.log('── 1. Vérifications fichiers ──────────────────────────────────────');
for (const f of required) {
  const p = path.join(ROOT, f);
  const ok = fs.existsSync(p);
  console.log(`${ok ? '✅' : '❌'} ${f}`);
  if (!ok) errors.push(`Fichier requis introuvable : ${f}`);
}
console.log('');

// ── 2. eas.json ─────────────────────────────────────────────────────
console.log('── 2. Configuration eas.json ───────────────────────────────────────');
try {
  const easCfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));
  const preview = easCfg?.build?.preview;
  const production = easCfg?.build?.production;
  console.log(`✅ preview.android.buildType    = ${preview?.android?.buildType ?? '⚠️ MANQUANT'}`);
  console.log(`✅ preview.distribution         = ${preview?.distribution ?? '⚠️ MANQUANT'}`);
  console.log(`✅ production.android.buildType = ${production?.android?.buildType ?? '⚠️ MANQUANT'}`);
  console.log(`✅ production.distribution      = ${production?.distribution ?? '⚠️ MANQUANT'}`);
  if (preview?.android?.buildType !== 'apk') warnings.push('profil preview: buildType devrait être "apk"');
} catch (e) { errors.push('eas.json invalide ou illisible'); }
console.log('');

// ── 3. app.json (version & package) ─────────────────────────────────
console.log('── 3. app.json — version & package ─────────────────────────────────');
try {
  const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'))?.expo ?? {};
  console.log(`✅ version          = ${appJson.version ?? '⚠️'}`);
  console.log(`✅ android.package  = ${appJson.android?.package ?? '⚠️ MANQUANT (ex: com.boutikplus.app)'}`);
  console.log(`✅ versionCode      = ${appJson.android?.versionCode ?? '⚠️ INCREMENTER AVANT BUILD!'}`);
  console.log(`✅ ios.buildNumber  = ${appJson.ios?.buildNumber ?? '⚠️'}`);
  console.log(`✅ owner (expo)     = ${appJson.owner ?? '⚠️ MANQUANT (expo account)'}`);
} catch (e) { errors.push('app.json invalide'); }
console.log('');

// ── 4. .npmrc legacy-peer-deps ──────────────────────────────────────
console.log('── 4. .npmrc (EAS respecte ce fichier) ─────────────────────────────');
const npmrcPath = path.join(ROOT, '.npmrc');
if (fs.existsSync(npmrcPath)) {
  const npmrc = fs.readFileSync(npmrcPath, 'utf8');
  const hasLegacy = /legacy-peer-deps\s*=\s*true/.test(npmrc);
  console.log(hasLegacy ? '✅ legacy-peer-deps=true' : '❌ legacy-peer-deps=true MANQUANT');
  if (!hasLegacy) errors.push('.npmrc doit contenir legacy-peer-deps=true (bloquant ERESOLVE)');
} else { errors.push('.npmrc inexistant.'); }
console.log('');

// ── 5. react-test-renderer match ────────────────────────────────────
console.log('── 5. Dépendances critiques (package.json) ─────────────────────────');
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const reactVer = (pkg.dependencies?.react || '').replace(/[\^~]/, '');
  const rtrVer = (pkg.devDependencies?.['react-test-renderer'] || '').replace(/[\^~]/, '');
  console.log(`✅ react              = ${pkg.dependencies?.react ?? '⚠️'}`);
  console.log(`✅ react-test-renderer = ${pkg.devDependencies?.['react-test-renderer'] ?? '❌ MANQUANT (devDependencies)'}`);
  if (!pkg.devDependencies?.['react-test-renderer']) {
    errors.push('react-test-renderer DOIT être en devDependencies (cause ERESOLVE)');
  } else if (rtrVer !== reactVer) {
    warnings.push(`Versions React (${reactVer}) != react-test-renderer (${rtrVer})`);
  }
} catch (e) { warnings.push('Impossible de lire package.json'); }
console.log('');

// ── 6. Commandes build ──────────────────────────────────────────────
console.log('═══ 6. BUILD APK : Commandes à copier-coller ════════════════════════');
console.log('');
console.log('   # (a) Installer EAS CLI (si besoin) :');
console.log('   npm install -g eas-cli');
console.log('');
console.log('   # (b) Se connecter à Expo :');
console.log('   eas login');
console.log('');
console.log('   # (c) LANCER LE BUILD CLOUD Android preview (APK interne) :');
console.log('   eas build -p android --profile preview --non-interactive');
console.log('');
console.log('   # (d) Une fois le build terminé, télécharger l\'APK :');
console.log('   eas build:list --platform android --status finished');
console.log('   eas build:view <BUILD-UUID>');
console.log('');
console.log('   # (e) BUILD LOCAL (Docker requis, plus rapide en itération) :');
console.log('   eas build -p android --profile preview --local --output ./Boutikplus-v1.2.0.apk');
console.log('');

// ── 7. Checklist post-build APK ─────────────────────────────────────
console.log('═══ 7. CHECKLIST POST-BUILD APK ════════════════════════════════════');
console.log('');
const checks = [
  ['APK signée correctement',
   'aapt dump badging app.apk | grep package',
   'package: name=.com.boutikplus.app. versionCode=...'],
  ['Version & versionCode',
   'aapt dump badging *.apk | grep -E "(versionName|versionCode)"',
   'versionName="1.2.0" versionCode=...'],
  ['Permissions requises OK',
   'aapt dump badging *.apk | grep uses-permission',
   'CAMERA, INTERNET, READ_EXTERNAL_STORAGE, ACCESS_NETWORK_STATE'],
  ['Package ID = com.boutikplus.app',
   'aapt dump badging *.apk | grep "package: name="',
   'name=.com.boutikplus.app.'],
  ['Taille APK ≤ 100 MB',
   'ls -lh *.apk  # sous Windows : dir *.apk',
   'typique ~40–60 MB (Expo SDK 52)'],
  ['Icône adaptive présente',
   'aapt dump badging *.apk | grep application-icon',
   'adaptive-icon ok → xxxhdpi'],
  ['ABIs (ARM64 + armeabi-v7a)',
   'aapt dump badging *.apk | grep native-code',
   "arm64-v8a'armeabi-v7a'x86_64"],
  ['Test installation physique',
   'adb install -r app-release.apk',
   'Lancer app → écran accueil sans crash'],
  ['Connectivité Supabase',
   'DevTools → Network / console JS',
   'aucun 401, 403 ou 500 sur /rest/v1, /auth/v1, /storage/v1'],
  ['Création compte (trigger on_auth_user_created)',
   'Inscription email bidon → login',
   'profiles.id = auth.users.id, INSERT OK'],
  ['Upload preuve paiement (Storage)',
   'Simulation paiement + upload photo',
   'Fichier dans payment-proofs/{userId}/... RLS OK'],
  ['Fonction IA générative (mistral-proxy)',
   'Boutique → Créer produit → "Générer description IA"',
   'Appel Edge Function → texte généré, pas 500'],
  ['Remove.bg proxy',
   'Studio photo → "Supprimer fond"',
   'Appel Edge Function → image result_data_url affichée'],
  ['Mode offline réel (NetInfo)',
   'Activer mode avion → créer produit → reconnecter',
   'Queue dans AsyncStorage, autosync → produit créé en base'],
  ['Partage OG image WhatsApp',
   'Partager lien produit sur WhatsApp',
   "Miniature 1200×630 affichée (pas d'icône vide)"],
];
for (let i = 0; i < checks.length; i++) {
  console.log(`   [${String(i+1).padStart(2, '0')}] ${checks[i][0]}`);
  console.log(`        Commande : ${checks[i][1]}`);
  console.log(`        Attendu  : ${checks[i][2]}`);
  console.log('');
}

// ── 8. Distribution ─────────────────────────────────────────────────
console.log('═══ 8. DISTRIBUTION APK / AAB ═══════════════════════════════════════');
console.log('');
console.log('   Option A — APK interne (preview, testeurs) :');
console.log('   • eas build -p android --profile preview   → APK signé');
console.log('   • Partager via WhatsApp / Telegram / Drive : Boutikplus-v1.2.0.apk');
console.log('   • URL : https://expo.dev/accounts/<VOTRE-COMPTE>/projects/boutikplus/builds/<UUID>');
console.log('');
console.log('   Option B — Google Play Store (production) :');
console.log('   • eas build -p android --profile production   → AAB (pas APK)');
console.log('   • Uploader le .aab sur play.google.com/console');
console.log('   • Fiche store à remplir :');
console.log('     - nom boutique / description courte (80c) / longue (4000c)');
console.log('     - captures d\'écran (phone : 7", tablette 10", Android TV, Wear OS)');
console.log('     - icône haute résolution 512×512 px PNG 24-bit');
console.log('     - Feature graphic 1024×500 px');
console.log('     - vidéo promo YouTube (optionnel)');
console.log('     - catégorie (Shopping / Style de vie)');
console.log('     - classement contenu (questionnaire IARC)');
console.log('     - politique de confidentialité URL');
console.log('     - tarifs → gratuit');
console.log('     - pays & régions → Burkina Faso, CI, Mali, Niger, Sénégal, Bénin, Togo');
console.log('   • Cycle : Test interne → Test fermé (alpha) → Test ouvert (beta) → Production');
console.log('');

// ── Bilan ───────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════');
console.log(' BILAN VÉRIFICATIONS CONFIGURATION');
console.log('═══════════════════════════════════════════════════════════');
console.log(`❌ Erreurs bloquantes : ${errors.length}`);
console.log(`⚠️  Warnings           : ${warnings.length}`);
if (errors.length) {
  console.log('\n❌ ERREURS:');
  for (const e of errors) console.log('   • ' + e);
}
if (warnings.length) {
  console.log('\n⚠️  WARNINGS:');
  for (const w of warnings) console.log('   • ' + w);
}
console.log('');
console.log('🎉 Si 0 erreur : prêt pour `eas build -p android --profile preview`');
console.log('═══════════════════════════════════════════════════════════');
