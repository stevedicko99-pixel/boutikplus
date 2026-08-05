/* Patch V8 uniquement : applique SET search_path aux 4 SECURITY DEFINER restantes
 * puis relance la vérification POST-MIGRATION.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Chargement .env
const envPath = path.resolve(ROOT, '.env');
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

if (!TOKEN) { console.error('❌ SUPABASE_ACCESS_TOKEN manquant'); process.exit(1); }

async function pgQuery(sql) {
  const r = await fetch(`${API_BASE}/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ query: sql.trim().replace(/;\s*$/s, '') }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} ${text.substring(0,200)}`);
  try { return JSON.parse(text); } catch { return text; }
}

// ── Split statements (même logique que le runner principal) ──
function splitStatements(sql) {
  const out = []; let buf = ''; let depth = 0;
  let inStr = null; let i = 0;
  while (i < sql.length) {
    const c = sql[i]; const n = sql[i+1];
    if (inStr) {
      buf += c;
      if (c === inStr && n === inStr) { buf += n; i += 2; continue; }
      if (c === inStr) inStr = null;
      i++; continue;
    }
    if (c === "'" || c === '"') { inStr = c; buf += c; i++; continue; }
    if ((c === '-' && n === '-') || (c === '/' && n === '*')) {
      if (c === '-') { while (i < sql.length && sql[i] !== '\n') { buf += sql[i]; i++; } continue; }
      buf += c + n; i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i+1] === '/')) { buf += sql[i]; i++; }
      if (i < sql.length) { buf += '*/'; i += 2; } continue;
    }
    if (c === '$' && sql.substring(i, i+4) === '$$') {
      const endMark = '$$';
      buf += c + sql[i+1]; i += 2;
      while (i < sql.length && sql.substring(i, i+2) !== endMark) { buf += sql[i]; i++; }
      if (i < sql.length) { buf += endMark; i += 2; } continue;
    }
    if (c === 'BEGIN' || c === 'CASE' || (/\bCREATE\b/.test(buf + c) && /\bFUNCTION\b|\bPROCEDURE\b/.test(buf + c))) {
      depth++;
    }
    buf += c;
    if (c === ';' && depth <= 0) { out.push(buf.trim()); buf = ''; }
    i++;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

async function runOne(file, name) {
  const src = fs.readFileSync(file, 'utf-8');
  const stmts = splitStatements(src).filter(s => s.length > 5);
  console.log(`📄 ${name}`);
  console.log(`🔎 Découvert ${stmts.length} statement(s)\n`);
  let ok = 0, skip = 0, fail = 0;
  for (let idx = 0; idx < stmts.length; idx++) {
    const s = stmts[idx];
    const firstLine = s.split('\n')[0].substring(0, 85);
    try {
      await pgQuery(s);
      console.log(`  ✅ [${String(idx+1).padStart(2, '0')}/${stmts.length}] ${firstLine}`);
      ok++;
    } catch (e) {
      const msg = e.message || String(e);
      if (/already exists|already applied|duplicate key|violates unique constraint/i.test(msg)) {
        console.log(`  ⏭️  [${String(idx+1).padStart(2, '0')}/${stmts.length}] (déjà) ${firstLine}`);
        skip++;
      } else {
        console.log(`  ❌ [${String(idx+1).padStart(2, '0')}/${stmts.length}] ${firstLine}`);
        console.log(`        → ${msg.substring(0, 200)}`);
        fail++;
      }
    }
  }
  console.log(`\n   📊 ${name}: ${ok} nouveau(x), ${skip} déjà appliqué(s), ${fail} échec(s)`);
  console.log('──────────────────────────────────────────────────────────\n');
  return { ok, skip, fail };
}

async function postCheck() {
  console.log('═══ VÉRIFICATION POST-V8 ══════════════════════════════════════');
  // 1. SECURITY DEFINER AVEC search_path vs SANS
  const sd = await pgQuery(`
    SELECT p.proname AS fn,
           COALESCE(array_position(p.proconfig, 'search_path=public') > 0, FALSE) AS has_sp
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = TRUE
    ORDER BY p.proname;`);
  const withSp = sd.filter(r => r.has_sp).length;
  const missing = sd.filter(r => !r.has_sp).map(r => r.fn);
  console.log('\n🛡️  SECURITY DEFINER functions (search_path requis Postgres 17):');
  console.log(`   ✅ OK (avec search_path): ${withSp}`);
  if (missing.length) console.log(`   ❌ MANQUE search_path (${missing.length}): ${missing.join(', ')}`);
  else console.log(`   🎉 TOUTES LES SECURITY DEFINER ONT search_path=public !`);

  // 2. pg_trgm installé ?
  try {
    const trgm = await pgQuery(`SELECT extversion FROM pg_extension WHERE extname='pg_trgm'`);
    console.log(`\n🔬 Extension pg_trgm: ${trgm[0] ? '✅ Installée (v' + trgm[0].extversion + ')' : '❌ ABSENTE'}`);
  } catch {}

  // 3. RPC vues produit
  try {
    const rpc = await pgQuery(`SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND proname IN ('get_top_viewed_products','increment_product_view')`);
    console.log(`\n👁️  RPC vues produit: ${rpc.map(r=>'✅ '+r.proname).join('\n              ')}\n   → ${rpc.length}/2 fonctions détectées`);
  } catch {}
}

// ── MAIN ──
console.log('═══════════════════════════════════════════════════════════');
console.log(' BOUTIKPLUS — PATCH V8 (4 SECURITY DEFINER search_path)');
console.log('═══════════════════════════════════════════════════════════\n');
const ping = await fetch(`${API_BASE}/${PROJECT_REF}`, { headers: { 'Authorization': `Bearer ${TOKEN}` }});
if (!ping.ok) { console.error('❌ Token invalide HTTP', ping.status); process.exit(3); }
const pd = await ping.json();
console.log(`✅ Connecté: "${pd.name || pd.ref}" (region ${pd.region})\n`);

const mig = await runOne(path.resolve(ROOT, 'supabase/migrations/V8__fix_search_path_remaining_4.sql'),
                         'V8__fix_search_path_remaining_4.sql');
await postCheck();
console.log('\n═══ PATCH V8 TERMINÉ ═══════════════════════════════════════');
