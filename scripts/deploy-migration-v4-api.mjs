// ============================================================
// Deploy migration V4 via Supabase Management REST API (PAT)
// Nécessite SUPABASE_ACCESS_TOKEN (PAT sbp_xxx) dans .env / vars
// Endpoint : POST https://api.supabase.com/v1/projects/{ref}/database/query
// ============================================================
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Chargement .env SANS dépendance dotenv
const envPath = resolve(__dirname, '../.env');
if (existsSync(envPath)) {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const PROJECT_REF = 'pxcymtjbbdrutqpbwfdo';
const REGION = 'eu-central-1';

const PAT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT || '';

const SQL = readFileSync(
  resolve(__dirname, '../supabase/migrations/V4__multi_role_and_driver.sql'),
  'utf8',
);

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Deploy Migration V4 via API Supabase Management');
  console.log('  Projet :', PROJECT_REF, REGION);
  console.log('  PAT    :', PAT_TOKEN.slice(0, 8) + '**********');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query: SQL }),
    });
  } catch (e) {
    console.error('🔴 Erreur réseau :', e.message);
    process.exit(1);
  }

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }

  if (!res.ok) {
    console.error(`🔴 HTTP ${res.status} : ${res.statusText}`);
    console.error('Payload erreur :', JSON.stringify(json, null, 2));
    process.exit(1);
  }

  console.log('✅ Migration exécutée par API Supabase DB Query.');
  if (Array.isArray(json)) {
    console.log(`→ ${json.length} statement(s) retour :`);
    for (let i = 0; i < Math.min(json.length, 5); i++) {
      const row = json[i];
      console.log(`   [${i}]`, JSON.stringify(row).slice(0, 160));
    }
  } else if (json?.error) {
    console.error('⚠️ Erreur SQL détectée dans body :', json.error?.message || json.error);
    process.exit(2);
  } else {
    console.log('→ Réponse brute tronquée :', JSON.stringify(json).slice(0, 400));
  }

  // Vérification : re-faire une requête simple pour confirmer colonnes
  console.log('\n▶ Vérification colonnes ajoutées :');
  const checkSql = `
    SELECT 'roles'::text AS col, EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='roles') AS ok
    UNION ALL
    SELECT 'primary_role', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='primary_role')
    UNION ALL
    SELECT 'RPC switch_primary_role', EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='switch_primary_role')
    UNION ALL
    SELECT 'trigger trg_profile_sync_roles', EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_profile_sync_roles');
  `;
  try {
    const res2 = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: checkSql }),
    });
    const j2 = await res2.json();
    console.log('┌────────────────────────────────────────────────┬────────┐');
    console.log('│ Objet                                          │ Status │');
    console.log('├────────────────────────────────────────────────┼────────┤');
    if (Array.isArray(j2)) {
      for (const r of j2) {
        const ok = !!r.ok;
        const pad = String(r.col).padEnd(46);
        const st = (ok ? '✅ OK' : '❌ KO').padStart(7);
        console.log(`│ ${pad}│ ${st} │`);
      }
    } else {
      console.log('réponse:', JSON.stringify(j2).slice(0, 300));
    }
    console.log('└────────────────────────────────────────────────┴────────┘');
  } catch (e) {
    console.log('⚠️ Vérification échouée :', e.message);
  }

  console.log('\n🎉 MIGRATION V4 DÉPLOYÉE VIA API.');
}
main().catch(e => { console.error('Fatal:', e); process.exit(1); });
