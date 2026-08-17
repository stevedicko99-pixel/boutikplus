/* ================================================================
 * Boutikplus — Fix global admin, boutiques
 * API Management = portail Supabase.
 * POST database/query = SQL brut (SUPERUSER)
 * POST auth/admin = création/màj users auth (PAT = sbp_xxx OK)
 * ================================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf-8');
  env.split(/\r?\n/).forEach((line) => {
    const [k, ...rest] = line.split('=');
    if (!k || k.startsWith('#')) return;
    const v = rest.join('=').trim();
    if (v.startsWith('"') && v.endsWith('"')) process.env[k.trim()] = v.slice(1, -1);
    else if (v.startsWith("'") && v.endsWith("'")) process.env[k.trim()] = v.slice(1, -1);
    else process.env[k.trim()] = v;
  });
}

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN; // PAT sbp_xxx
const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'pxcymtjbbdrutqpbwfdo';

const ADMIN_EMAIL = 'stevedicko98@gmail.com';
const ADMIN_PASSWORD = 'iiJ&C42dSh$3f2S#';
const ADMIN_FULL_NAME = 'DICKO Christ Steve';
const ADMIN_PHONE = '+8615952717063';
const ADMIN_CITY = 'Ouagadougou';
const KEEP_SHOP_NAME = 'Constance Bridge'; // "Constance" avec un C comme dans la BDD

/* ----------------------- helpers ----------------------- */
// API Management (portail) : PAT suffit
const mgmt = (method, p, body) => fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}${p}`, {
  method,
  headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
  ...(body ? { body: JSON.stringify(body) } : {}),
}).then(async (r) => {
  const t = await r.text();
  try { return { ok: r.ok, status: r.status, data: JSON.parse(t) }; }
  catch { return { ok: r.ok, status: r.status, data: t }; }
});

const runSql = (query) => mgmt('POST', '/database/query', { query });

/* ----------------------- main ----------------------- */
async function main() {
  if (!ACCESS_TOKEN) {
    console.error('❌ SUPABASE_ACCESS_TOKEN (PAT sbp_xxx) manquant dans .env');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════');
  console.log(' FIX ADMIN + SUPPR BOUTIQUES');
  console.log('═══════════════════════════════════════════\n');

  /* ------- 1. Créer/mettre à jour user auth ADMIN via API Management ------- */
  console.log('🔍 Étape 1 : création / màj user auth admin via API Management...');

  // a) Lister via /auth/admin/users sur l'API Management
  const listResp = await mgmt('GET', `/auth/admin/users?page=1&per_page=1000`);
  if (!listResp.ok) {
    console.error('❌ Liste users échouée:', listResp.status, JSON.stringify(listResp.data).slice(0, 300));
    process.exit(1);
  }
  const users = listResp.data?.users ?? listResp.data ?? [];
  console.log(`   ${users.length} users auth trouvés`);
  const adminAuth = users.find(u => u.email === ADMIN_EMAIL);
  let userId = adminAuth?.id;

  if (!adminAuth) {
    console.log('   ➖ Compte absent — création via /auth/admin/users');
    const c = await mgmt('POST', '/auth/admin/users', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_FULL_NAME },
      app_metadata: {},
    });
    if (!c.ok) { console.error('   ❌ Création échouée:', c.status, JSON.stringify(c.data).slice(0, 300)); process.exit(1); }
    userId = c.data?.id;
    console.log('   ✅ Créé:', userId);
  } else {
    userId = adminAuth.id;
    console.log('   ✅ Trouvé:', userId);
    // b) Forcer password et confirmer email
    const up = await mgmt('PUT', `/auth/admin/users/${userId}`, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      phone_confirm: adminAuth.phone ? true : undefined,
    });
    if (up.ok) console.log('   ✅ Password mis à jour:', ADMIN_PASSWORD);
    else console.log('   ⚠️ Password:', JSON.stringify(up.data).slice(0, 200));
  }

  /* ------- 2. Créer/MAJ profil admin SQL + rôles ------- */
  console.log('\n🛡️  Étape 2 : profil + rôles (SQL brut SUPERUSER)...');

  const checkPf = await runSql(`SELECT * FROM profiles WHERE id = '${userId}';`);
  const pfRows = Array.isArray(checkPf.data) ? checkPf.data : [];

  const emailEsc = ADMIN_EMAIL.replace(/'/g, "''");
  const nameEsc = ADMIN_FULL_NAME.replace(/'/g, "''");
  const phoneEsc = ADMIN_PHONE.replace(/'/g, "''");
  const cityEsc = ADMIN_CITY.replace(/'/g, "''");

  if (pfRows.length === 0) {
    console.log('   ➖ Profil manquant — INSERT');
    await runSql(`
      INSERT INTO profiles (id, full_name, email, phone, city, roles, primary_role, role)
      VALUES ('${userId}', '${nameEsc}', '${emailEsc}', '${phoneEsc}', '${cityEsc}',
              ARRAY['admin','seller','buyer']::TEXT[], 'admin', 'admin');
    `);
  } else {
    console.log('   ➖ Profil existant — UPDATE roles+primary_role+role');
    await runSql(`
      UPDATE profiles SET
        full_name = '${nameEsc}',
        email     = '${emailEsc}',
        phone     = '${phoneEsc}',
        city      = '${cityEsc}',
        roles     = ARRAY['admin','seller','buyer']::TEXT[],
        primary_role = 'admin',
        role      = 'admin'
      WHERE id = '${userId}';
    `);
  }

  const after = await runSql(`SELECT id, full_name, role, primary_role, roles FROM profiles WHERE id = '${userId}';`);
  console.log('   ✅ État final profil:', JSON.stringify(Array.isArray(after.data) ? after.data[0] : after.data));

  /* ------- 3. Trouver boutique Constance Bridge ------- */
  console.log('\n🛒 Étape 3 : supprimer toutes les boutiques SAUF "%s"...', KEEP_SHOP_NAME);
  const allShops = await runSql(`SELECT id, name FROM shops;`);
  const shops = Array.isArray(allShops.data) ? allShops.data : [];
  console.log('   Total boutiques:', shops.length);
  for (const s of shops) console.log('     -', s.name, `(${s.id.slice(0, 8)}...)`);

  // "Constance Bridge" ou "Constant Bridge" — essayer les deux
  let keep = shops.find(s => s.name && s.name.trim() === KEEP_SHOP_NAME)
          || shops.find(s => s.name && s.name.trim() === 'Constant Bridge');

  if (!keep) {
    console.log(`   ⚠️  Aucune boutique "${KEEP_SHOP_NAME}" (ni "Constant Bridge") trouvée. On garde toutes les boutiques pour éviter 0.`);
  } else {
    const toDelete = shops.filter(s => s.id !== keep.id);
    console.log(`   ✅ Garder: ${keep.name} (${keep.id.slice(0, 8)}...)`);
    console.log(`   🗑️  Supprimer: ${toDelete.length} boutiques`);

    if (toDelete.length > 0) {
      const ids = toDelete.map(s => `'${s.id}'`).join(', ');
      await runSql(`DELETE FROM shops WHERE id IN (${ids});`);
      const remaining = await runSql(`SELECT id, name FROM shops;`);
      const rows = Array.isArray(remaining.data) ? remaining.data : [];
      console.log(`   ✅ Suppression OK. ${rows.length} boutique(s) restante(s):`);
      for (const s of rows) console.log('     -', s.name);
    } else {
      console.log('   ✅ Rien à supprimer.');
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log(' TERMINÉ');
  console.log('═══════════════════════════════════════════');
  console.log('📧 Admin email   :', ADMIN_EMAIL);
  console.log('🔑 Admin password:', ADMIN_PASSWORD);
  console.log('🛡️  Roles         : admin / seller / buyer');
  console.log('🛒 Boutique gardée:', keep ? keep.name : 'Toutes (aucune correspondance)');
  console.log('═══════════════════════════════════════════');
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
