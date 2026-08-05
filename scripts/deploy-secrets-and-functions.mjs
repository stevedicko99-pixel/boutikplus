/* ================================================================
 * Boutikplus — Déploiement secrets + 3 Edge Functions
 *   via API Supabase Management (HTTPS, pas de CLI requis)
 * ================================================================
 * Méthode : POST {API_BASE}/projects/{ref}/secrets  → set secrets
 *           POST /functions/{slug} (multipart/form-data) → deploy fn
 * ================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Charger .env manuellement
const envPath = path.resolve(ROOT, '.env');
const env = fs.readFileSync(envPath, 'utf-8');
const envMap = {};
env.split(/\r?\n/).forEach((line) => {
  const idx = line.indexOf('=');
  if (idx === -1) return;
  const k = line.slice(0, idx).trim();
  const v = line.slice(idx + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  if (k && !k.startsWith('#')) { process.env[k] = v; envMap[k] = v; }
});

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const URL   = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const REF   = URL.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] || 'pxcymtjbbdrutqpbwfdo';
const API   = 'https://api.supabase.com/v1/projects';

if (!TOKEN) { console.error('❌ SUPABASE_ACCESS_TOKEN manquant'); process.exit(1); }

const HEAD = {
  'Authorization': `Bearer ${TOKEN}`,
  'Accept': 'application/json',
};

async function api(method, path, body, headers = {}) {
  const opt = { method, headers: { ...HEAD, ...headers } };
  if (body !== undefined && !(body instanceof Uint8Array || body instanceof FormData)) {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  } else if (body !== undefined) {
    opt.body = body;
  }
  const r = await fetch(`${API}/${REF}${path}`, opt);
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  if (!r.ok) throw new Error(`HTTP ${r.status} ${typeof j === 'string' ? j.substring(0,300) : JSON.stringify(j).substring(0,300)}`);
  return j;
}

// ── Étape 1 : set 3 secrets serveur ──────────────────────────────
console.log('═══════════════════════════════════════════════════════════');
console.log(' BOUTIKPLUS — DÉPLOIEMENT SECRETS + EDGE FUNCTIONS');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Projet ref: ${REF}`);
console.log(`Projet URL: ${URL}\n`);

const MISTRAL_KEY  = envMap['EXPO_PUBLIC_MISTRAL_API_KEY'];
const REMOVEBG_KEY = envMap['EXPO_PUBLIC_REMOVEBG_API_KEY'];
const APP_URL      = 'https://boutikplus.vercel.app';

console.log('── Étape 1/3 : Définir les 3 secrets serveur ──────────────');
const secretsToSet = [
  { name: 'MISTRAL_API_KEY',   value: MISTRAL_KEY  || '(EXPO_PUBLIC_MISTRAL_API_KEY non trouvé)' },
  { name: 'REMOVEBG_API_KEY',  value: REMOVEBG_KEY || '(EXPO_PUBLIC_REMOVEBG_API_KEY non trouvé)' },
  { name: 'APP_URL',           value: APP_URL },
];
try {
  // POST /v1/projects/{ref}/secrets — bulk upsert secrets
  // Supabase API accepte un tableau { name, value }[]
  for (const s of secretsToSet) {
    try {
      const res = await api('POST', '/secrets', [s]);
      console.log(`✅ secret ${s.name} = ${s.value.substring(0, 6)}…${s.value.slice(-4)} (len=${s.value.length})`);
    } catch (e) {
      // Fallback : PATCH /secrets/{name}  (ancien endpoint)
      try {
        const res2 = await api('PATCH', `/secrets/${s.name}`, { value: s.value });
        console.log(`✅ secret ${s.name} (PATCH) OK`);
      } catch (e2) {
        console.log(`⚠️  secret ${s.name} - tentative échouée: ${(e2.message || e.message).substring(0, 200)}`);
        console.log('   → Appliquez manuellement : supabase secrets set ' + s.name + '="…"');
      }
    }
  }
} catch (e) {
  console.log(`⚠️  Bulk secrets échoué : ${(e.message || '').substring(0, 200)}`);
}

// Vérifier les secrets
try {
  const list = await api('GET', '/secrets');
  const names = Array.isArray(list) ? list.map(s => s?.name || String(s).slice(0, 30)).filter(Boolean) : [];
  const want = ['MISTRAL_API_KEY','REMOVEBG_API_KEY','APP_URL'];
  console.log(`\n🔍 Secrets détectés: ${names.filter(n => want.some(w => n.includes(w)) || want.includes(n)).join(', ') || '(aucun — lister impossible)'}`);
} catch {}

// ── Étape 2 : déployer les 3 Edge Functions ─────────────────────
console.log('\n── Étape 2/3 : Déployer 3 Edge Functions (mistral-proxy, removebg-proxy, sitemap) ──');

const SUPABASE_DIR = path.resolve(ROOT, 'supabase');
const FUNCTIONS_DIR = path.resolve(SUPABASE_DIR, 'functions');

const functionsToDeploy = [
  { slug: 'mistral-proxy',  entry: path.join(FUNCTIONS_DIR, 'mistral-proxy', 'index.ts'),  verifyJwt: true  },
  { slug: 'removebg-proxy', entry: path.join(FUNCTIONS_DIR, 'removebg-proxy', 'index.ts'), verifyJwt: false }, // vérifie manuellement via JWT dans le body
  { slug: 'sitemap',        entry: path.join(FUNCTIONS_DIR, 'sitemap', 'index.ts'),        verifyJwt: false },
];

for (const fn of functionsToDeploy) {
  console.log(`\n📦 Déploiement ${fn.slug} …`);
  if (!fs.existsSync(fn.entry)) {
    console.log(`   ⚠️  Fichier introuvable : ${fn.entry}`);
    console.log('   → Vérifiez existence, ou déployez via CLI : npx supabase functions deploy ' + fn.slug);
    continue;
  }
  try {
    const codeStr = fs.readFileSync(fn.entry, 'utf-8');
    // Utiliser multipart FormData pour uploader l'entrypoint
    const fd = new FormData();
    const blob = new Blob([codeStr], { type: 'application/typescript' });
    fd.append('name', fn.slug);
    fd.append('slug', fn.slug);
    fd.append('entrypoint', path.basename(fn.entry));
    fd.append('body', blob, path.basename(fn.entry));
    fd.append('verify_jwt', String(fn.verifyJwt));

    const res = await api('POST', `/functions/${fn.slug}`, fd);
    console.log(`   ✅ ${fn.slug} déployée (id ${res?.id || '?'})`);
    const publicUrl = `${URL.replace('.supabase.co','')}.functions.supabase.co/${fn.slug}`;
    const altUrl    = `${URL}/functions/v1/${fn.slug}`;
    console.log(`      URL 1 : ${publicUrl}`);
    console.log(`      URL 2 : ${altUrl}`);
  } catch (e) {
    console.log(`   ❌ Échec API Management pour ${fn.slug} : ${(e.message || '').substring(0, 300)}`);
    console.log('      → Fallback : deployer via CLI :');
    console.log(`        npx supabase functions deploy ${fn.slug}${fn.verifyJwt ? '' : ' --no-verify-jwt'} --project-ref ${REF}`);
  }
}

// ── Étape 3 : checklist finale ───────────────────────────────
console.log('\n── Étape 3/3 : Checklist déploiement Edge Functions ─────');
console.log('');
console.log('   Commande CLI UNIVERSELLE (si API Management a échoué sur 1 fonction) :');
console.log('   ─────────────────────────────────────────────────────────');
console.log(`   cd "${ROOT}"`);
console.log('   $env:SUPABASE_ACCESS_TOKEN="' + TOKEN.substring(0,10) + '…"');
console.log(`   npx supabase secrets set MISTRAL_API_KEY="${MISTRAL_KEY ? MISTRAL_KEY.substring(0,6)+'…' : '(clé)'}"`);
console.log(`   npx supabase secrets set REMOVEBG_API_KEY="${REMOVEBG_KEY ? REMOVEBG_KEY.substring(0,6)+'…' : '(clé)'}"`);
console.log(`   npx supabase secrets set APP_URL="${APP_URL}"`);
console.log('   npx supabase functions deploy mistral-proxy  --project-ref ' + REF);
console.log('   npx supabase functions deploy removebg-proxy --project-ref ' + REF + ' --no-verify-jwt');
console.log('   npx supabase functions deploy sitemap        --project-ref ' + REF + ' --no-verify-jwt');
console.log('');
console.log('   Test curl rapide (après déploiement) :');
const anon = envMap['EXPO_PUBLIC_SUPABASE_ANON_KEY'] || 'ANON_KEY';
console.log(`   curl -X POST '${URL}/functions/v1/mistral-proxy' \\`);
console.log(`        -H 'Authorization: Bearer ${anon.substring(0,12)}…' \\`);
console.log(`        -H 'Content-Type: application/json' \\`);
console.log(`        -d '{"systemPrompt":"Répondre en français","userPrompt":"Bonjour"}'`);
console.log('');
console.log('═══════════════════════════════════════════════════════════');
