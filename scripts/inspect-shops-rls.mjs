// Inspect: politiques RLS sur la table shops
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
if (!SBP) { console.error('missing SUPABASE_ACCESS_TOKEN'); process.exit(1); }
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
  // 1. RLS activé ?
  const r1 = await mgmt(`SELECT c.relname, c.relrowsecurity
                         FROM pg_class c
                         JOIN pg_namespace n ON n.oid = c.relnamespace
                         WHERE n.nspname = 'public' AND c.relname = 'shops';`);
  console.log('RLS activé sur shops ?', JSON.stringify(r1.data));

  // 2. Politiques RLS
  const r2 = await mgmt(`
    SELECT policyname, cmd, qual, with_check, roles
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shops'
    ORDER BY cmd, policyname;
  `);
  console.log('\nPolitiques RLS sur shops:');
  r2.data.forEach(p => {
    console.log(`\n  [${p.cmd}] ${p.policyname}  (roles: ${p.roles})`);
    console.log(`    USING  : ${p.qual ?? '(aucun)'}`);
    console.log(`    WITH   : ${p.with_check ?? '(aucun)'}`);
  });

  // 3. Politiques sur products (pour deleteShop cascade)
  const r3 = await mgmt(`
    SELECT policyname, cmd, qual, roles
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
    ORDER BY cmd, policyname;
  `);
  console.log('\n\nPolitiques RLS sur products:');
  r3.data.forEach(p => {
    console.log(`\n  [${p.cmd}] ${p.policyname}  (roles: ${p.roles})`);
    console.log(`    USING  : ${p.qual ?? '(aucun)'}`);
  });

  // 4. Politiques sur shop_follows, promotions, reviews, etc.
  for (const t of ['product_images', 'product_videos', 'shop_follows', 'promotions', 'share_links', 'discount_codes', 'reviews', 'campaign_events']) {
    const r = await mgmt(`SELECT policyname, cmd, qual, roles FROM pg_policies WHERE schemaname = 'public' AND tablename = '${t}' ORDER BY cmd, policyname;`);
    if (r.data.length) {
      console.log(`\n\nPolitiques RLS sur ${t}:`);
      r.data.forEach(p => {
        console.log(`  [${p.cmd}] ${p.policyname}  (roles: ${p.roles})  USING: ${p.qual ?? '(aucun)'}`);
      });
    } else {
      console.log(`\n\n⚠️ ${t}: AUCUNE politique RLS`);
    }
  }
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
