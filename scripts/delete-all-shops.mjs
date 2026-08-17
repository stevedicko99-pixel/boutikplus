// Supprimer TOUTES les boutiques (avec leurs produits et dépendances)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split(/\r?\n/).forEach((line) => {
    const [k, ...rest] = line.split('=');
    if (!k || k.startsWith('#')) return;
    const v = rest.join('=').trim();
    process.env[k.trim()] = v.replace(/^["']|["']$/g, '');
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
  // 1. Compter les boutiques
  const r1 = await mgmt(`SELECT count(*) as total, array_agg(name) as names FROM shops;`);
  console.log('📦 Boutiques actuelles:', r1.data[0].total, '→', r1.data[0].names);

  // 2. Supprimer toutes les dépendances en cascade (via SQL direct — on est admin)
  console.log('\n🗑️ Suppression des dépendances...');

  const tables = [
    'product_videos',
    'product_images',
    'reviews',
    'shop_follows',
    'promotions',
    'share_links',
    'discount_codes',
    'campaign_events',
    'products',
  ];

  for (const t of tables) {
    // products a shop_id, les autres ont product_id ou shop_id
    if (t === 'product_videos' || t === 'product_images' || t === 'reviews') {
      const r = await mgmt(`DELETE FROM ${t} WHERE product_id IN (SELECT id FROM products WHERE shop_id IN (SELECT id FROM shops));`);
      console.log(`  ${t}: ${r.ok ? '✅' : '❌'} ${r.status}`);
    } else {
      const r = await mgmt(`DELETE FROM ${t} WHERE shop_id IN (SELECT id FROM shops);`);
      console.log(`  ${t}: ${r.ok ? '✅' : '❌'} ${r.status}`);
    }
  }

  // 3. Supprimer les boutiques
  console.log('\n🗑️ Suppression des boutiques...');
  const rDel = await mgmt(`DELETE FROM shops RETURNING id, name;`);
  console.log(`  shops: ${rDel.ok ? '✅' : '❌'} ${rDel.status} → ${rDel.data?.length || 0} supprimées`);
  if (rDel.data?.length) {
    rDel.data.forEach(s => console.log(`    - ${s.name}`));
  }

  // 4. Vérification
  const rCheck = await mgmt(`SELECT count(*) as remaining FROM shops;`);
  console.log('\n✅ Boutiques restantes:', rCheck.data[0].remaining);

  // 5. Vérifier aussi les produits
  const rProds = await mgmt(`SELECT count(*) as remaining FROM products;`);
  console.log('✅ Produits restants:', rProds.data[0].remaining);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
