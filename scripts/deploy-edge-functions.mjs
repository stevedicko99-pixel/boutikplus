/* ====================================================================
 * Boutikplus — Déploiement Edge Functions Supabase + Secrets
 * ====================================================================
 * Ce script vérifie et liste les commandes CLI à exécuter pour :
 *   1. Installer / mettre à jour Supabase CLI
 *   2. Lier le projet distant (supabase link)
 *   3. Injecter les 3 secrets serveur (MISTRAL, REMOVEBG, APP_URL)
 *   4. Déployer les 8 Edge Functions (dont 3 nouvelles)
 *
 * Exécution recommandée : copier-coller les commandes listées ci-dessous
 * dans un terminal où Supabase CLI est installé et authentifié.
 * ==================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SUPABASE_DIR = path.resolve(ROOT, 'supabase');
const FUNCTIONS_DIR = path.resolve(SUPABASE_DIR, 'functions');

// ── Load .env manuel ──
const envPath = path.resolve(ROOT, '.env');
let REF = 'pxcymtjbbdrutqpbwfdo';
try {
  const env = fs.readFileSync(envPath, 'utf-8');
  env.split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    if (k === 'EXPO_PUBLIC_SUPABASE_URL') {
      const m = v.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
      if (m) REF = m[1];
    }
  });
} catch { /* .env absent, on garde la valeur par défaut */ }

console.log('═══════════════════════════════════════════════════════════');
console.log(' BOUTIKPLUS — DÉPLOIEMENT EDGE FUNCTIONS');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Projet Supabase: ${REF}`);
console.log('');

// ── 0. Vérifier présence CLI ──────────────────────────────────────────
console.log('── 0. PRÉREQUIS ─────────────────────────────────────────────────────');
console.log('');
console.log('   [ ] npm install -g supabase              # si CLI non installé');
console.log('   [ ] supabase login                        # si pas authentifié');
console.log(`   [ ] supabase link --project-ref ${REF}   # si projet pas lié`);
console.log('');

// ── 1. Secrets serveur ────────────────────────────────────────────────
console.log('── 1. SECRETS SERVEUR (OBLIGATOIRES pour IA + SEO) ──────────────────');
console.log('');
console.log('   # ⚠️  Remplacer les valeurs VRAIES après chaque =');
console.log('   # Mistral: https://console.mistral.ai/api-keys/');
console.log('   # Remove.bg: https://www.remove.bg/api (gratuit 50 req/mois)');
console.log('   # APP_URL: URL publique de votre app web');
console.log('');
console.log('   supabase secrets set MISTRAL_API_KEY=sk_prod_XXXXXXXXXXXXXXXX');
console.log('   supabase secrets set REMOVEBG_API_KEY=XXXXXXXXXXXXXXXXXXXXXXX');
console.log('   supabase secrets set APP_URL=https://boutikplus.app');
console.log('');
console.log('   # Vérifier:');
console.log('   supabase secrets list');
console.log('');

// ── 2. Déployer Edge Functions ────────────────────────────────────────
const functions = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(FUNCTIONS_DIR, d.name, 'index.ts')))
  .map((d) => d.name)
  .sort();

console.log('── 2. DÉPLOIEMENT DES EDGE FUNCTIONS ─────────────────────────────────');
console.log('');
console.log(`   ${functions.length} fonctions détectées dans supabase/functions/ :`);
functions.forEach((name) => {
  console.log(`   • ${name}`);
});
console.log('');
console.log('   # Déployer chaque fonction individuellement :');
for (const name of functions) {
  const noVerify = ['sitemap', 'payment-webhook', 'cleanup-expired-data'].includes(name);
  const flag = noVerify ? '--no-verify-jwt' : '';
  console.log(`   supabase functions deploy ${name} ${flag}`.trim());
}
console.log('');
console.log('   # Ou déployer TOUTES d\'un coup:');
console.log('   supabase functions deploy --all');
console.log('');

// ── 3. Smoke tests ────────────────────────────────────────────────────
console.log('── 3. SMOKE TESTS POST-DÉPLOIEMENT ───────────────────────────────────');
console.log('');
console.log('   # a/ Sitemap (public, sans auth) — doit retourner du XML:');
console.log(`   curl -i https://${REF}.supabase.co/functions/v1/sitemap`);
console.log('');
console.log('   # b/ Mistral proxy (auth requis) — retour 401 si non authentifié:');
console.log(`   curl -i -X POST https://${REF}.supabase.co/functions/v1/mistral-proxy \\`);
console.log(`        -H "Content-Type: application/json" \\`);
console.log(`        -d '{"systemPrompt":"Tu es expert","userPrompt":"Bonjour","maxTokens":50}'`);
console.log(`        # Doit retourner 401 (Bearer JWT manquant) ou 200 avec JWT valide`);
console.log('');

// ── 4. Commandes utiles ───────────────────────────────────────────────
console.log('── 4. COMMANDES UTILES ────────────────────────────────────────────────');
console.log('');
console.log('   # Lister les fonctions déployées:');
console.log('   supabase functions list');
console.log('');
console.log('   # Voir les logs d\'une fonction (debug en temps réel):');
console.log('   supabase functions logs mistral-proxy');
console.log('   supabase functions logs removebg-proxy');
console.log('');
console.log('   # Supprimer un secret (si besoin):');
console.log('   supabase secrets unset NOM_DU_SECRET');
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log(' FIN — Copiez les commandes nécessaires dans un terminal.');
console.log('═══════════════════════════════════════════════════════════');
