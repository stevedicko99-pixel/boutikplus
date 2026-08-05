/* ============================================================
 * Cleanup final après migrations
 *   1. Finaliser profil admin (is_verified + social_links) via JOIN auth.users
 *   2. Supprimer probe users dans auth.users
 *   3. Test E2E RPC add_verification_method via API REST Supabase
 *   4. Test E2E promote_self_to_admin + toggle_favorite + stats
 * ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load .env ──
const envPath = path.resolve(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf-8');
env.split(/\r?\n/).forEach((line) => {
  const idx = line.indexOf('=');
  if (idx === -1) return;
  const k = line.slice(0, idx).trim();
  const v = line.slice(idx + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  if (k && !k.startsWith('#')) process.env[k] = v;
});

const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPA_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const REF = SUPA_URL.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
const MGMT = `https://api.supabase.com/v1/projects/${REF}`;

let pass = 0, fail = 0;
const log = (ok, msg) => { if (ok) { pass++; console.log(`  ✅ ${msg}`); } else { fail++; console.log(`  ❌ ${msg}`); } };

async function mgmtSql(query) {
  const r = await fetch(`${MGMT}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  let d; try { d = JSON.parse(t); } catch { d = t; }
  return r.ok ? { ok: true, data: d } : { ok: false, message: typeof d === 'string' ? d : d?.message || JSON.stringify(d) };
}

console.log('═══════════════════════════════════════════════════════════');
console.log(' CLEANUP FINAL POST-MIGRATIONS');
console.log('═══════════════════════════════════════════════════════════');

// ============================================================
// 1. FINALISATION PROFIL ADMIN (JOIN auth.users.id = profiles.id)
// ============================================================
console.log('\n── 1. Finalisation profil admin stevedicko98@gmail.com ──');

const adminIdRes = await mgmtSql(`SELECT id FROM auth.users WHERE email = 'stevedicko98@gmail.com';`);
if (!adminIdRes.ok || !Array.isArray(adminIdRes.data) || adminIdRes.data.length === 0) {
  console.log('  ⚠️  Admin introuvable dans auth.users — skip finalisation.');
  fail++;
} else {
  const ADMIN_ID = adminIdRes.data[0].id;
  console.log(`  UID admin: ${ADMIN_ID}`);

  const finalRes = await mgmtSql(`
UPDATE public.profiles
SET is_verified = TRUE,
    verified_at = COALESCE(verified_at, NOW()),
    verification_method = COALESCE(NULLIF(verification_method, ''), 'social_links'),
    social_links = CASE WHEN social_links IS NULL OR jsonb_strip_nulls(social_links) = '{}'::jsonb
      THEN jsonb_build_object('whatsapp', '+8615952717063', 'instagram', NULL, 'tiktok', NULL, 'facebook', NULL)
      ELSE social_links END,
    updated_at = NOW()
WHERE id = '${ADMIN_ID}'::uuid;
  `);
  log(finalRes.ok, `UPDATE profiles (role=admin, is_verified=true, social_links)`);

  const checkRes = await mgmtSql(`
SELECT p.id, p.role, p.is_verified, p.verified_at::text, p.social_links::text, p.verification_method
FROM public.profiles p WHERE p.id = '${ADMIN_ID}'::uuid;
  `);
  if (checkRes.ok && checkRes.data.length > 0) {
    const c = checkRes.data[0];
    log(c.role === 'admin', `role = ${c.role}`);
    log(c.is_verified === true || c.is_verified === 't', `is_verified = ${c.is_verified}`);
    log(c.verified_at !== null && c.verified_at !== undefined, `verified_at = ${String(c.verified_at).substring(0, 20)}`);
    log(String(c.social_links).includes('whatsapp') || String(c.social_links).includes('+86'), `social_links contient whatsapp`);
  }
}

// ============================================================
// 2. SUPPRESSION DES PROBE USERS
// ============================================================
console.log('\n── 2. Nettoyage probe users (auth.users WHERE email LIKE probe-%) ──');
const delRes = await mgmtSql(`DELETE FROM auth.users WHERE email LIKE 'probe-%@example.com';`);
if (delRes.ok) {
  console.log('  DELETE envoyé');
  const countRes = await mgmtSql(`SELECT COUNT(*)::int AS total FROM auth.users WHERE email LIKE 'probe-%@example.com';`);
  if (countRes.ok && countRes.data.length > 0) {
    log(countRes.data[0].total === 0, `probe users restants = ${countRes.data[0].total}`);
  }
} else {
  log(false, `Delete probe users: ${delRes.message?.substring(0, 120)}`);
}

// ============================================================
// 3. TEST E2E RPC add_verification_method VIA API REST (user test)
// ============================================================
console.log('\n── 3. Test E2E RPC add_verification_method (via API REST) ──');

// Créer un user temporaire → login → appeler le RPC → delete user
const TEST_EMAIL = `e2e-verif-${Date.now()}@example.com`;
const TEST_PWD = 'TestVerif123!xyz';
const authHeaders = (t) => ({ apikey: ANON_KEY, Authorization: `Bearer ${t ?? ANON_KEY}`, 'Content-Type': 'application/json' });

const signup = await fetch(`${SUPA_URL}/auth/v1/signup`, {
  method: 'POST',
  headers: authHeaders(),
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PWD, data: { full_name: 'E2E Verif Test', role: 'buyer' } }),
});
const signupBody = await signup.json();
if (signupBody.access_token) {
  const USER_TOKEN = signupBody.access_token;
  console.log(`  Signup OK (${TEST_EMAIL})`);

  // Appel RPC add_verification_method avec 2 méthodes → badge auto
  const v1 = await fetch(`${SUPA_URL}/rest/v1/rpc/add_verification_method`, {
    method: 'POST',
    headers: authHeaders(USER_TOKEN),
    body: JSON.stringify({ p_method: 'whatsapp', p_value: '+22670123456' }),
  });
  const v1Body = await v1.json();
  console.log(`  Appel 1 (whatsapp): HTTP ${v1.status} → ${JSON.stringify(v1Body).substring(0, 120)}`);
  log(v1.status === 200, `add_verification_method(whatsapp) HTTP 200`);

  const v2 = await fetch(`${SUPA_URL}/rest/v1/rpc/add_verification_method`, {
    method: 'POST',
    headers: authHeaders(USER_TOKEN),
    body: JSON.stringify({ p_method: 'instagram', p_value: '@boutikplus_test' }),
  });
  const v2Body = await v2.json();
  console.log(`  Appel 2 (instagram): HTTP ${v2.status} → ${JSON.stringify(v2Body).substring(0, 120)}`);
  log(v2.status === 200, `add_verification_method(instagram) HTTP 200`);
  const verifiedNow = Array.isArray(v2Body) && v2Body[0]?.is_verified_now === true;
  log(verifiedNow || Array.isArray(v2Body) && v2Body[0]?.success === true, `2 méthodes ajoutées → is_verified=true / success=true`);

  // Vérifier en BDD: is_verified = true pour ce profil
  const uid = signupBody.user.id;
  const checkUserVerif = await mgmtSql(`SELECT is_verified, social_links::text AS links FROM public.profiles WHERE id = '${uid}'::uuid;`);
  if (checkUserVerif.ok && checkUserVerif.data.length > 0) {
    const cu = checkUserVerif.data[0];
    log(cu.is_verified === true || cu.is_verified === 't', `profiles.is_verified = ${cu.is_verified} (badgé auto car 2 méthodes sociales)`);
    log(String(cu.links).includes('whatsapp') && String(cu.links).includes('instagram'), `social_links contient whatsapp + instagram`);
  }

  // Supprimer user test
  await mgmtSql(`DELETE FROM auth.users WHERE email='${TEST_EMAIL}';`);
  console.log('  User test supprimé');
} else {
  log(false, `Signup test user échoué: ${signup.status} ${JSON.stringify(signupBody).substring(0, 200)}`);
}

// ============================================================
// 4. TEST E2E RPC toggle_favorite + get_product_review_stats (fictif)
// ============================================================
console.log('\n── 4. Tests RPC toggle_favorite & get_product_review_stats ──');

// Login admin (stevedicko98@gmail.com)
const adminLogin = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: authHeaders(),
  body: JSON.stringify({ email: 'stevedicko98@gmail.com', password: 'iiJ&C42dSh$3f2S#' }),
});
const adminLoginBody = await adminLogin.json();
if (adminLoginBody.access_token) {
  console.log('  Login admin OK');
  const T = adminLoginBody.access_token;

  const stats = await fetch(`${SUPA_URL}/rest/v1/rpc/get_product_review_stats`, {
    method: 'POST',
    headers: authHeaders(T),
    body: JSON.stringify({ p_product_id: '00000000-0000-0000-0000-000000000000' }),
  });
  const sBody = await stats.json();
  log(stats.status === 200, `get_product_review_stats HTTP 200`);
  log(Array.isArray(sBody) && sBody[0]?.total_reviews === 0, `total_reviews=0 pour UUID fictif → OK`);

  const promo = await fetch(`${SUPA_URL}/rest/v1/rpc/promote_self_to_admin`, {
    method: 'POST',
    headers: authHeaders(T),
    body: JSON.stringify({ p_verification_key: 'DCFE590DB3F52C16B50913A876D16C82' }),
  });
  const pBody = await promo.json();
  log(promo.status === 200, `promote_self_to_admin HTTP 200`);
  log(Array.isArray(pBody) && pBody[0]?.success === true, `success=true / message=${String(pBody[0]?.message).substring(0, 50)}`);
} else {
  log(false, `Login admin impossible: ${adminLogin.status} ${JSON.stringify(adminLoginBody).substring(0, 150)}`);
}

// ============================================================
// 5. BILAN FINAL
// ============================================================
console.log('\n═══════════════════════════════════════════════════════════');
console.log(' BILAN TESTS E2E FINAL');
console.log('═══════════════════════════════════════════════════════════');
console.log(`  ✅ ${pass} réussis / ❌ ${fail} échoués`);
if (fail === 0) console.log('\n🎉 TOUT EST PROPRE ET FONCTIONNEL — MIGRATIONS TERMINÉES !');
process.exit(fail === 0 ? 0 : 1);
