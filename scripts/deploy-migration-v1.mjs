// ============================================================
// Deploy migration V1__retention_attraction.sql to Supabase
// Usage: node scripts/deploy-migration-v1.mjs
// ============================================================
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const SUPABASE_DB_PASSWORD = 'RQVagLEXK2cjnZA8#v4U1P7f';
const PROJECT_REF = 'pxcymtjbbdrutqpbwfdo';
const REGION = 'eu-central-1';

const SQL = readFileSync(
  resolve(__dirname, '../supabase/migrations/V1__retention_attraction.sql'),
  'utf8',
);

const CONNECTION_STRINGS = [
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@aws-0-${REGION}.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@aws-0-${REGION}.pooler.supabase.com:6543/postgres`,
];

async function tryConnect(connStr, label) {
  const client = new Client({
    connectionString: connStr,
    connectionTimeoutMillis: 15000,
  });
  try {
    await client.connect();
    console.log(`✅ Connexion OK via ${label}`);
    return client;
  } catch (e) {
    console.log(`❌ Échec ${label} : ${e.message.split('\n')[0]}`);
    try { await client.end(); } catch {}
    return null;
  }
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Deploy Migration V1 : Rétention + Attraction');
  console.log('  Projet : pxcymtjbbdrutqpbwfdo (eu-central-1)');
  console.log('  Contenu : favorites, reviews+++, profils vérifiés++,');
  console.log('            triggers notifications, RPC toggle_favorite');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let client = null;
  for (let i = 0; i < CONNECTION_STRINGS.length; i++) {
    const label = ['session-pooler', 'tx-pooler'][i];
    client = await tryConnect(CONNECTION_STRINGS[i], label);
    if (client) break;
  }
  if (!client) { console.error('🔴 Aucune connexion.'); process.exit(1); }

  try {
    console.log('▶ Exécution de la migration SQL...');
    await client.query(SQL);
    console.log('✅ Migration appliquée avec succès.\n');

    console.log('▶ Vérification des objets créés :');

    const checks = [
      { q: "SELECT count(*) AS c FROM information_schema.tables WHERE table_name='favorites'", l: 'Table favorites' },
      { q: "SELECT count(*) AS c FROM information_schema.tables WHERE table_name='review_images'", l: 'Table review_images' },
      { q: "SELECT count(*) AS c FROM information_schema.tables WHERE table_name='review_likes'", l: 'Table review_likes' },
      { q: "SELECT count(*) AS c FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_verified'", l: 'Colonne profiles.is_verified' },
      { q: "SELECT count(*) AS c FROM information_schema.columns WHERE table_name='profiles' AND column_name='social_links'", l: 'Colonne profiles.social_links' },
      { q: "SELECT count(*) AS c FROM information_schema.columns WHERE table_name='products' AND column_name='favorites_count'", l: 'Colonne products.favorites_count' },
      { q: "SELECT count(*) AS c FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='toggle_favorite'", l: 'RPC toggle_favorite()' },
      { q: "SELECT count(*) AS c FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_product_review_stats'", l: 'RPC get_product_review_stats()' },
      { q: "SELECT count(*) AS c FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='add_verification_method'", l: 'RPC add_verification_method()' },
      { q: "SELECT count(*) AS c FROM pg_trigger WHERE tgname='trg_favorites_sync_count'", l: 'Trigger trg_favorites_sync_count' },
      { q: "SELECT count(*) AS c FROM pg_trigger WHERE tgname='trg_new_review_seller_notif'", l: 'Trigger notification avis vendeur' },
    ];

    console.log('┌────────────────────────────────────────────────┬────────┐');
    console.log('│ Objet                                          │ Status │');
    console.log('├────────────────────────────────────────────────┼────────┤');
    for (const { q, l } of checks) {
      const res = await client.query(q);
      const ok = Number(res.rows[0].c) > 0;
      const pad = l.padEnd(46);
      const st = (ok ? '✅ OK' : '❌ KO').padStart(7);
      console.log(`│ ${pad}│ ${st} │`);
    }
    console.log('└────────────────────────────────────────────────┴────────┘');

    console.log('\n🎉 MIGRATION V1 DÉPLOYÉE.');
  } catch (e) {
    console.error('\n🔴 Erreur migration :', e.message);
    console.error(e.stack?.split('\n').slice(0, 3).join('\n'));
    process.exit(1);
  } finally {
    await client.end();
  }
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
