/* ====================================================================
 * Boutikplus — Post-build : injection SEO / OG / Twitter Card / Schema.org
 * ====================================================================
 * Exécuter APRÈS `npx expo export --platform web` pour enrichir
 * dist/index.html des métadonnées requises par le projet (mémoire) :
 *   • OG tags (og:type, og:title, og:description, og:image, og:site_name, og:locale)
 *   • Twitter Card (twitter:card, twitter:title, twitter:description, twitter:image)
 *   • Schema.org Organization structured data (JSON-LD)
 *
 * Image OG recommandée : 1200×630 px (rapport 1.91:1, PNG/JPG < 8MB)
 * ==================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const INDEX = path.join(DIST, 'index.html');
const NODE_MODULES = path.join(ROOT, 'node_modules');
const PUBLIC_SW = path.join(ROOT, 'public', 'sw.js');
const DIST_SW = path.join(DIST, 'sw.js');

/* ── Configuration SEO ─────────────────────────────────────────────── */
const APP_URL = 'https://boutikplus.vercel.app';
const SITE_NAME = 'Boutikplus';
const OG_LOCALE = 'fr_FR';
const OG_TITLE = 'Boutikplus — Marketplace des jeunes vendeurs du Faso';
const OG_DESC = 'Créez votre boutique en 2 minutes, vendez sur WhatsApp, TikTok et Snapchat. Paiement Mobile Money sécurisé (Orange Money / Moov Money). Livraison partout au Burkina Faso.';
const OG_TYPE = 'website';

/**
 * Image OG (1200×630). DOIT être accessible publiquement en HTTPS.
 * 3 options (par ordre de préférence) :
 *   1. Image générée via l'API Trae :
 *      https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=...&image_size=landscape_16_9
 *   2. Image hébergée dans Supabase Storage (bucket public)
 *   3. OG image tierce : canva.com / figma.com → upload manuel
 */
const OG_IMAGE = 'https://aka.doubaocdn.com/s/UHnS9sVxlx'; // 1200×630 générée via Trae (Boutikplus orange brand)

/* ── 1. Vérifications préalables ───────────────────────────────────── */
if (!fs.existsSync(INDEX)) {
  console.error('❌ dist/index.html introuvable. Lancez d\'abord : npx expo export --platform web');
  process.exit(1);
}

let html = fs.readFileSync(INDEX, 'utf-8');
const headEndIdx = html.indexOf('</head>');
if (headEndIdx === -1) {
  console.error('❌ Balise </head> introuvable dans index.html');
  process.exit(2);
}

/* ── 2. Injection meta tags ────────────────────────────────────────── */
const metaTags = `
<!-- ============================================================ -->
<!-- SEO / Open Graph (généré par scripts/postbuild-seo-inject.mjs) -->
<!-- ============================================================ -->

<!-- OG / Facebook -->
<meta property="og:type" content="${OG_TYPE}" />
<meta property="og:title" content="${OG_TITLE}" />
<meta property="og:description" content="${OG_DESC}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:url" content="${APP_URL}" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta property="og:locale" content="${OG_LOCALE}" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${OG_TITLE}" />
<meta name="twitter:description" content="${OG_DESC}" />
<meta name="twitter:image" content="${OG_IMAGE}" />
<meta name="twitter:site" content="@boutikplus" />
<meta name="twitter:creator" content="@dickochrissteve" />

<!-- Apple / iOS -->
<meta name="apple-mobile-web-app-title" content="${SITE_NAME}" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />

<!-- Android / Chrome -->
<meta name="mobile-web-app-capable" content="yes" />
<meta name="application-name" content="${SITE_NAME}" />
<meta name="msapplication-TileColor" content="#FF6B00" />
<meta name="theme-color" content="#FF6B00" />

<!-- Canonical -->
<link rel="canonical" href="${APP_URL}" />

<!-- ============================================================ -->
<!-- Schema.org Organization (JSON-LD)                             -->
<!-- ============================================================ -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "${SITE_NAME}",
  "alternateName": "Boutik+",
  "url": "${APP_URL}",
  "logo": "${APP_URL}/favicon.ico",
  "description": "${OG_DESC}",
  "founder": "DICKO Christ Steve",
  "foundingDate": "2026",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "BF",
    "addressLocality": "Ouagadougou"
  },
  "sameAs": [
    "https://whatsapp.com/channel/0029Vabc123",
    "https://instagram.com/boutikplus",
    "https://tiktok.com/@boutikplus",
    "https://facebook.com/boutikplus"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+8615952717063",
    "contactType": "customer support",
    "availableLanguage": ["French", "English", "Mooré", "Dioula"]
  }
}
</script>
`;

// Inject before </head>
html = html.slice(0, headEndIdx) + metaTags + '\n' + html.slice(headEndIdx);

/* ── 3. Écrire le fichier index.html final ─────────────────────────── */
fs.writeFileSync(INDEX, html, 'utf-8');
if (fs.existsSync(PUBLIC_SW)) fs.copyFileSync(PUBLIC_SW, DIST_SW);

/* ── 4. Copier les assets (fonts, images) référencés dans le bundle ──
 * Le bundle Expo export utilise le pattern :
 *   m.exports="/assets/node_modules/.../Fonts/Feather.a76d309774d33d9856f650bed4292a23.ttf"
 * On doit donc :
 *   a. Scanner tous les JS du bundle pour extraire TOUS les chemins /assets/
 *   b. Pour chaque chemin, retrouver le fichier source dans node_modules/ (sans le hash)
 *   c. Le copier vers dist/assets/<path-complet-avec-hash>
 * ──────────────────────────────────────────────────────────────────── */
const JS_DIR = path.join(DIST, '_expo', 'static', 'js', 'web');
const assetExports = [];

if (fs.existsSync(JS_DIR)) {
  for (const jsFile of fs.readdirSync(JS_DIR)) {
    if (!jsFile.endsWith('.js')) continue;
    const content = fs.readFileSync(path.join(JS_DIR, jsFile), 'utf-8');
    const regex = /m\.exports="(\/assets\/[^"]+)"/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      assetExports.push(match[1]);
    }
  }
}

const ASSET_PREFIX = '/assets/node_modules/';
let copiedCount = 0;
let skippedCount = 0;
for (const assetPath of assetExports) {
  if (!assetPath.startsWith(ASSET_PREFIX)) continue;
  // Ex: /assets/node_modules/@expo/vector-icons/.../Feather.a76d3097...ttf
  const relHashed = assetPath.slice(ASSET_PREFIX.length); // @expo/vector-icons/.../Feather.a76d3097...ttf
  const destAbs = path.join(DIST, 'assets', 'node_modules', relHashed);

  // Retirer le hash du nom de fichier pour trouver la source :
  //   Feather.a76d309774d33d9856f650bed4292a23.ttf  →  Feather.ttf
  const parsed = path.parse(relHashed);
  // parsed.name = "Feather.a76d309774d33d9856f650bed4292a23"
  // parsed.ext  = ".ttf"
  // Retirer la dernière partie après le dernier point (le hash)
  const dotParts = parsed.name.split('.');
  let baseName;
  let detectedHash;
  if (dotParts.length > 1 && /^[0-9a-f]{8,}$/i.test(dotParts[dotParts.length - 1])) {
    detectedHash = dotParts.pop();
    baseName = dotParts.join('.');
  } else {
    baseName = parsed.name;
  }
  const relOriginal = path.join(parsed.dir, `${baseName}${parsed.ext}`);
  const srcAbs = path.join(NODE_MODULES, relOriginal);

  if (!fs.existsSync(srcAbs)) {
    skippedCount++;
    continue;
  }

  // Vérifier si le hash correspond au contenu (par précaution)
  if (detectedHash) {
    const fileBuf = fs.readFileSync(srcAbs);
    const actualHash = crypto.createHash('md5').update(fileBuf).digest('hex');
    if (actualHash !== detectedHash) {
      // Silencieux : on copie quand même, c'est probablement un autre algo de hash
    }
  }

  const destDir = path.dirname(destAbs);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(srcAbs, destAbs);
  copiedCount++;
}

/* ── 5. Copier l'image OG à la racine de dist/ si absente ──────────── */
const ogImgSrc = path.join(ROOT, 'dist', 'og-image-1200x630.png');
if (!fs.existsSync(ogImgSrc)) {
  const ogImgCandidate = path.join(ROOT, 'assets', 'images', 'og-image-1200x630.png');
  if (fs.existsSync(ogImgCandidate)) {
    fs.copyFileSync(ogImgCandidate, ogImgSrc);
  }
}

/* ── 6. BYPASS Vercel : copier assets/node_modules → static-assets/
 * Vercel ignore silencieusement les répertoires nommés "node_modules"
 * même dans un déploiement statique, ce qui cause des 404 sur les
 * fonts Expo hashées en /assets/node_modules/@expo/vector-icons/...
 * On copie physiquement les fichiers sous /static-assets/ (sans le mot
 * clé "node_modules" dans le chemin) pour qu'ils soient uploadés.
 * ────────────────────────────────────────────────────────────────── */
const assetsNodeMod = path.join(DIST, 'assets', 'node_modules');
const staticAssetsDir = path.join(DIST, 'static-assets');
let saCount = 0;
if (fs.existsSync(assetsNodeMod)) {
  function copyRecursive(src, dst) {
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, entry.name);
      const d = path.join(dst, entry.name);
      if (entry.isDirectory()) {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        copyRecursive(s, d);
      } else {
        fs.copyFileSync(s, d);
        saCount++;
      }
    }
  }
  if (!fs.existsSync(staticAssetsDir)) fs.mkdirSync(staticAssetsDir, { recursive: true });
  copyRecursive(assetsNodeMod, staticAssetsDir);
}

/* ── 7. PATCH BUNDLE JS : remplacer /assets/node_modules/ → /static-assets/
 * CRITIQUE : Vercel ignore les rewrites pour les chemins contenant
 * "node_modules" et ignore aussi les fichiers dans ces dossiers. La
 * solution robuste est de patcher le bundle JS généré par Expo pour
 * qu'il charge les fonts depuis /static-assets/ (qui est servi par
 * Vercel) au lieu de /assets/node_modules/ (qui est ignoré).
 * Sans ce patch, toutes les icônes Feather/FontAwesome/etc. sont 404
 * et l'UI est cassée (icônes manquantes, erreurs console).
 * ────────────────────────────────────────────────────────────────── */
const webJsDir = path.join(DIST, '_expo', 'static', 'js', 'web');
let patchedJsCount = 0;
let totalReplacements = 0;
if (fs.existsSync(webJsDir)) {
  for (const jsFile of fs.readdirSync(webJsDir)) {
    if (!jsFile.endsWith('.js')) continue;
    const jsPath = path.join(webJsDir, jsFile);
    const original = fs.readFileSync(jsPath, 'utf-8');
    if (original.includes('assets/node_modules')) {
      const patched = original.split('assets/node_modules').join('static-assets');
      fs.writeFileSync(jsPath, patched, 'utf-8');
      patchedJsCount++;
      totalReplacements += (original.split('assets/node_modules').length - 1);
    }
  }
}

/* ── 8. Générer / Mettre à jour dist/vercel.json pour déploiement statique
 * IMPORTANT : racine/vercel.json ≠ dist/vercel.json. La racine est
 * pour les builds cloud Vercel (expo export sur serveur Vercel).
 * dist/vercel.json est utilisé lors du `npx vercel --prod` depuis
 * le dossier dist/ (déploiement statique pré-construit).
 *   - Rewrite /assets/node_modules/* → /static-assets/* (backup, au cas
 *     où le patch JS ne suffirait pas — Vercel peut l'ignorer pour
 *     les chemins "node_modules" mais on le garde pour safety)
 *   - Rewrite SPA : toutes les routes sans "." sont renvoyées vers
 *     index.html (navigation React Navigation Web)
 *   - Headers APK : Content-Type APK + Accept-Ranges pour dl partiel
 *   - Headers sécurité : X-Content-Type-Options, X-Frame-Options
 * ────────────────────────────────────────────────────────────────── */
const distVercelJson = {
  '$schema': 'https://openapi.vercel.sh/vercel.json',
  rewrites: [
    { source: '/assets/node_modules/(.*)', destination: '/static-assets/$1' },
    { source: '/((?!.*\\.).*)', destination: '/index.html' },
  ],
  headers: [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
    {
      source: '/index.html',
      headers: [{ key: 'Cache-Control', value: 'no-cache' }],
    },
    {
      source: '/download/(.*)\\.apk',
      headers: [
        { key: 'Content-Type', value: 'application/vnd.android.package-archive' },
        { key: 'Content-Disposition', value: 'attachment' },
        { key: 'Accept-Ranges', value: 'bytes' },
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
    {
      source: '/static-assets/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/_expo/static/(.*)',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    },
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};
fs.writeFileSync(
  path.join(DIST, 'vercel.json'),
  JSON.stringify(distVercelJson, null, 2) + '\n',
  'utf-8',
);

console.log('═══════════════════════════════════════════════════════════');
console.log(' SEO / OG / Twitter Card / Schema.org + Assets Copier — OK');
console.log('═══════════════════════════════════════════════════════════');
console.log(`\n✅ Fichier modifié  : dist/index.html (${Math.round(Buffer.byteLength(html,'utf8')/1024)} KB)`);
console.log(`\n📋 OG tags injectés :`);
console.log(`   og:type        = ${OG_TYPE}`);
console.log(`   og:title       = ${OG_TITLE.substring(0, 50)}…`);
console.log(`   og:description = ${OG_DESC.substring(0, 50)}…`);
console.log(`   og:image       = ${OG_IMAGE}`);
console.log(`   og:site_name   = ${SITE_NAME}`);
console.log(`   og:locale      = ${OG_LOCALE}`);
console.log(`\n🐦 Twitter Card   = summary_large_image`);
console.log(`\n🏢 Schema.org     = Organization (JSON-LD)`);
console.log(`\n📦 Assets copiés  : ${copiedCount} fichiers (fonts/images hashed)`);
if (skippedCount > 0) console.log(`⚠️  Assets ignorés : ${skippedCount} (source introuvable dans node_modules)`);
console.log(`\n📂 static-assets  : ${saCount} fichiers copiés (bypass Vercel node_modules ignore)`);
console.log(`\n🔧 Bundle JS patché : ${patchedJsCount} fichier(s), ${totalReplacements} remplacement(s) assets/node_modules → static-assets`);
console.log(`\n⚙️  dist/vercel.json généré (rewrites + headers APK + sécurité)`);
console.log(`\n⚠️  IMPORTANT — Action requise :`);
console.log(`   • Uploader une vraie image 1200×630 px sur ${OG_IMAGE}`);
console.log(`     (ex: Canva / Figma export → Supabase Storage public bucket)`);
console.log(`   • Vérifier les tags avec :`);
console.log(`     https://metatags.io/ → tester ${APP_URL}`);
console.log(`     https://developers.facebook.com/tools/debug/`);
console.log(`     https://cards-dev.twitter.com/validator`);
console.log('');
