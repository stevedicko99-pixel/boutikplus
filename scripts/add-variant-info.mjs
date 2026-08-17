// Ajouter la colonne variant_info (JSONB) à order_items
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
  // 1. Ajouter la colonne variant_info
  console.log('1) Ajout colonne variant_info JSONB à order_items...');
  const r1 = await mgmt(`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_info JSONB DEFAULT NULL;`);
  console.log('  ', r1.status, r1.ok ? '✅' : JSON.stringify(r1.data).slice(0, 300));

  // 2. Vérifier
  const r2 = await mgmt(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'variant_info';`);
  console.log('\n2) Vérification:', r2.data);

  // 3. Mettre à jour les politiques RLS pour order_items (si RLS activé)
  // L'admin et le vendeur doivent pouvoir lire variant_info
  const r3 = await mgmt(`SELECT policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items';`);
  console.log('\n3) Politiques RLS order_items:', r3.data);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
