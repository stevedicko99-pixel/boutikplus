// Test update shop: patch owner_id=ca0ca983 shop (Constance Bridge) avec la logo_url venant d'être uploadée.
// Utilise le JWT user authentifié (même flow que l'app).
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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const ADMIN_EMAIL = 'stevedicko98@gmail.com';
const ADMIN_PASSWORD = 'iiJ&C42dSh$3f2S#';

const FAKE_LOGO_URL = 'https://pxcymtjbbdrutqpbwfdo.supabase.co/storage/v1/object/public/shop-logos/ca0ca983-f224-49b9-9604-f773d652260c/authtest_1785968014715_a98a27.jpg';
const FAKE_COVER_URL = 'https://pxcymtjbbdrutqpbwfdo.supabase.co/storage/v1/object/public/shop-covers/ca0ca983-f224-49b9-9604-f773d652260c/authtest_1785968016520_be2138.jpg';

async function main() {
  // 1. SignIn
  const signinResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, gotrue_meta_security: {} }),
  });
  const signin = await signinResp.json();
  if (!signinResp.ok) { console.error('❌ SignIn fail:', signin); process.exit(1); }
  const JWT = signin.access_token;
  const UID = signin.user.id;
  console.log('✅ SignIn:', UID, signin.user.email);

  // 2. GET ma boutique (owner_id = moi) — sélectionner banner_url (la vraie colonne)
  const getResp = await fetch(`${SUPABASE_URL}/rest/v1/shops?owner_id=eq.${UID}&select=id,name,logo_url,banner_url`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${JWT}` },
  });
  const shops = await getResp.json();
  console.log('\n📋 Mes boutiques:', shops.length, JSON.stringify(shops).slice(0, 800));
  if (!Array.isArray(shops) || !shops.length) { console.error('❌ Pas de boutique pour moi'); process.exit(1); }
  const SHOP_ID = shops[0].id;

  // 3. SIMULATION dataService.updateShop():
  //    L'APPELANT passe { cover_url: ..., logo_url: ... } → le SERVICE renomme
  //    cover_url → banner_url avant le .update().
  const rawPayload = {
    logo_url: FAKE_LOGO_URL,
    cover_url: FAKE_COVER_URL,
    slogan: 'Le slogan test',
    phone_number: '+22601020304',
    city: 'Ouagadougou',
  };
  const finalPayload = {};
  Object.keys(rawPayload).forEach(k => {
    if (rawPayload[k] === undefined) return;
    finalPayload[k === 'cover_url' ? 'banner_url' : k] = rawPayload[k];
  });

  console.log('\n🛠️ PATCH shops.id =', SHOP_ID);
  console.log('   payload brut:', JSON.stringify(rawPayload));
  console.log('   payload envoyé (après renommage):', JSON.stringify(finalPayload));

  const patchResp = await fetch(`${SUPABASE_URL}/rest/v1/shops?id=eq.${SHOP_ID}`, {
    method: 'PATCH',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${JWT}`,
      'Content-Type': 'application/json',
      prefer: 'return=representation',
    },
    body: JSON.stringify(finalPayload),
  });
  const patchData = await patchResp.json();
  console.log('\nPATCH HTTP', patchResp.status);
  if (!patchResp.ok) { console.error('❌', JSON.stringify(patchData).slice(0, 800)); process.exit(1); }
  console.log('   →', JSON.stringify(patchData).slice(0, 800));

  console.log('\n✅ Re-lecture boutique:');
  const r2 = await fetch(`${SUPABASE_URL}/rest/v1/shops?id=eq.${SHOP_ID}&select=id,name,logo_url,banner_url,slogan,phone_number,city`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${JWT}` },
  });
  console.log('HTTP', r2.status, JSON.stringify(await r2.json(), null, 2));
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
