// Inspect: colonnes réelles de la table shops (base de données) vs ce que pense le code TS.
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

async function viaSQL() {
  const r = await mgmt(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'shops'
    ORDER BY ordinal_position;
  `);
  console.log('HTTP', r.status);
  if (!r.ok) { console.log('ERREUR:', JSON.stringify(r.data)); process.exit(1); }
  return r.data;
}

async function main() {
  const cols = await viaSQL();
  console.log('\n🗄️ Colonnes réelles table shops (Supabase):');
  console.log(cols.map(c => `  - ${c.column_name} :: ${c.data_type}  (null=${c.is_nullable}, default=${c.column_default ?? 'aucun'})`).join('\n'));

  // Ensuite lecture types.ts
  const typesPath = path.resolve(__dirname, '..', 'src', 'types.ts');
  const types = fs.readFileSync(typesPath, 'utf-8');
  const match = types.match(/interface\s+Shop\s*\{([\s\S]*?)\}/);
  if (!match) return;
  const fields = [...match[1].matchAll(/^\s*(\w+)\??:\s*([^;\n]+);?/gm)]
    .map(m => ({ name: m[1], type: m[2].trim() }));
  console.log('\n📝 Champs Shop dans types.ts (code app):');
  fields.forEach(f => console.log(`  - ${f.name}: ${f.type}`));

  // Différence
  const realCols = cols.map(c => c.column_name).sort();
  const codeCols = fields.map(f => f.name).sort();
  console.log('\n❌ Dans le code MAIS PAS en base:');
  codeCols.forEach(c => { if (!realCols.includes(c)) console.log('  -', c); });
  console.log('\n⚠️  En base MAIS PAS dans code:');
  realCols.forEach(c => { if (!codeCols.includes(c)) console.log('  -', c); });
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
