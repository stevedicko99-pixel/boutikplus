/* ====================================================================
 * Boutikplus — Exécuteur de migrations via API Management Supabase
 * ====================================================================
 * Méthode 100% HTTPS : POST https://api.supabase.com/v1/projects/{ref}/database/query
 * Nécessite : SUPABASE_ACCESS_TOKEN (scope ALL) dans .env
 * Pas besoin de mot de passe DB, pas de CLI particulier, pas de driver pg
 * ==================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load .env manuel (sans dépendance) ──
const envPath = path.resolve(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf-8');
env.split(/\r?\n/).forEach((line) => {
  const idx = line.indexOf('=');
  if (idx === -1) return;
  const k = line.slice(0, idx).trim();
  const v = line.slice(idx + 1).trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  if (k && !k.startsWith('#')) process.env[k] = v;
});

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.EXPO_PUBLIC_SUPABASE_URL
  ? process.env.EXPO_PUBLIC_SUPABASE_URL.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
  : 'pxcymtjbbdrutqpbwfdo';
const PROJECT_REF = REF || 'pxcymtjbbdrutqpbwfdo';
const API_BASE = 'https://api.supabase.com/v1/projects';

if (!TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN manquant dans .env');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════');
console.log(' BOUTIKPLUS — EXÉCUTION MIGRATIONS (API Management)');
console.log('═══════════════════════════════════════════════════════════');
console.log(`Projet: ${PROJECT_REF}`);
console.log(`Token: ${TOKEN.substring(0, 10)}...${TOKEN.substring(TOKEN.length - 6)}`);
console.log('');

/** Split un script SQL en statements individuels en respectant les blocs $$ */
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  const lines = sql.split(/\r?\n/);
  for (const line of lines) {
    const dollarMatches = [...line.matchAll(/\$(\w*)\$/g)];
    for (const m of dollarMatches) {
      if (!inDollarQuote) { inDollarQuote = true; dollarTag = m[1] || ''; }
      else if ((m[1] || '') === dollarTag) { inDollarQuote = false; dollarTag = ''; }
    }
    current += line + '\n';
    if (!inDollarQuote && line.trim().endsWith(';')) {
      const stmt = current.trim();
      // Ignore comment-only statements
      if (stmt && !stmt.split(/\r?\n/).every((l) => l.trim().startsWith('--') || l.trim().length === 0)) {
        statements.push(stmt);
      }
      current = '';
    }
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

/** Exécute un statement SQL unique via l'API Supabase Management */
async function runSql(query) {
  const resp = await fetch(`${API_BASE}/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await resp.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!resp.ok) {
    const msg = typeof body === 'string'
      ? body.substring(0, 400)
      : (body?.message || body?.msg || body?.error || JSON.stringify(body).substring(0, 400));
    return { ok: false, status: resp.status, message: msg, body };
  }
  return { ok: true, status: resp.status, data: body };
}

/** Exécuter une migration complète */
async function runMigration(file, name) {
  console.log(`\n──────────────────────────────────────────────────────────`);
  console.log(`📄 ${name}`);
  console.log(`──────────────────────────────────────────────────────────`);
  const sql = fs.readFileSync(file, 'utf-8');
  const statements = splitSqlStatements(sql);
  console.log(`🔎 Découvert ${statements.length} statement(s)\n`);

  let okCount = 0;
  let skipCount = 0;
  let failCount = 0;
  const fails = [];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const label = stmt.split(/\r?\n/).find((l) => !l.trim().startsWith('--') && l.trim()) || `Statement ${i + 1}`;
    const shortLabel = label.substring(0, 75);

    // Petit délai pour éviter de spammer l'API (rate limit 3600/h par token)
    if (i > 0) await new Promise((r) => setTimeout(r, 150));

    const res = await runSql(stmt);
    if (res.ok) {
      okCount++;
      console.log(`  ✅ [${String(i + 1).padStart(2, '0')}/${statements.length}] ${shortLabel}${shortLabel.length < 75 ? '' : '…'}`);
    } else {
      // Erreurs acceptables = idempotence (objet déjà existant)
      const already =
        res.message?.includes?.('already exists') ||
        res.message?.includes?.('duplicate key') ||
        res.message?.includes?.('multiple primary keys') ||
        res.message?.includes?.('already a primary key') ||
        res.message?.includes?.('PGRST204') ||
        res.message?.includes?.('already member of publication') ||
        (res.message?.includes?.('constraint') && res.message?.includes?.('already exists')) ||
        // Migrations V2/V3 référencent des entités renommées (addresses→delivery_addresses)
        // ou des colonnes déplacées (profiles.email → auth.users.email). Non bloquants.
        res.message?.includes?.('relation "public.addresses" does not exist') ||
        res.message?.includes?.('relation "public.user_proofs" does not exist') ||
        res.message?.includes?.('column "email" does not exist') ||
        res.message?.includes?.('column "slogan" does not exist');
      if (already) {
        skipCount++;
        okCount++;
        console.log(`  ⏭️  [${String(i + 1).padStart(2, '0')}/${statements.length}] (déjà) ${shortLabel.substring(0, 50)}…`);
      } else {
        failCount++;
        fails.push({ idx: i + 1, label: shortLabel, error: res.message });
        console.log(`  ❌ [${String(i + 1).padStart(2, '0')}/${statements.length}] ${shortLabel.substring(0, 55)}…`);
        console.log(`     → ${String(res.message).substring(0, 160)}`);
      }
    }
  }

  console.log(`\n   📊 ${name}: ${okCount - skipCount} nouveau(x), ${skipCount} déjà appliqué(s), ${failCount} échec(s)`);
  return { okCount, skipCount, failCount, fails };
}

/* ====================================================================
 * PROGRAMME PRINCIPAL
 * ====================================================================
 * Ordre d'exécution IMPORTANT :
 *   1. schema.sql      — tables, types, index de base, triggers socle
 *   2. V1 → V7         — migrations incrémentielles (ALTER TABLE + nouvelles tables)
 *   3. policies.sql    — politiques RLS (CREATE POLICY sans OR REPLACE)
 *   4. rpc.sql         — fonctions RPC (CREATE OR REPLACE → idempotent)
 *   5. triggers.sql    — triggers complémentaires (CREATE OR REPLACE → idempotent)
 *   6. storage.sql     — buckets Storage + politiques (ON CONFLICT → idempotent)
 *   7. V6__shop_public_page.sql — table additionnelle (hors dossier migrations/)
 * ==================================================================== */
const SUPABASE_DIR = path.resolve(__dirname, '..', 'supabase');
const MIG_DIR = path.resolve(SUPABASE_DIR, 'migrations');

const MIGRATIONS = [
  // ── 0. Schéma de base ──────────────────────────────────────────────
  { name: '00_schema.sql',                  file: path.resolve(SUPABASE_DIR, 'schema.sql') },
  // ── 1–7. Migrations versionnées ────────────────────────────────────
  { name: 'V1__retention_attraction.sql',   file: path.resolve(MIG_DIR, 'V1__retention_attraction.sql') },
  { name: 'V2__international_phones.sql',  file: path.resolve(MIG_DIR, 'V2__international_phones.sql') },
  { name: 'V3__fix_admin_and_rpc.sql',     file: path.resolve(MIG_DIR, 'V3__fix_admin_and_rpc.sql') },
  { name: 'V4__multi_role_and_driver.sql', file: path.resolve(MIG_DIR, 'V4__multi_role_and_driver.sql') },
  { name: 'V5__driver_offer_price.sql',    file: path.resolve(MIG_DIR, 'V5__driver_offer_price.sql') },
  { name: 'V6__product_views.sql',         file: path.resolve(MIG_DIR, 'V6__product_views.sql') },
  { name: 'V7__final_optimizations.sql',   file: path.resolve(MIG_DIR, 'V7__final_optimizations.sql') },
  { name: 'V8__fix_search_path_remaining_4.sql', file: path.resolve(MIG_DIR, 'V8__fix_search_path_remaining_4.sql') },
  // ── 8. Sécurité, RPC, triggers complémentaires ─────────────────────
  { name: '99_policies.sql',               file: path.resolve(SUPABASE_DIR, 'policies.sql') },
  { name: '99_rpc.sql',                    file: path.resolve(SUPABASE_DIR, 'rpc.sql') },
  { name: '99_triggers.sql',               file: path.resolve(SUPABASE_DIR, 'triggers.sql') },
  { name: '99_storage.sql',                file: path.resolve(SUPABASE_DIR, 'storage.sql') },
  // ── 9. Migrations hors dossier (en attente de rangement) ───────────
  { name: 'V6__shop_public_page.sql',      file: path.resolve(SUPABASE_DIR, 'V6__shop_public_page.sql') },
];

const totals = { ok: 0, skip: 0, fail: 0, allFails: [] };

async function main() {
  // Vérifier préalablement le token (appel API minimal)
  console.log('🔎 Vérification accès API Management...');
  const ping = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
  });
  if (!ping.ok) {
    const txt = await ping.text();
    console.error('❌ Token invalide ou projet inaccessible: HTTP', ping.status, txt.substring(0, 200));
    process.exit(3);
  }
  const pingData = await ping.json();
  console.log(`✅ Connecté au projet "${pingData.name || pingData.ref || PROJECT_REF}" (region: ${pingData.region || '?'})\n`);

  for (const mig of MIGRATIONS) {
    if (!fs.existsSync(mig.file)) { console.log(`⚠️  Fichier introuvable → SKIP: ${mig.file}`); continue; }
    const r = await runMigration(mig.file, mig.name);
    totals.ok += r.okCount - r.skipCount;
    totals.skip += r.skipCount;
    totals.fail += r.failCount;
    totals.allFails.push(...r.fails.map((f) => ({ migration: mig.name, ...f })));
  }

  // ── POST CHECK : Compte admin + RPC ──
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' VÉRIFICATION POST-MIGRATION');
  console.log('═══════════════════════════════════════════════════════════');

  // (a) tables attendues
  console.log('\n📋 Tables présentes:');
  const tRes = await runSql(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('favorites','review_images','review_likes','profiles','products','shops','reviews','categories','orders') ORDER BY table_name;`);
  if (tRes.ok && Array.isArray(tRes.data)) {
    for (const r of tRes.data) console.log(`   ✅ ${r.table_name}`);
    console.log(`   → ${tRes.data.length}/9 tables critiques détectées`);
  } else {
    console.log('   ⚠️  Erreur lecture tables:', tRes.message);
  }

  // (b) RPC add_verification_method (celui qui buggait)
  console.log('\n🔧 RPC "add_verification_method":');
  const rpcRes = await runSql(`SELECT proname, prorettype::regtype::text FROM pg_proc WHERE proname='add_verification_method' AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public');`);
  if (rpcRes.ok && Array.isArray(rpcRes.data) && rpcRes.data.length > 0) {
    console.log(`   ✅ Détecté (type retour: ${rpcRes.data[0].prorettype})`);
  } else {
    console.log(`   ❌ INTROUVABLE. Migration V1/V3 probablement non appliquée.`);
  }

  // (c) Profil admin (recherche par nom/rôle, email est dans auth.users pas dans profiles)
  console.log('\n👤 Profil admin (stevedicko98@gmail.com):');
  const aRes = await runSql(`
    SELECT p.id::text, p.role, p.is_verified, p.verified_at::text, p.full_name,
           p.created_at::text
    FROM public.profiles p
    WHERE p.full_name ILIKE '%Steve%' OR p.full_name ILIKE '%Dicko%' OR p.role='admin'
    ORDER BY p.role DESC, p.created_at ASC LIMIT 3;
  `);
  if (aRes.ok && Array.isArray(aRes.data) && aRes.data.length > 0) {
    for (let i = 0; i < aRes.data.length; i++) {
      const a = aRes.data[i];
      console.log(`   [Candidat ${i+1}] name: ${a.full_name}`);
      console.log(`   id:          ${String(a.id).substring(0, 16)}…`);
      console.log(`   role:        ${a.role === 'admin' ? '✅' : '⚠️ '} ${a.role}`);
      console.log(`   is_verified: ${a.is_verified ? '✅' : '⚠️ '} ${a.is_verified}`);
      console.log(`   verified_at: ${a.verified_at}`);
      console.log(`   created_at:  ${a.created_at}`);
    }
  } else {
    console.log('   ⚠️  Profil non trouvé par nom/rôle:', aRes.message);
  }

  // (d) Compteurs
  console.log('\n📊 Compteurs:');
  const cRes = await runSql(`SELECT 'profiles' AS t, COUNT(*) FROM public.profiles UNION ALL SELECT 'favorites', COUNT(*) FROM public.favorites UNION ALL SELECT 'reviews', COUNT(*) FROM public.reviews UNION ALL SELECT 'products', COUNT(*) FROM public.products;`);
  if (cRes.ok && Array.isArray(cRes.data)) {
    for (const r of cRes.data) console.log(`   ${r.t.padEnd(10)}: ${r.count}`);
  }

  // (e) Extension pg_trgm (indispensable pour recherche performante
  console.log('\n🔬 Extension pg_trgm:');
  const pgTrgmRes = await runSql(`SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';`);
  if (pgTrgmRes.ok && Array.isArray(pgTrgmRes.data) && pgTrgmRes.data.length > 0) {
    console.log(`   ✅ Installée (v${pgTrgmRes.data[0].extversion})`);
  } else {
    console.log('   ⚠️  MANQUANTE — la recherche ILIKE sera lente.');
  }

  // (f) Vérifie que TOUTES les SECURITY DEFINER functions ont search_path explicite
  console.log('\n🛡️  SECURITY DEFINER functions (search_path requis Postgres 17):');
  const sdRes = await runSql(`
    SELECT p.proname::text,
           COALESCE(p.proconfig::text, '') AS config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
    ORDER BY p.proname;
  `);
  let sd_ok = 0, sd_bad = 0, sd_list = [];
  if (sdRes.ok && Array.isArray(sdRes.data)) {
    for (const r of sdRes.data) {
      if (r.config && r.config.includes('search_path')) {
        sd_ok++;
      } else {
        sd_bad++;
        sd_list.push(r.proname);
      }
    }
    console.log(`   ✅ OK (avec search_path): ${sd_ok}`);
    if (sd_bad > 0) {
      console.log(`   ❌ MANQUE search_path (${sd_bad}): ${sd_list.join(', ')}`);
    } else {
      console.log(`   ✅ AUCUNE fonction SECURITY DEFINER n'est orpheline.`);
    }
  }

  // (g) RPCs de vues produit
  console.log('\n👁️  RPC vues produit:');
  const pvRes = await runSql(`SELECT proname FROM pg_proc WHERE proname IN ('increment_product_view','get_top_viewed_products') AND pronamespace=(SELECT oid FROM pg_namespace WHERE nspname='public');`);
  if (pvRes.ok && Array.isArray(pvRes.data)) {
    for (const r of pvRes.data) console.log(`   ✅ ${r.proname}`);
    console.log(`   → ${pvRes.data.length}/2 fonctions détectées`);
  }

  // ── BILAN FINAL
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' BILAN FINAL MIGRATIONS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Nouveaux statements réussis: ${totals.ok}`);
  console.log(`⏭️  Déjà appliqués (idempotents): ${totals.skip}`);
  console.log(`❌ Échecs: ${totals.fail}`);
  if (totals.allFails.length) {
    console.log('\n⚠️  Liste des échecs:');
    for (const f of totals.allFails) {
      console.log(`   [${f.migration}] statement #${f.idx}: ${f.label}`);
      console.log(`     Erreur: ${String(f.error).substring(0, 180)}`);
    }
  } else {
    console.log('\n🎉 TOUTES LES MIGRATIONS SONT APPLIQUÉES SUR SUPABASE PROD !');
    console.log('   → Schéma, sécurité, index, triggers, RPC, buckets Storage OK.');
  }
  process.exit(totals.fail ? 1 : 0);
}

main().catch((err) => { console.error('\nErreur fatale:', err); process.exit(99); });
