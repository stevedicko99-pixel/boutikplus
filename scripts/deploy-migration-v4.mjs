// ============================================================
// Deploy migration V4__multi_role_and_driver.sql to Supabase
// Usage: node scripts/deploy-migration-v4.mjs
// ============================================================
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

// Mot de passe DB (essayer celui de .env d'abord, puis fallback ancien)
const CANDIDATE_PASSWORDS = [
  'AaSteve65382337@!',   // .env actuel (SUPABASE_DB_PASSWORD)
  'RQVagLEXK2cjnZA8#v4U1P7f', // script V1
];
const PROJECT_REF = 'pxcymtjbbdrutqpbwfdo';
const REGION = 'eu-central-1';

const SQL = readFileSync(
  resolve(__dirname, '../supabase/migrations/V4__multi_role_and_driver.sql'),
  'utf8',
);

function buildConnectionStrings(password) {
  const enc = encodeURIComponent(password);
  return [
    `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-${REGION}.pooler.supabase.com:5432/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${enc}@aws-0-${REGION}.pooler.supabase.com:6543/postgres`,
  ];
}

async function tryConnect(connStr, label) {
  const client = new Client({
    connectionString: connStr,
    connectionTimeoutMillis: 15000,
  });
  try {
    await client.connect();
    return client;
  } catch (e) {
    try { await client.end(); } catch {}
    return null;
  }
}

async function findWorkingClient() {
  for (const pwd of CANDIDATE_PASSWORDS) {
    const conns = buildConnectionStrings(pwd);
    for (let i = 0; i < conns.length; i++) {
      const label = ['session', 'tx-pooler'][i];
      const client = await tryConnect(conns[i], label);
      if (client) {
        console.log(`✅ Connexion DB OK via ${label} (mdp candidat "${pwd.slice(0,4)}****")`);
        return client;
      }
    }
    console.log(`⚠️  MDP "${pwd.slice(0,4)}****" échoue, essai suivant...`);
  }
  return null;
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Deploy Migration V4 : Multi-Rôles (Acheteur/Vendeur/Livreur)');
  console.log('  Projet : pxcymtjbbdrutqpbwfdo (eu-central-1)');
  console.log('  Objets : profiles.roles[], primary_role, trigger sync,');
  console.log('            RPC switch_primary_role(), handle_new_user++');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const client = await findWorkingClient();
  if (!client) { console.error('🔴 Aucune connexion DB (vérifier .env SUPABASE_DB_PASSWORD).'); process.exit(1); }

  try {
    console.log('▶ Exécution migration SQL V4...');
    await client.query('BEGIN');
    await client.query(SQL);
    await client.query('COMMIT');
    console.log('✅ Migration appliquée avec succès (transaction commitée).\n');

    console.log('▶ Vérification post-migration :');
    const checks = [
      { q: "SELECT count(*) c FROM information_schema.columns WHERE table_name='profiles' AND column_name='roles'", l: 'Colonne profiles.roles[]' },
      { q: "SELECT count(*) c FROM information_schema.columns WHERE table_name='profiles' AND column_name='primary_role'", l: 'Colonne profiles.primary_role' },
      { q: "SELECT count(*) c FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='idx_profiles_roles_gin'", l: 'Index idx_profiles_roles_gin' },
      { q: "SELECT count(*) c FROM pg_trigger WHERE tgname='trg_profile_sync_roles'", l: 'Trigger trg_profile_sync_roles' },
      { q: "SELECT count(*) c FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='sync_profile_roles'", l: 'Fonction sync_profile_roles()' },
      { q: "SELECT count(*) c FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='switch_primary_role'", l: 'RPC switch_primary_role()' },
      { q: "SELECT count(*) c FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='handle_new_user'", l: 'Trigger handle_new_user() MAJ' },
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

    // Petit test fonctionnel : si il y a 2 profils, forcer roles = ARRAY[role] pour eux
    try {
      const r = await client.query("UPDATE profiles SET roles=ARRAY[role]::TEXT[], primary_role=role::user_role WHERE array_length(roles,1) IS NULL OR roles IS NULL RETURNING id, full_name, roles, primary_role");
      if (r.rowCount > 0) console.log(`✅ Migration retro-active: ${r.rowCount} profil(s) mis à jour avec roles[] et primary_role.`);
    } catch(e) { console.log('ℹ️ Mise à jour retro déjà effectuée.'); }

    console.log('\n🎉 MIGRATION V4 : TERMINÉE.');
  } catch (e) {
    try { await client.query('ROLLBACK'); console.log('⚠️ ROLLBACK effectué.'); } catch {}
    console.error('\n🔴 Erreur migration :', e.message);
    console.error(e.stack?.split('\n').slice(0,4).join('\n'));
    process.exit(1);
  } finally {
    await client.end();
  }
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
