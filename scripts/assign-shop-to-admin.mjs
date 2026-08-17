// Donner la boutique "Constance Bridge" à l'admin (ca0ca983-f224-49b9-9604-f773d652260c)
// + la passer en status active pour qu'elle s'affiche.
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

const ADMIN = 'ca0ca983-f224-49b9-9604-f773d652260c';

async function main() {
  const r1 = await mgmt(`SELECT id, name, owner_id, status FROM shops WHERE name ILIKE '%Constance Bridge%' OR name ILIKE '%Constant Bridge%';`);
  console.log('Boutique Constance Bridge:', r1.data);
  if (!r1.data.length) { console.error('introuvable'); process.exit(1); }
  const id = r1.data[0].id;
  console.log('owner_id actuel =', r1.data[0].owner_id, '→ PASSAGE À', ADMIN, ' + status = active');

  const r2 = await mgmt(`UPDATE shops SET owner_id = '${ADMIN}'::uuid, status = 'active'::shop_status, is_verified = true, verified_at = now() WHERE id = '${id}' RETURNING id, name, owner_id, status, is_verified;`);
  console.log('\nMAJ:', r2.status, JSON.stringify(r2.data));
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
