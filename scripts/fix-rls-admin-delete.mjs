// Fix RLS: ajouter OR is_admin() aux politiques DELETE manquantes
// pour que l'admin puisse supprimer les boutiques avec tous leurs dépendances.
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
  console.log('🔧 Fix RLS: ajout OR is_admin() aux politiques DELETE manquantes\n');

  // 1. product_videos — remplacer la politique ALL existante
  console.log('1. product_videos: DROP + CREATE avec is_admin()');
  const r1 = await mgmt(`
    DROP POLICY IF EXISTS product_videos_owner_all ON product_videos;
    CREATE POLICY product_videos_owner_all ON product_videos
      FOR ALL
      USING (
        (product_id IN ( SELECT products.id FROM products WHERE products.shop_id IN ( SELECT shops.id FROM shops WHERE shops.owner_id = auth.uid() )))
        OR is_admin()
      )
      WITH CHECK (
        (product_id IN ( SELECT products.id FROM products WHERE products.shop_id IN ( SELECT shops.id FROM shops WHERE shops.owner_id = auth.uid() )))
        OR is_admin()
      );
  `);
  console.log('   ', r1.status, r1.ok ? '✅' : JSON.stringify(r1.data).slice(0, 300));

  // 2. shop_follows — ajouter is_admin() au DELETE
  console.log('\n2. shop_follows: DROP + CREATE DELETE avec is_admin()');
  const r2 = await mgmt(`
    DROP POLICY IF EXISTS follows_delete_self ON shop_follows;
    CREATE POLICY follows_delete_self ON shop_follows
      FOR DELETE
      USING (auth.uid() = user_id OR is_admin());
  `);
  console.log('   ', r2.status, r2.ok ? '✅' : JSON.stringify(r2.data).slice(0, 300));

  // 3. share_links — ajouter is_admin() au DELETE (et ALL)
  console.log('\n3. share_links: DROP + CREATE ALL avec is_admin()');
  const r3 = await mgmt(`
    DROP POLICY IF EXISTS share_links_owner_all ON share_links;
    CREATE POLICY share_links_owner_all ON share_links
      FOR ALL
      USING (owner_id = auth.uid() OR is_admin())
      WITH CHECK (owner_id = auth.uid() OR is_admin());
  `);
  console.log('   ', r3.status, r3.ok ? '✅' : JSON.stringify(r3.data).slice(0, 300));

  // 4. discount_codes — ajouter is_admin() au DELETE (et ALL)
  console.log('\n4. discount_codes: DROP + CREATE ALL avec is_admin()');
  const r4 = await mgmt(`
    DROP POLICY IF EXISTS discount_codes_owner_all ON discount_codes;
    CREATE POLICY discount_codes_owner_all ON discount_codes
      FOR ALL
      USING (
        (shop_id IN ( SELECT shops.id FROM shops WHERE shops.owner_id = auth.uid() ))
        OR is_admin()
      )
      WITH CHECK (
        (shop_id IN ( SELECT shops.id FROM shops WHERE shops.owner_id = auth.uid() ))
        OR is_admin()
      );
  `);
  console.log('   ', r4.status, r4.ok ? '✅' : JSON.stringify(r4.data).slice(0, 300));

  // 5. campaign_events — ajouter une politique DELETE (n'en a pas du tout)
  console.log('\n5. campaign_events: CREATE DELETE avec is_admin()');
  const r5 = await mgmt(`
    DROP POLICY IF EXISTS campaign_events_admin_delete ON campaign_events;
    CREATE POLICY campaign_events_admin_delete ON campaign_events
      FOR DELETE
      USING (is_admin());
  `);
  console.log('   ', r5.status, r5.ok ? '✅' : JSON.stringify(r5.data).slice(0, 300));

  // 6. Vérification
  console.log('\n📋 Vérification des politiques DELETE:');
  const rCheck = await mgmt(`
    SELECT tablename, policyname, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('product_videos', 'shop_follows', 'share_links', 'discount_codes', 'campaign_events')
      AND cmd = 'DELETE'
    ORDER BY tablename;
  `);
  rCheck.data.forEach(p => {
    const hasAdmin = p.qual && p.qual.includes('is_admin()');
    console.log(`  ${hasAdmin ? '✅' : '❌'} ${p.tablename}.${p.policyname}: ${p.qual?.slice(0, 100)}`);
  });
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
