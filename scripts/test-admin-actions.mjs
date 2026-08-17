// Test réel des actions admin: rejectShop + deleteShop avec JWT admin
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

const SBP = process.env.SUPABASE_ACCESS_TOKEN;
const PID = process.env.SUPABASE_PROJECT_ID || 'pxcymtjbbdrutqpbwfdo';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const ADMIN_EMAIL = 'stevedicko98@gmail.com';
const ADMIN_PASSWORD = 'iiJ&C42dSh$3f2S#';

const mgmt = async (sql) => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PID}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SBP}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const t = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(t) }; }
  catch { return { ok: res.ok, status: res.status, data: t }; }
};

async function main() {
  // 1. Vérifier la fonction is_admin()
  const rFn = await mgmt(`
    SELECT p.proname, pg_get_functiondef(p.oid) as definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_admin';
  `);
  console.log('🔍 Fonction is_admin():');
  rFn.data.forEach(f => console.log(f.definition));

  // 2. SignIn admin
  const signin = await (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })).json();
  if (!signin.access_token) { console.error('❌ SignIn fail:', signin); process.exit(1); }
  const JWT = signin.access_token;
  const UID = signin.user.id;
  console.log('\n✅ Admin connecté:', UID);

  // 3. Vérifier is_admin() avec RPC (postgrest) en contexte JWT admin
  const rpcResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_admin`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${JWT}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const rpcData = await rpcResp.json();
  console.log('\n🔍 is_admin() via RPC (JWT admin):', rpcResp.status, rpcData);

  // 4. Vérifier le profil admin tel que vu par RLS
  const profResp = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${UID}&select=id,role,primary_role,roles`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${JWT}` },
  });
  const profData = await profResp.json();
  console.log('🔍 Profil admin (via REST):', profData);

  // 5. Vérifier le type enum user_role
  const rEnum = await mgmt(`SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname = 'user_role' ORDER BY e.enumsortorder;`);
  console.log('🔍 Enum user_role:', rEnum.data.map(e => e.enumlabel));

  // 6. Créer une boutique de test pour tester reject + delete (via REST, owner = admin)
  console.log('\n🛠️ Création boutique de test via REST...');
  const createResp = await fetch(`${SUPABASE_URL}/rest/v1/shops`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${JWT}`,
      'Content-Type': 'application/json',
      prefer: 'return=representation',
    },
    body: JSON.stringify({
      owner_id: UID,
      name: 'TEST ADMIN ACTIONS',
      description: 'Boutique temporaire pour test',
      category_id: 'accessoires',
      city: 'Ouaga',
      status: 'pending',
    }),
  });
  const createData = await createResp.json();
  console.log('   HTTP', createResp.status, '|', JSON.stringify(createData).slice(0, 500));
  if (!createResp.ok || !Array.isArray(createData) || !createData.length) {
    console.log('   ❌ Création échouée, abort');
    process.exit(1);
  }
  const testShop = createData[0];
  console.log('   ✅ Boutique test créée:', testShop.id, testShop.name);

  // 5. TEST rejectShop via REST (comme dataService.rejectShop)
  console.log('\n🚫 TEST rejectShop (status → rejected)...');
  const rejectResp = await fetch(`${SUPABASE_URL}/rest/v1/shops?id=eq.${testShop.id}`, {
    method: 'PATCH',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${JWT}`,
      'Content-Type': 'application/json',
      prefer: 'return=representation',
    },
    body: JSON.stringify({ status: 'rejected', rejection_reason: 'Test refus admin', updated_at: new Date().toISOString() }),
  });
  const rejectData = await rejectResp.json();
  console.log('   HTTP', rejectResp.status, '| ok=', rejectResp.ok);
  console.log('   Response:', JSON.stringify(rejectData).slice(0, 500));
  if (!rejectResp.ok || !Array.isArray(rejectData) || rejectData.length === 0) {
    console.log('   ⚠️  REJET ÉCHOUÉ (0 ligne ou erreur)');
  } else {
    console.log('   ✅ Rejet OK');
  }

  // 6. TEST deleteShop via REST (comme dataService.deleteShop)
  console.log('\n🗑️ TEST deleteShop...');
  // D'abord les sous-tables (comme dataService)
  const subTables = [
    { table: 'product_videos', filter: 'product_id', sub: true },
    { table: 'product_images', filter: 'product_id', sub: true },
    { table: 'products', filter: 'shop_id', sub: false },
    { table: 'shop_follows', filter: 'shop_id', sub: false },
    { table: 'promotions', filter: 'shop_id', sub: false },
    { table: 'share_links', filter: 'shop_id', sub: false },
    { table: 'discount_codes', filter: 'shop_id', sub: false },
    { table: 'reviews', filter: 'shop_id', sub: false },
    { table: 'campaign_events', filter: 'shop_id', sub: false },
  ];
  for (const t of subTables) {
    let url, method = 'DELETE';
    if (t.sub) {
      // Récupérer les product_ids d'abord
      const prodResp = await fetch(`${SUPABASE_URL}/rest/v1/products?shop_id=eq.${testShop.id}&select=id`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${JWT}` },
      });
      const prods = await prodResp.json();
      const ids = (prods || []).map(p => p.id);
      if (ids.length === 0) { console.log(`   ${t.table}: 0 produits → skip`); continue; }
      url = `${SUPABASE_URL}/rest/v1/${t.table}?${t.filter}=in.(${ids.join(',')})`;
    } else {
      url = `${SUPABASE_URL}/rest/v1/${t.table}?${t.filter}=eq.${testShop.id}`;
    }
    const r = await fetch(url, {
      method: 'DELETE',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${JWT}`, prefer: 'return=representation' },
    });
    const count = r.headers.get('content-range');
    console.log(`   ${t.table}: HTTP ${r.status} | ${count || '?'}`);
  }

  // Enfin shops.delete()
  const delResp = await fetch(`${SUPABASE_URL}/rest/v1/shops?id=eq.${testShop.id}`, {
    method: 'DELETE',
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${JWT}`, prefer: 'return=representation' },
  });
  const delData = await delResp.json();
  console.log(`   shops: HTTP ${delResp.status} |`, JSON.stringify(delData).slice(0, 500));
  if (delResp.ok && Array.isArray(delData) && delData.length > 0) {
    console.log('   ✅ Suppression OK');
  } else {
    console.log('   ❌ Suppression ÉCHOUÉE');
  }

  // 7. Vérifier en base
  const rCheck = await mgmt(`SELECT id, name, status FROM shops WHERE name = 'TEST ADMIN ACTIONS';`);
  console.log('\n🔍 Vérification finale en base:', rCheck.data.length ? rCheck.data : '(supprimée ✓)');
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
